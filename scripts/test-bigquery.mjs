#!/usr/bin/env node

/**
 * Quick test: can we query GH Archive via BigQuery?
 *
 * Setup: GCP_SERVICE_ACCOUNT_KEY env var must contain the JSON key.
 * Usage: GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' node scripts/test-bigquery.mjs
 */

import { GoogleAuth } from 'google-auth-library';
import { BigQuery } from '@google-cloud/bigquery';

// Parse credentials from env
const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
if (!keyJson) {
  console.error('GCP_SERVICE_ACCOUNT_KEY env var required (JSON string)');
  process.exit(1);
}

const credentials = JSON.parse(keyJson);

const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials,
});

// Test: top 10 starred repos on Jan 1, 2026
const query = `
  SELECT repo.name, COUNT(DISTINCT actor.id) as stars
  FROM \`githubarchive.day.20260101\`
  WHERE type = 'WatchEvent'
  GROUP BY repo.name
  ORDER BY stars DESC
  LIMIT 10
`;

console.log('Running test query: top 10 starred repos on Jan 1, 2026...\n');

const [rows] = await bigquery.query({ query });

console.log('Results:');
for (const row of rows) {
  console.log(`  ${row.name}: +${row.stars} stars`);
}

console.log(`\nSuccess! Got ${rows.length} rows.`);
console.log('BigQuery connection works. Ready to rewrite backfill.');
