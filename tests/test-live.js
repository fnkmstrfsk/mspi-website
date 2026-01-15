/**
 * MSPI Live Site Validation Test
 *
 * This script validates the deployed site by:
 * 1. Checking that all HTML pages return 200 OK
 * 2. Verifying internal links work on the live site
 *
 * Run after deployment to catch routing issues that local tests miss.
 * Usage: node test-live.js [base-url]
 * Default: https://mspintelligence.ai
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Get base URL from command line or use default
const BASE_URL = process.argv[2] || 'https://mspintelligence.ai';

// ANSI colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(type, message) {
  const symbols = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}!${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`
  };
  console.log(`${symbols[type]} ${message}`);
}

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.blue}═══ ${title} ═══${colors.reset}\n`);
}

// Get all HTML files
function getHtmlFiles(dir) {
  const htmlFiles = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !['node_modules', '.git', 'tests', 'baml_client', 'playwright-report'].includes(item)) {
      htmlFiles.push(...getHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }

  return htmlFiles;
}

// Extract internal links from HTML
function extractInternalLinks(content) {
  const links = new Set();
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(content)) !== null) {
    const url = match[1];
    // Only internal links
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Remove anchor and query string for page check
      const cleanUrl = url.split('#')[0].split('?')[0];
      if (cleanUrl && cleanUrl !== '/') {
        links.add(cleanUrl);
      }
    }
  }

  return [...links];
}

// Check if URL returns 200
async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow'
    });
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return { url, status: 0, ok: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.bold}MSPI Live Site Validation${colors.reset}`);
  console.log(`Testing: ${BASE_URL}\n`);

  let totalErrors = 0;

  // Test 1: Check all HTML pages load
  logHeader('Test 1: Page Availability');

  const htmlFiles = getHtmlFiles(ROOT_DIR);
  const pageUrls = htmlFiles.map(f => {
    const relativePath = path.relative(ROOT_DIR, f);
    const urlPath = '/' + relativePath.replace('.html', '').replace('index', '');
    return urlPath === '/' ? '/' : urlPath.replace(/\/$/, '');
  });

  // Add root
  const uniqueUrls = [...new Set([...pageUrls, '/'])];

  log('info', `Checking ${uniqueUrls.length} pages...`);

  const pageResults = await Promise.all(
    uniqueUrls.map(urlPath => checkUrl(BASE_URL + urlPath))
  );

  const failedPages = pageResults.filter(r => !r.ok);

  if (failedPages.length === 0) {
    log('pass', 'All pages return 200 OK');
    for (const result of pageResults) {
      console.log(`    ${colors.green}✓${colors.reset} ${result.url} (${result.status})`);
    }
  } else {
    log('fail', `${failedPages.length} pages failed:`);
    for (const result of pageResults) {
      if (result.ok) {
        console.log(`    ${colors.green}✓${colors.reset} ${result.url} (${result.status})`);
      } else {
        console.log(`    ${colors.red}✗${colors.reset} ${result.url} (${result.status}${result.error ? ': ' + result.error : ''})`);
      }
    }
    totalErrors += failedPages.length;
  }

  // Test 2: Check all internal links
  logHeader('Test 2: Internal Links');

  const allInternalLinks = new Set();
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const links = extractInternalLinks(content);
    links.forEach(link => allInternalLinks.add(link));
  }

  log('info', `Checking ${allInternalLinks.size} unique internal links...`);

  const linkResults = await Promise.all(
    [...allInternalLinks].map(urlPath => checkUrl(BASE_URL + urlPath))
  );

  const failedLinks = linkResults.filter(r => !r.ok);

  if (failedLinks.length === 0) {
    log('pass', 'All internal links return 200 OK');
  } else {
    log('fail', `${failedLinks.length} internal links failed:`);
    for (const result of failedLinks) {
      console.log(`    ${colors.red}✗${colors.reset} ${result.url} (${result.status})`);
    }
    totalErrors += failedLinks.length;
  }

  // Summary
  logHeader('Summary');

  if (totalErrors === 0) {
    console.log(`${colors.green}${colors.bold}All live site tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}${totalErrors} errors found${colors.reset}`);
    console.log(`\n${colors.red}Live site validation failed!${colors.reset}`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
