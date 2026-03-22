#!/usr/bin/env node

/**
 * Generates MDX summary pages for newly discovered repos.
 *
 * 1. Reads repos.json and finds entries where has_summary is false
 * 2. For each (up to MAX_PER_RUN), fetches README and metadata from GitHub
 * 3. Calls the Anthropic API to generate an MDX summary
 * 4. Writes the summary to src/app/trends/projects/{owner}-{repo}/page.mdx
 * 5. Updates repos.json to mark has_summary = true
 */

import { getRepo, getReadme } from './lib/github-api.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const REPOS_FILE = join(DATA_DIR, 'repos.json');
const PROJECTS_DIR = join(process.cwd(), 'src/app/trends/projects');
const TRENDS_FILE = join(DATA_DIR, 'computed/trends.json');
const MAX_PER_RUN = 5;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is required.');
  process.exit(1);
}

function loadJSON(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function saveJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Call the Anthropic Messages API to generate a summary.
 */
async function generateSummary(repoData, readme) {
  const readmeSnippet = readme
    ? readme.slice(0, 8000)  // Cap to avoid huge prompts
    : 'No README available.';

  const prompt = `You are writing a summary page for a developer documentation site called Agentic Playbook. The site uses MDX.

Given this GitHub repository's information, write an MDX page that covers:
1. What the project is (1-2 sentences)
2. What it does (key features as a bullet list)
3. How to install it
4. Basic usage example
5. Notable details (license, language, community size)

Rules:
- Write like a senior engineer explaining to a peer. No filler.
- Never use phrases like "hands-on", "production-grade", "dive deep", "let's get started", "comprehensive guide"
- Start with a GuideHeader component, then an h1 title
- Use <Callout> components for important notes (types: info, warning, tip, danger)
- Use code blocks with language tags
- Keep it concise — aim for 200-400 words of content

Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description'}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count || 'Unknown'}
Topics: ${(repoData.topics || []).join(', ') || 'None'}
URL: ${repoData.html_url}
License: ${repoData.license?.spdx_id || 'Unknown'}

README (first 8000 chars):
${readmeSnippet}

Output ONLY the MDX content. Start with the GuideHeader component like this:
<GuideHeader tool="${repoData.full_name.split('/')[1]}" difficulty="Beginner" lastTested="${new Date().toISOString().slice(0, 7)}" readTime="5 min" />`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0]?.text || '';
}

/**
 * Validate MDX output — basic checks to avoid broken pages.
 */
function validateMDX(content) {
  if (!content || content.length < 100) return false;
  if (!content.includes('#')) return false;  // Must have at least one heading
  return true;
}

async function main() {
  console.log('Analyzing new repos...');

  const reposIndex = loadJSON(REPOS_FILE);
  const needsSummary = Object.entries(reposIndex.repos)
    .filter(([, repo]) => !repo.has_summary)
    .slice(0, MAX_PER_RUN);

  if (needsSummary.length === 0) {
    console.log('No new repos to analyze.');
    return;
  }

  console.log(`Found ${needsSummary.length} repos needing summaries.`);

  let generated = 0;

  for (const [name, repoInfo] of needsSummary) {
    console.log(`Analyzing: ${name}...`);

    try {
      // Fetch fresh repo data and README
      const repoData = await getRepo(name);
      const readme = await getReadme(name);

      // Generate summary via Anthropic API
      const mdxContent = await generateSummary(repoData, readme);

      if (!validateMDX(mdxContent)) {
        console.error(`  Invalid MDX generated for ${name}, skipping.`);
        continue;
      }

      // Write the MDX file
      const slug = name.replace('/', '-');
      const pageDir = join(PROJECTS_DIR, slug);
      mkdirSync(pageDir, { recursive: true });
      writeFileSync(join(pageDir, 'page.mdx'), mdxContent);
      console.log(`  Written: src/app/trends/projects/${slug}/page.mdx`);

      // Mark as summarized
      reposIndex.repos[name].has_summary = true;
      generated++;

      // Small delay between API calls
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Error analyzing ${name}: ${err.message}`);
    }
  }

  // Update repos.json
  saveJSON(REPOS_FILE, reposIndex);

  // Update has_summary flags in trends.json too
  if (existsSync(TRENDS_FILE)) {
    const trends = loadJSON(TRENDS_FILE);
    for (const repo of trends.repos) {
      if (reposIndex.repos[repo.full_name]?.has_summary) {
        repo.has_summary = true;
      }
    }
    saveJSON(TRENDS_FILE, trends);
  }

  console.log(`Done. Generated ${generated} summaries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
