/**
 * MSPI i18n Validation Test Suite
 *
 * This script validates that:
 * 1. All data-i18n keys in HTML files exist in the English translation file
 * 2. All translation files have consistent keys with English
 * 3. No orphaned translations exist (keys in JSON but not used in HTML)
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

// Get nested value from object using dot notation
function getNestedValue(obj, key) {
  if (!obj || !key) return undefined;
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

// Get all keys from nested object with dot notation
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Extract all i18n keys from HTML files
function extractI18nKeysFromHTML(htmlContent, filename) {
  const keys = [];

  // Match data-i18n="key"
  const regex1 = /data-i18n="([^"]+)"/g;
  let match;
  while ((match = regex1.exec(htmlContent)) !== null) {
    keys.push({ key: match[1], attr: 'data-i18n', file: filename });
  }

  // Match data-i18n-html="key"
  const regex2 = /data-i18n-html="([^"]+)"/g;
  while ((match = regex2.exec(htmlContent)) !== null) {
    keys.push({ key: match[1], attr: 'data-i18n-html', file: filename });
  }

  // Match data-i18n-placeholder="key"
  const regex3 = /data-i18n-placeholder="([^"]+)"/g;
  while ((match = regex3.exec(htmlContent)) !== null) {
    keys.push({ key: match[1], attr: 'data-i18n-placeholder', file: filename });
  }

  // Match data-i18n-title="key"
  const regex4 = /data-i18n-title="([^"]+)"/g;
  while ((match = regex4.exec(htmlContent)) !== null) {
    keys.push({ key: match[1], attr: 'data-i18n-title', file: filename });
  }

  return keys;
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

// Get all translation files
function getTranslationFiles() {
  const translationsDir = path.join(ROOT_DIR, 'translations');
  if (!fs.existsSync(translationsDir)) {
    return [];
  }

  return fs.readdirSync(translationsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      lang: f.replace('.json', ''),
      path: path.join(translationsDir, f)
    }));
}

// Main test function
async function runTests() {
  console.log(`${colors.bold}MSPI Website i18n Validation${colors.reset}`);
  console.log(`Running from: ${ROOT_DIR}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  // Load English translations (source of truth)
  logHeader('Loading Translations');

  const enPath = path.join(ROOT_DIR, 'translations', 'en.json');
  if (!fs.existsSync(enPath)) {
    log('fail', `English translation file not found: ${enPath}`);
    process.exit(1);
  }

  const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enKeys = getAllKeys(enTranslations);
  log('pass', `Loaded English translations: ${enKeys.length} keys`);

  // Get all translation files
  const translationFiles = getTranslationFiles();
  log('info', `Found ${translationFiles.length} translation files`);

  // Extract i18n keys from all HTML files
  logHeader('Extracting i18n Keys from HTML');

  const htmlFiles = getHtmlFiles(ROOT_DIR);
  log('info', `Found ${htmlFiles.length} HTML files`);

  const allHtmlKeys = [];
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(ROOT_DIR, htmlFile);
    const keys = extractI18nKeysFromHTML(content, relativePath);
    allHtmlKeys.push(...keys);

    if (keys.length > 0) {
      log('info', `  ${relativePath}: ${keys.length} i18n references`);
    }
  }

  // Get unique keys
  const uniqueHtmlKeys = [...new Set(allHtmlKeys.map(k => k.key))];
  log('info', `Total unique i18n keys in HTML: ${uniqueHtmlKeys.length}`);

  // Test 1: Validate all HTML keys exist in English translations
  logHeader('Test 1: Missing Translation Keys');

  const missingKeys = [];
  const objectKeys = [];
  for (const keyInfo of allHtmlKeys) {
    const value = getNestedValue(enTranslations, keyInfo.key);
    if (value === undefined) {
      missingKeys.push(keyInfo);
    } else if (typeof value === 'object' && value !== null) {
      // Key exists but points to an object, not a string - will show as [object Object]
      objectKeys.push(keyInfo);
    }
  }

  if (missingKeys.length === 0) {
    log('pass', 'All i18n keys in HTML files have English translations');
  } else {
    log('fail', `${missingKeys.length} missing translation keys found:`);

    // Group by file for better readability
    const byFile = {};
    for (const key of missingKeys) {
      if (!byFile[key.file]) byFile[key.file] = [];
      byFile[key.file].push(key.key);
    }

    for (const [file, keys] of Object.entries(byFile)) {
      console.log(`\n  ${colors.yellow}${file}:${colors.reset}`);
      const uniqueKeys = [...new Set(keys)];
      for (const key of uniqueKeys) {
        console.log(`    - ${key}`);
      }
    }

    totalErrors += missingKeys.length;
  }

  // Test 1b: Check for keys that resolve to objects (will display as [object Object])
  logHeader('Test 1b: Keys Resolving to Objects');

  if (objectKeys.length === 0) {
    log('pass', 'All translation values are strings (not objects)');
  } else {
    log('fail', `${objectKeys.length} keys resolve to objects instead of strings:`);

    const byFile = {};
    for (const key of objectKeys) {
      if (!byFile[key.file]) byFile[key.file] = [];
      byFile[key.file].push(key.key);
    }

    for (const [file, keys] of Object.entries(byFile)) {
      console.log(`\n  ${colors.yellow}${file}:${colors.reset}`);
      const uniqueKeys = [...new Set(keys)];
      for (const key of uniqueKeys) {
        console.log(`    - ${key} (try: ${key}.title or specific property)`);
      }
    }

    totalErrors += objectKeys.length;
  }

  // Test 2: Check translation file consistency
  logHeader('Test 2: Translation File Consistency');

  for (const { lang, path: filePath } of translationFiles) {
    if (lang === 'en') continue;

    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const langKeys = getAllKeys(translations);

    // Keys in English but missing in this language
    const missingInLang = enKeys.filter(k => !langKeys.includes(k));

    // Keys in this language but not in English (orphaned)
    const extraInLang = langKeys.filter(k => !enKeys.includes(k));

    if (missingInLang.length === 0 && extraInLang.length === 0) {
      log('pass', `${lang}.json: All keys present and consistent`);
    } else {
      if (missingInLang.length > 0) {
        log('warn', `${lang}.json: ${missingInLang.length} keys missing from English`);
        totalWarnings += missingInLang.length;
      }
      if (extraInLang.length > 0) {
        log('warn', `${lang}.json: ${extraInLang.length} extra keys not in English`);
      }
    }
  }

  // Test 3: Check for unused translations (keys in JSON but not in HTML)
  logHeader('Test 3: Unused Translation Keys');

  const usedKeys = new Set(uniqueHtmlKeys);
  const unusedKeys = enKeys.filter(k => !usedKeys.has(k));

  // Filter out meta keys and other special keys that aren't directly used
  const ignoredPrefixes = ['meta.'];
  const reallyUnused = unusedKeys.filter(k =>
    !ignoredPrefixes.some(prefix => k.startsWith(prefix))
  );

  if (reallyUnused.length < 20) {
    log('info', `${reallyUnused.length} translation keys exist but aren't directly used in HTML`);
    log('info', '(This is often OK - keys may be used dynamically or for array items)');
  } else {
    log('warn', `${reallyUnused.length} potentially unused translation keys`);
  }

  // Summary
  logHeader('Summary');

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(`${colors.green}${colors.bold}All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    if (totalErrors > 0) {
      console.log(`${colors.red}${colors.bold}${totalErrors} errors found${colors.reset}`);
    }
    if (totalWarnings > 0) {
      console.log(`${colors.yellow}${colors.bold}${totalWarnings} warnings${colors.reset}`);
    }

    if (totalErrors > 0) {
      console.log(`\n${colors.red}Tests failed!${colors.reset} Please fix the missing translation keys.`);
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
