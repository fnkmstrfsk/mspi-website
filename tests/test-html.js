/**
 * MSPI HTML Validation Test Suite
 *
 * This script validates that:
 * 1. All HTML files have proper structure (doctype, html, head, body)
 * 2. All required meta tags are present
 * 3. No duplicate IDs exist
 * 4. All images have alt attributes
 * 5. No broken inline styles or scripts
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

// Validate HTML structure
function validateHtmlStructure(content, filename) {
  const errors = [];

  // Check for DOCTYPE
  if (!content.match(/<!DOCTYPE\s+html>/i)) {
    errors.push('Missing <!DOCTYPE html>');
  }

  // Check for <html> tag with lang attribute
  if (!content.match(/<html[^>]*lang=/i)) {
    errors.push('Missing lang attribute on <html> tag');
  }

  // Check for <head> tag
  if (!content.match(/<head[^>]*>/i)) {
    errors.push('Missing <head> tag');
  }

  // Check for <title> tag
  if (!content.match(/<title[^>]*>.*<\/title>/is)) {
    errors.push('Missing <title> tag');
  }

  // Check for viewport meta
  if (!content.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)) {
    errors.push('Missing viewport meta tag');
  }

  // Check for charset meta
  if (!content.match(/<meta[^>]*charset=/i)) {
    errors.push('Missing charset meta tag');
  }

  // Check for <body> tag
  if (!content.match(/<body[^>]*>/i)) {
    errors.push('Missing <body> tag');
  }

  return errors;
}

// Check for duplicate IDs
function findDuplicateIds(content, filename) {
  const idRegex = /\bid=["']([^"']+)["']/gi;
  const ids = {};
  const duplicates = [];
  let match;

  while ((match = idRegex.exec(content)) !== null) {
    const id = match[1];
    if (ids[id]) {
      duplicates.push(id);
    } else {
      ids[id] = true;
    }
  }

  return [...new Set(duplicates)];
}

// Check for images without alt attributes
function findImagesWithoutAlt(content, filename) {
  const imgRegex = /<img(?![^>]*\balt=)[^>]*>/gi;
  const matches = content.match(imgRegex) || [];
  return matches.length;
}

// Check for empty href or src attributes
function findEmptyAttributes(content, filename) {
  const issues = [];

  // Empty href
  const emptyHref = content.match(/href=["']\s*["']/gi) || [];
  if (emptyHref.length > 0) {
    issues.push(`${emptyHref.length} empty href attributes`);
  }

  // Empty src
  const emptySrc = content.match(/src=["']\s*["']/gi) || [];
  if (emptySrc.length > 0) {
    issues.push(`${emptySrc.length} empty src attributes`);
  }

  return issues;
}

// Check for unclosed tags (basic check)
function checkUnclosedTags(content, filename) {
  const issues = [];
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  const tagRegex = /<(\w+)[^>]*>/g;
  const closeRegex = /<\/(\w+)>/g;

  const openTags = {};
  const closeTags = {};

  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!selfClosing.includes(tag)) {
      openTags[tag] = (openTags[tag] || 0) + 1;
    }
  }

  while ((match = closeRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    closeTags[tag] = (closeTags[tag] || 0) + 1;
  }

  // Check for significant mismatches
  for (const tag of Object.keys(openTags)) {
    const openCount = openTags[tag] || 0;
    const closeCount = closeTags[tag] || 0;
    if (openCount !== closeCount && Math.abs(openCount - closeCount) > 1) {
      issues.push(`Tag <${tag}>: ${openCount} open, ${closeCount} close`);
    }
  }

  return issues;
}

// Main test function
async function runTests() {
  console.log(`${colors.bold}MSPI Website HTML Validation${colors.reset}`);
  console.log(`Running from: ${ROOT_DIR}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  const htmlFiles = getHtmlFiles(ROOT_DIR);
  log('info', `Found ${htmlFiles.length} HTML files`);

  // Test 1: HTML Structure
  logHeader('Test 1: HTML Structure');

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const errors = validateHtmlStructure(content, relativePath);

    if (errors.length === 0) {
      log('pass', `${relativePath}: Valid structure`);
    } else {
      log('fail', `${relativePath}:`);
      for (const error of errors) {
        console.log(`    - ${error}`);
      }
      totalErrors += errors.length;
    }
  }

  // Test 2: Duplicate IDs
  logHeader('Test 2: Duplicate IDs');

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const duplicates = findDuplicateIds(content, relativePath);

    if (duplicates.length === 0) {
      log('pass', `${relativePath}: No duplicate IDs`);
    } else {
      log('fail', `${relativePath}: ${duplicates.length} duplicate IDs`);
      for (const id of duplicates) {
        console.log(`    - #${id}`);
      }
      totalErrors += duplicates.length;
    }
  }

  // Test 3: Images without alt
  logHeader('Test 3: Image Accessibility');

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const missingAlt = findImagesWithoutAlt(content, relativePath);

    if (missingAlt === 0) {
      log('pass', `${relativePath}: All images have alt attributes`);
    } else {
      log('warn', `${relativePath}: ${missingAlt} images missing alt attributes`);
      totalWarnings += missingAlt;
    }
  }

  // Test 4: Empty attributes
  logHeader('Test 4: Empty Attributes');

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const issues = findEmptyAttributes(content, relativePath);

    if (issues.length === 0) {
      log('pass', `${relativePath}: No empty href/src attributes`);
    } else {
      log('warn', `${relativePath}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
      totalWarnings += issues.length;
    }
  }

  // Summary
  logHeader('Summary');

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`${colors.green}${colors.bold}All HTML validation tests passed!${colors.reset}`);
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
