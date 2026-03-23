#!/usr/bin/env node

/**
 * Backfills daily historical star data from Jan 1 2026 to today using GH Archive + BigQuery.
 *
 * Why BigQuery instead of GitHub Stargazers API:
 * - Exact star counts for ANY repo, regardless of size (no 40k cap)
 * - One query per day covers ALL repos (vs. per-repo API calls)
 * - ~82 days × ~3 GB/query = ~246 GB, well within BigQuery's 1 TB/month free tier
 *
 * Requires: GCP_SERVICE_ACCOUNT_KEY env var (JSON service account key)
 * Usage: GCP_SERVICE_ACCOUNT_KEY='...' node scripts/backfill-history.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { BigQuery } from '@google-cloud/bigquery';

const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
if (!keyJson) {
  console.error('GCP_SERVICE_ACCOUNT_KEY env var required (JSON string)');
  process.exit(1);
}

const credentials = JSON.parse(keyJson);
const bigquery = new BigQuery({ projectId: credentials.project_id, credentials });

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots');
const TRENDS_FILE = join(DATA_DIR, 'computed/trends.json');

function fmt(date) {
  return date.toISOString().split('T')[0];
}

function fmtCompact(date) {
  return fmt(date).replace(/-/g, '');
}

/**
 * Query GH Archive for star counts on a specific date.
 * Returns { "owner/repo": starCount } for all repos that got stars that day.
 */
async function getStarsForDate(date) {
  const dateStr = fmtCompact(date);
  const query = `
    SELECT repo.name, COUNT(DISTINCT actor.id) as stars
    FROM \`githubarchive.day.${dateStr}\`
    WHERE type = 'WatchEvent'
    GROUP BY repo.name
    HAVING stars > 0
  `;

  const [rows] = await bigquery.query({ query });
  const result = {};
  for (const row of rows) {
    result[row.name] = row.stars;
  }
  return result;
}

async function main() {
  const trends = JSON.parse(readFileSync(TRENDS_FILE, 'utf-8'));
  const repos = trends.repos;

  if (repos.length === 0) {
    console.error('No repos in trends.json');
    process.exit(1);
  }

  // Build set of tracked repo names (lowercase for matching)
  const trackedRepos = new Map();
  for (const repo of repos) {
    trackedRepos.set(repo.full_name.toLowerCase(), {
      full_name: repo.full_name,
      stars: repo.stars,
    });
  }

  const now = new Date();
  const startDate = new Date('2026-01-01');

  // Generate all dates from start to yesterday
  const allDates = [];
  for (let d = new Date(startDate); d < now; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d));
  }

  // Find dates that already have good snapshots
  const missingDates = allDates.filter(d => {
    const file = join(SNAPSHOTS_DIR, `${fmt(d)}.json`);
    if (!existsSync(file)) return true;
    try {
      const snap = JSON.parse(readFileSync(file, 'utf-8'));
      return Object.keys(snap.data || {}).length === 0;
    } catch { return true; }
  });

  console.log(`Tracked repos: ${trackedRepos.size}`);
  console.log(`Total dates: ${allDates.length} (${fmt(startDate)} → ${fmt(allDates[allDates.length - 1])})`);
  console.log(`Missing dates: ${missingDates.length} (${allDates.length - missingDates.length} already done)\n`);

  if (missingDates.length === 0) {
    console.log('All dates already have snapshots. Nothing to do.');
    return;
  }

  // Step 1: Query daily star gains for ALL dates (need all for cumulative calc)
  console.log('Querying daily star gains from GH Archive...\n');

  const dailyGains = {}; // { "YYYY-MM-DD": { "owner/repo": count } }
  const sortedDates = allDates.map(d => fmt(d)).sort();

  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];
    const dateStr = fmt(date);

    // Check cache from previous run
    const cacheFile = join(SNAPSHOTS_DIR, `_daily_${dateStr}.json`);
    if (existsSync(cacheFile)) {
      dailyGains[dateStr] = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      console.log(`  ${dateStr}: cached (${Object.keys(dailyGains[dateStr]).length} tracked repos)`);
      continue;
    }

    process.stdout.write(`  ${dateStr}: querying BigQuery... `);
    try {
      const allStars = await getStarsForDate(date);

      // Filter to only tracked repos
      const filtered = {};
      for (const [name, count] of Object.entries(allStars)) {
        const tracked = trackedRepos.get(name.toLowerCase());
        if (tracked) {
          filtered[tracked.full_name] = count;
        }
      }

      dailyGains[dateStr] = filtered;

      // Cache so re-runs don't re-query BigQuery
      mkdirSync(SNAPSHOTS_DIR, { recursive: true });
      writeFileSync(cacheFile, JSON.stringify(filtered));

      console.log(`${Object.keys(filtered).length} tracked repos (${Object.keys(allStars).length} total)`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      dailyGains[dateStr] = {};
    }
  }

  // Step 2: Build cumulative snapshots
  // GH Archive gives "stars gained per day". We need "total stars at date".
  // Method: today_total - sum(gains from date+1 to today) = stars at end of date
  console.log('\nBuilding cumulative snapshots...\n');

  for (const dateStr of sortedDates) {
    // Skip existing good snapshots
    const file = join(SNAPSHOTS_DIR, `${dateStr}.json`);
    if (existsSync(file)) {
      try {
        const snap = JSON.parse(readFileSync(file, 'utf-8'));
        if (Object.keys(snap.data || {}).length > 0) continue;
      } catch { /* rebuild */ }
    }

    const dateIdx = sortedDates.indexOf(dateStr);
    const data = {};

    for (const [, repo] of trackedRepos) {
      // Sum gains from day after this date until the last date we have
      let gainsAfter = 0;
      for (let j = dateIdx + 1; j < sortedDates.length; j++) {
        const dayGains = dailyGains[sortedDates[j]] || {};
        gainsAfter += dayGains[repo.full_name] || 0;
      }

      const starsAtDate = Math.max(0, repo.stars - gainsAfter);
      data[repo.full_name] = { stars: starsAtDate, forks: 0 };
    }

    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({ date: dateStr, data }, null, 2) + '\n'
    );
    console.log(`  Saved ${dateStr}.json (${Object.keys(data).length} repos)`);
  }

  // Step 3: Show sample results
  console.log('\nSample results:');
  const sampleDates = [sortedDates[0], sortedDates[Math.floor(sortedDates.length / 2)], sortedDates[sortedDates.length - 1]];
  const sampleRepos = [...trackedRepos.values()].slice(0, 3);

  for (const repo of sampleRepos) {
    console.log(`\n  ${repo.full_name} (current: ${repo.stars})`);
    for (const dateStr of sampleDates) {
      const file = join(SNAPSHOTS_DIR, `${dateStr}.json`);
      if (existsSync(file)) {
        const snap = JSON.parse(readFileSync(file, 'utf-8'));
        const repoData = snap.data?.[repo.full_name];
        if (repoData) {
          console.log(`    ${dateStr}: ${repoData.stars} stars (Δ +${repo.stars - repoData.stars})`);
        }
      }
    }
  }

  // Step 4: Recompute trends
  console.log('\nRecomputing deltas with historical data...');
  execFileSync('node', ['scripts/fetch-trends.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('\nDone!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
