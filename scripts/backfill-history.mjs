#!/usr/bin/env node

/**
 * Backfills historical star data using the GitHub Stargazers API.
 *
 * Strategy:
 * - For repos with ≤40k stars: use binary search on stargazer pages
 *   (the API returns starred_at timestamps, capped at 400 pages / 40k stars)
 * - For repos with >40k stars: sample the last 40k stargazers to measure
 *   recent velocity, then extrapolate backward for earlier dates
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/backfill-history.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('GITHUB_TOKEN required');
  process.exit(1);
}

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots');
const TRENDS_FILE = join(DATA_DIR, 'computed/trends.json');

const API_STAR_CAP = 40000; // GitHub API limit

const headers = {
  Accept: 'application/vnd.github.star+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

const defaultHeaders = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function getStarCount(fullName) {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers: defaultHeaders });
  if (!res.ok) return null;
  const data = await res.json();
  return data.stargazers_count;
}

async function getStargazersPage(fullName, page, perPage = 100) {
  const url = `https://api.github.com/repos/${fullName}/stargazers?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { items: [], lastPage: 1 };
  const items = await res.json();
  const link = res.headers.get('link') || '';
  const lastMatch = link.match(/page=(\d+)>; rel="last"/);
  const lastPage = lastMatch ? parseInt(lastMatch[1]) : page;
  return { items, lastPage };
}

/**
 * For small repos (≤40k stars): binary search for exact star count at cutoff.
 */
async function starsAtDateExact(fullName, totalStars, cutoffDate) {
  const perPage = 100;
  const totalPages = Math.ceil(totalStars / perPage);
  if (totalPages === 0) return 0;

  let low = 1;
  let high = totalPages;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const { items } = await getStargazersPage(fullName, mid, perPage);
    if (items.length === 0) { high = mid; continue; }
    const firstDate = new Date(items[0].starred_at);
    if (firstDate < cutoffDate) {
      low = mid + 1;
    } else {
      high = mid;
    }
    await new Promise(r => setTimeout(r, 80));
  }

  const { items } = await getStargazersPage(fullName, low, perPage);
  let countOnPage = 0;
  for (const item of items) {
    if (new Date(item.starred_at) < cutoffDate) countOnPage++;
  }
  return (low - 1) * perPage + countOnPage;
}

/**
 * For large repos (>40k stars): sample recent stargazers to measure velocity.
 *
 * We can only access the last 40k stargazers. So we:
 * 1. Find the date of stargazer #1 (page 1) — the oldest accessible
 * 2. Find the date of the last stargazer (last page) — most recent
 * 3. This gives us the rate over the accessible window
 * 4. For dates within that window, binary search works
 * 5. For dates before the window, extrapolate using the measured rate
 */
async function starsAtDateEstimated(fullName, totalStars, cutoffDate) {
  const perPage = 100;

  // Get the first page (oldest accessible stargazer)
  const { items: firstItems, lastPage } = await getStargazersPage(fullName, 1, perPage);
  if (firstItems.length === 0) return totalStars;

  const oldestAccessibleDate = new Date(firstItems[0].starred_at);
  const accessibleStars = lastPage * perPage;
  const baseStars = totalStars - accessibleStars; // stars we can't see (before the window)

  // If cutoff is before the accessible window, we need to estimate
  if (cutoffDate < oldestAccessibleDate) {
    // Get repo creation date for better extrapolation
    const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, { headers: defaultHeaders });
    const repoData = await repoRes.json();
    const createdAt = new Date(repoData.created_at);

    // Calculate rate in the accessible window
    const now = new Date();
    const accessibleDays = (now - oldestAccessibleDate) / (1000 * 60 * 60 * 24);
    const ratePerDay = accessibleStars / accessibleDays;

    // For the pre-window period, use a lower rate (growth typically accelerates)
    // Use 60% of recent rate as a conservative estimate for older periods
    const daysSinceCutoff = (now - cutoffDate) / (1000 * 60 * 60 * 24);
    const daysInPreWindow = (oldestAccessibleDate - cutoffDate) / (1000 * 60 * 60 * 24);

    if (cutoffDate < createdAt) return 0;

    // Stars gained between cutoff and oldest accessible = estimated
    const estimatedPreWindowGain = Math.round(daysInPreWindow * ratePerDay * 0.6);
    const starsAtCutoff = Math.max(0, baseStars - estimatedPreWindowGain);
    return starsAtCutoff;
  }

  // Cutoff is within the accessible window — binary search
  let low = 1;
  let high = lastPage;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const { items } = await getStargazersPage(fullName, mid, perPage);
    if (items.length === 0) { high = mid; continue; }
    const firstDate = new Date(items[0].starred_at);
    if (firstDate < cutoffDate) {
      low = mid + 1;
    } else {
      high = mid;
    }
    await new Promise(r => setTimeout(r, 80));
  }

  const { items } = await getStargazersPage(fullName, low, perPage);
  let countOnPage = 0;
  for (const item of items) {
    if (new Date(item.starred_at) < cutoffDate) countOnPage++;
  }

  return baseStars + (low - 1) * perPage + countOnPage;
}

/**
 * Route to the right strategy based on repo size.
 */
async function starsAtDate(fullName, totalStars, cutoffDate) {
  if (totalStars <= API_STAR_CAP) {
    return starsAtDateExact(fullName, totalStars, cutoffDate);
  }
  return starsAtDateEstimated(fullName, totalStars, cutoffDate);
}

function fmt(date) {
  return date.toISOString().split('T')[0];
}

function saveSnapshot(dateStr, data) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  writeFileSync(
    join(SNAPSHOTS_DIR, `${dateStr}.json`),
    JSON.stringify({ date: dateStr, data }, null, 2) + '\n'
  );
  console.log(`  Saved snapshot: ${dateStr}.json (${Object.keys(data).length} repos)`);
}

async function main() {
  const trends = JSON.parse(readFileSync(TRENDS_FILE, 'utf-8'));
  const repos = trends.repos;

  if (repos.length === 0) {
    console.error('No repos in trends.json');
    process.exit(1);
  }

  const rlRes = await fetch('https://api.github.com/rate_limit', { headers: defaultHeaders });
  const rl = await rlRes.json();
  console.log(`Rate limit: ${rl.rate.remaining}/${rl.rate.limit}`);

  if (rl.rate.remaining < 500) {
    console.error('Not enough rate limit. Need at least 500 requests.');
    process.exit(1);
  }

  const now = new Date();
  const targets = [
    { label: '1 day ago', date: new Date(now - 1 * 24 * 60 * 60 * 1000) },
    { label: '7 days ago', date: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    { label: '30 days ago', date: new Date(now - 30 * 24 * 60 * 60 * 1000) },
    { label: '90 days ago', date: new Date(now - 90 * 24 * 60 * 60 * 1000) },
    { label: '180 days ago', date: new Date(now - 180 * 24 * 60 * 60 * 1000) },
    { label: '365 days ago', date: new Date(now - 365 * 24 * 60 * 60 * 1000) },
  ];

  // Remove existing snapshots for these dates so we regenerate them
  const activeDates = targets;

  const maxRepos = Math.min(repos.length, 25);
  console.log(`\nBackfilling ${activeDates.length} dates for top ${maxRepos} repos...\n`);

  const snapshots = {};
  for (const t of activeDates) {
    snapshots[fmt(t.date)] = {};
  }

  for (let i = 0; i < maxRepos; i++) {
    const repo = repos[i];
    const totalStars = await getStarCount(repo.full_name);
    if (!totalStars) {
      console.log(`[${i + 1}/${maxRepos}] ${repo.full_name} — skipped (couldn't fetch)`);
      continue;
    }

    const method = totalStars > API_STAR_CAP ? 'estimated' : 'exact';
    console.log(`[${i + 1}/${maxRepos}] ${repo.full_name} (${totalStars} stars, ${method})`);

    for (const t of activeDates) {
      try {
        const starsAtCutoff = await starsAtDate(repo.full_name, totalStars, t.date);
        const delta = totalStars - starsAtCutoff;
        snapshots[fmt(t.date)][repo.full_name] = { stars: starsAtCutoff, forks: 0 };
        console.log(`  ${t.label}: ${starsAtCutoff} stars (Δ +${delta})`);
      } catch (err) {
        console.error(`  Error for ${t.label}: ${err.message}`);
      }
    }

    if (i % 5 === 4) {
      const checkRl = await fetch('https://api.github.com/rate_limit', { headers: defaultHeaders });
      const checkData = await checkRl.json();
      console.log(`  Rate limit remaining: ${checkData.rate.remaining}`);
      if (checkData.rate.remaining < 100) {
        console.error('  Rate limit low, stopping early.');
        break;
      }
    }
  }

  for (const [dateStr, data] of Object.entries(snapshots)) {
    if (Object.keys(data).length > 0) {
      saveSnapshot(dateStr, data);
    }
  }

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
