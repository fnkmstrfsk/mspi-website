/**
 * MSPI Website Test Runner
 *
 * Runs all test suites and reports combined results
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const tests = [
  { name: 'i18n Validation', file: 'test-i18n.js' },
  { name: 'HTML Validation', file: 'test-html.js' },
  { name: 'Link Validation', file: 'test-links.js' }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const testPath = path.join(__dirname, test.file);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      resolve({ ...test, exitCode: code });
    });

    child.on('error', (err) => {
      console.error(`Failed to run ${test.name}:`, err);
      resolve({ ...test, exitCode: 1 });
    });
  });
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║       MSPI Website Full Test Suite                 ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  const results = [];

  for (const test of tests) {
    console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}Running: ${test.name}${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const result = await runTest(test);
    results.push(result);
  }

  // Final Summary
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║                  FINAL SUMMARY                     ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  let hasFailures = false;

  for (const result of results) {
    const status = result.exitCode === 0
      ? `${colors.green}✓ PASSED${colors.reset}`
      : `${colors.red}✗ FAILED${colors.reset}`;

    console.log(`  ${status}  ${result.name}`);

    if (result.exitCode !== 0) {
      hasFailures = true;
    }
  }

  console.log('');

  if (hasFailures) {
    console.log(`${colors.red}${colors.bold}Some tests failed!${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}All tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
