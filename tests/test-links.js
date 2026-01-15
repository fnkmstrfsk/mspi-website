/**
 * MSPI Link Validation Test Suite
 *
 * This script validates that:
 * 1. All internal links point to existing files
 * 2. All anchor links (#) point to existing IDs
 * 3. External links are properly formatted
 * 4. No javascript: or data: URLs in unexpected places
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

// Get all HTML files in the project
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

// Extract all links from HTML content
function extractLinks(content, filename) {
  const links = [];

  // Match href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    links.push({ url: match[1], type: 'href', file: filename });
  }

  // Match src attributes
  const srcRegex = /src=["']([^"']+)["']/gi;
  while ((match = srcRegex.exec(content)) !== null) {
    links.push({ url: match[1], type: 'src', file: filename });
  }

  return links;
}

// Extract all IDs from HTML content
function extractIds(content) {
  const ids = new Set();
  const idRegex = /\bid=["']([^"']+)["']/gi;
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

// Check if internal file exists
function checkInternalLink(url, fromFile) {
  // Skip external links, anchors-only, mailto, tel, javascript
  if (url.startsWith('http://') || url.startsWith('https://') ||
      url.startsWith('mailto:') || url.startsWith('tel:') ||
      url.startsWith('javascript:') || url.startsWith('data:') ||
      url.startsWith('#') || url === '') {
    return null;
  }

  // Handle root path - serves index.html
  if (url === '/') {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return null;
    }
    return { url, targetPath: indexPath, exists: false };
  }

  // Handle absolute paths starting with /
  let targetPath;
  if (url.startsWith('/')) {
    // Remove anchor and query string
    const cleanUrl = url.split('#')[0].split('?')[0];
    targetPath = path.join(ROOT_DIR, cleanUrl);
  } else {
    // Relative path
    const fromDir = path.dirname(fromFile);
    const cleanUrl = url.split('#')[0].split('?')[0];
    targetPath = path.resolve(fromDir, cleanUrl);
  }

  // Add .html extension if no extension
  if (!path.extname(targetPath)) {
    targetPath += '.html';
  }

  if (!fs.existsSync(targetPath)) {
    return { url, targetPath, exists: false };
  }

  return null;
}

// Check anchor links
function checkAnchorLink(url, content, allIds) {
  if (!url.includes('#')) return null;

  const anchor = url.split('#')[1];
  if (!anchor) return null;

  // Check if anchor exists in the target page
  // For simplicity, we check against current page or assume external anchors are valid
  if (url.startsWith('#') || url.startsWith('/#')) {
    // Same page anchor - check current content
    if (!allIds.has(anchor)) {
      return { url, anchor, exists: false };
    }
  }

  return null;
}

// Main test function
async function runTests() {
  console.log(`${colors.bold}MSPI Website Link Validation${colors.reset}`);
  console.log(`Running from: ${ROOT_DIR}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  const htmlFiles = getHtmlFiles(ROOT_DIR);
  log('info', `Found ${htmlFiles.length} HTML files`);

  // Collect all IDs across all files
  const allIds = new Set();
  const fileIds = {};
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const ids = extractIds(content);
    fileIds[htmlFile] = ids;
    ids.forEach(id => allIds.add(id));
  }

  // Test 1: Internal Links
  logHeader('Test 1: Internal Links');

  const brokenLinks = [];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const links = extractLinks(content, relativePath);

    for (const link of links) {
      const result = checkInternalLink(link.url, htmlFile);
      if (result) {
        brokenLinks.push({ ...result, file: relativePath });
      }
    }
  }

  if (brokenLinks.length === 0) {
    log('pass', 'All internal links point to existing files');
  } else {
    log('fail', `${brokenLinks.length} broken internal links found:`);

    // Group by file
    const byFile = {};
    for (const link of brokenLinks) {
      if (!byFile[link.file]) byFile[link.file] = [];
      byFile[link.file].push(link.url);
    }

    for (const [file, urls] of Object.entries(byFile)) {
      console.log(`\n  ${colors.yellow}${file}:${colors.reset}`);
      const uniqueUrls = [...new Set(urls)];
      for (const url of uniqueUrls) {
        console.log(`    - ${url}`);
      }
    }

    totalErrors += brokenLinks.length;
  }

  // Test 2: Same-page Anchor Links
  logHeader('Test 2: Anchor Links');

  const brokenAnchors = [];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const links = extractLinks(content, relativePath);
    const pageIds = fileIds[htmlFile];

    for (const link of links) {
      if (link.url.startsWith('#')) {
        const anchor = link.url.substring(1);
        if (anchor && !pageIds.has(anchor)) {
          brokenAnchors.push({ url: link.url, file: relativePath, anchor });
        }
      }
    }
  }

  if (brokenAnchors.length === 0) {
    log('pass', 'All same-page anchor links are valid');
  } else {
    log('fail', `${brokenAnchors.length} broken anchor links found:`);

    const byFile = {};
    for (const link of brokenAnchors) {
      if (!byFile[link.file]) byFile[link.file] = [];
      byFile[link.file].push(link.url);
    }

    for (const [file, urls] of Object.entries(byFile)) {
      console.log(`\n  ${colors.yellow}${file}:${colors.reset}`);
      const uniqueUrls = [...new Set(urls)];
      for (const url of uniqueUrls) {
        console.log(`    - ${url}`);
      }
    }

    totalErrors += brokenAnchors.length;
  }

  // Test 3: External Links Format
  logHeader('Test 3: External Links');

  let externalCount = 0;
  const suspiciousLinks = [];

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const links = extractLinks(content, relativePath);

    for (const link of links) {
      if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
        externalCount++;

        // Check for suspicious patterns
        if (link.url.includes('example.com') || link.url.includes('localhost')) {
          suspiciousLinks.push({ url: link.url, file: relativePath });
        }
      }
    }
  }

  log('info', `Found ${externalCount} external links`);

  if (suspiciousLinks.length === 0) {
    log('pass', 'No suspicious external links (example.com, localhost)');
  } else {
    log('warn', `${suspiciousLinks.length} suspicious external links:`);
    for (const link of suspiciousLinks) {
      console.log(`    - ${link.file}: ${link.url}`);
    }
    totalWarnings += suspiciousLinks.length;
  }

  // Test 4: JavaScript/Data URLs
  logHeader('Test 4: JavaScript/Data URLs');

  const jsUrls = [];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);

    // Check for javascript: URLs in href (not onclick handlers)
    const jsHrefRegex = /href=["']javascript:[^"']*["']/gi;
    const matches = content.match(jsHrefRegex) || [];
    if (matches.length > 0) {
      jsUrls.push({ file: relativePath, count: matches.length, type: 'javascript:' });
    }
  }

  if (jsUrls.length === 0) {
    log('pass', 'No javascript: URLs in href attributes');
  } else {
    log('warn', `Found javascript: URLs in href attributes:`);
    for (const item of jsUrls) {
      console.log(`    - ${item.file}: ${item.count} occurrences`);
    }
    totalWarnings += jsUrls.length;
  }

  // Test 5: Problematic URL Patterns (underscores, special chars)
  // These can cause 404s on deployment platforms like Vercel even if files exist locally
  logHeader('Test 5: URL Compatibility');

  const problematicUrls = [];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const links = extractLinks(content, relativePath);

    for (const link of links) {
      // Skip external links, anchors, mailto, etc.
      if (link.url.startsWith('http://') || link.url.startsWith('https://') ||
          link.url.startsWith('mailto:') || link.url.startsWith('tel:') ||
          link.url.startsWith('#') || link.url === '' || link.url === '/') {
        continue;
      }

      // Check for underscores in the path (not query params or anchors)
      const pathPart = link.url.split('?')[0].split('#')[0];
      if (pathPart.includes('_')) {
        problematicUrls.push({
          url: link.url,
          file: relativePath,
          issue: 'underscore in URL path (use hyphens instead)'
        });
      }

      // Check for spaces or special characters
      if (/[%\s\[\]\{\}\|\\^<>]/.test(pathPart)) {
        problematicUrls.push({
          url: link.url,
          file: relativePath,
          issue: 'special characters in URL path'
        });
      }
    }
  }

  if (problematicUrls.length === 0) {
    log('pass', 'All URLs are deployment-compatible (no underscores or special chars)');
  } else {
    log('fail', `${problematicUrls.length} URLs may cause 404s on deployment:`);

    const byFile = {};
    for (const item of problematicUrls) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push({ url: item.url, issue: item.issue });
    }

    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\n  ${colors.yellow}${file}:${colors.reset}`);
      const seen = new Set();
      for (const item of items) {
        if (!seen.has(item.url)) {
          console.log(`    - ${item.url} (${item.issue})`);
          seen.add(item.url);
        }
      }
    }

    totalErrors += problematicUrls.length;
  }

  // Summary
  logHeader('Summary');

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`${colors.green}${colors.bold}All link validation tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    if (totalErrors > 0) {
      console.log(`${colors.red}${colors.bold}${totalErrors} errors found${colors.reset}`);
    }
    if (totalWarnings > 0) {
      console.log(`${colors.yellow}${colors.bold}${totalWarnings} warnings${colors.reset}`);
    }

    if (totalErrors > 0) {
      console.log(`\n${colors.red}Tests failed!${colors.reset}`);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
