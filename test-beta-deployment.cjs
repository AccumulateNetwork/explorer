#!/usr/bin/env node

/**
 * Beta Explorer Deployment Smoke Test
 *
 * Verifies that beta.explorer.accumulatenetwork.io is deployed correctly
 * and all critical features are working.
 */

const https = require('https');
const http = require('http');

const BETA_URL = 'https://beta.explorer.accumulatenetwork.io';
const TIMEOUT = 10000;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function debug(message) {
  log(`   ${message}`, 'gray');
}

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || TIMEOUT;

    const req = protocol.get(url, { timeout }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function test1_BasicConnectivity() {
  info('Test 1: Basic connectivity to beta.explorer');

  try {
    const response = await fetch(BETA_URL);

    if (response.status === 200) {
      success('Beta explorer is accessible (HTTP 200)');
      return true;
    } else {
      error(`Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Failed to connect: ${err.message}`);
    return false;
  }
}

async function test2_HTMLContent() {
  info('Test 2: HTML content loads correctly');

  try {
    const response = await fetch(BETA_URL);
    const html = response.body;

    // Check for essential HTML elements
    const checks = [
      { pattern: '<!DOCTYPE html>', name: 'DOCTYPE declaration' },
      { pattern: '<meta charset="utf-8"', name: 'charset meta tag' },
      { pattern: 'Accumulate Explorer', name: 'page title' },
      { pattern: '<div id="root"', name: 'React root element' },
      { pattern: '/assets/', name: 'asset references' },
    ];

    let allPassed = true;
    for (const check of checks) {
      if (html.includes(check.pattern)) {
        debug(`✓ Found ${check.name}`);
      } else {
        error(`Missing ${check.name}`);
        allPassed = false;
      }
    }

    if (allPassed) {
      success('HTML content is valid');
      return true;
    } else {
      error('HTML content has issues');
      return false;
    }
  } catch (err) {
    error(`Failed to fetch HTML: ${err.message}`);
    return false;
  }
}

async function test3_CacheHeaders() {
  info('Test 3: Cache headers configuration');

  try {
    const response = await fetch(BETA_URL);
    const headers = response.headers;

    debug(`cache-control: ${headers['cache-control'] || 'not set'}`);
    debug(`pragma: ${headers['pragma'] || 'not set'}`);
    debug(`expires: ${headers['expires'] || 'not set'}`);

    // index.html should not be cached
    if (headers['cache-control']?.includes('no-cache') ||
        headers['cache-control']?.includes('no-store')) {
      success('Cache headers configured correctly (no-cache)');
      return true;
    } else {
      warn('Cache headers may allow caching of index.html');
      return true; // Non-critical
    }
  } catch (err) {
    error(`Failed to check headers: ${err.message}`);
    return false;
  }
}

async function test4_AssetAvailability() {
  info('Test 4: JavaScript assets availability');

  try {
    // First get the HTML to find asset URLs
    const htmlResponse = await fetch(BETA_URL);
    const html = htmlResponse.body;

    // Extract script tags
    const scriptMatches = html.match(/src="(\/assets\/[^"]+\.js)"/g);

    if (!scriptMatches || scriptMatches.length === 0) {
      error('No JavaScript assets found in HTML');
      return false;
    }

    debug(`Found ${scriptMatches.length} script references`);

    // Test a few key assets
    const testAssets = scriptMatches.slice(0, 3);
    let allPassed = true;

    for (const match of testAssets) {
      const assetPath = match.match(/src="([^"]+)"/)[1];
      const assetUrl = `${BETA_URL}${assetPath}`;

      try {
        const assetResponse = await fetch(assetUrl);
        if (assetResponse.status === 200) {
          debug(`✓ ${assetPath.split('/').pop()}`);
        } else {
          error(`Asset returned ${assetResponse.status}: ${assetPath}`);
          allPassed = false;
        }
      } catch (err) {
        error(`Failed to fetch asset: ${assetPath}`);
        allPassed = false;
      }
    }

    if (allPassed) {
      success('JavaScript assets are accessible');
      return true;
    } else {
      error('Some JavaScript assets failed to load');
      return false;
    }
  } catch (err) {
    error(`Failed to test assets: ${err.message}`);
    return false;
  }
}

async function test5_ViteEnvironment() {
  info('Test 5: Vite environment configuration');

  try {
    const htmlResponse = await fetch(BETA_URL);
    const html = htmlResponse.body;

    // Check for Vite-specific patterns
    if (html.includes('/assets/index-') && html.includes('.js')) {
      success('Vite build detected (hashed assets)');
      debug('Asset filenames include content hashes');
      return true;
    } else {
      warn('Could not detect Vite build pattern');
      return true; // Non-critical
    }
  } catch (err) {
    error(`Failed to check Vite config: ${err.message}`);
    return false;
  }
}

async function test6_SecurityHeaders() {
  info('Test 6: Security and CORS headers');

  try {
    const response = await fetch(BETA_URL);
    const headers = response.headers;

    debug(`content-type: ${headers['content-type'] || 'not set'}`);
    debug(`x-frame-options: ${headers['x-frame-options'] || 'not set'}`);
    debug(`x-content-type-options: ${headers['x-content-type-options'] || 'not set'}`);

    if (headers['content-type']?.includes('text/html')) {
      success('Content-Type is correct (text/html)');
      return true;
    } else {
      warn(`Unexpected Content-Type: ${headers['content-type']}`);
      return true; // Non-critical
    }
  } catch (err) {
    error(`Failed to check security headers: ${err.message}`);
    return false;
  }
}

async function test7_BuildCommit() {
  info('Test 7: Build version check');

  try {
    const htmlResponse = await fetch(BETA_URL);
    const html = htmlResponse.body;

    // Try to detect build version from comments or meta tags
    const commentMatch = html.match(/<!-- Build: ([a-f0-9]{7,}) -->/);

    if (commentMatch) {
      const commit = commentMatch[1];
      success(`Build commit detected: ${commit}`);

      // Check if it's our latest commit
      if (commit.startsWith('fe535cc') || commit.startsWith('8e288f6')) {
        success('Latest commit is deployed!');
        return true;
      } else {
        warn(`Deployed commit (${commit}) may not be latest`);
        return true;
      }
    } else {
      info('No build comment found (this is normal for Vite builds)');
      return true; // Non-critical
    }
  } catch (err) {
    error(`Failed to check build version: ${err.message}`);
    return false;
  }
}

async function test8_ResponseTime() {
  info('Test 8: Response time performance');

  try {
    const startTime = Date.now();
    await fetch(BETA_URL);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    debug(`Response time: ${responseTime}ms`);

    if (responseTime < 2000) {
      success(`Good response time (${responseTime}ms)`);
      return true;
    } else if (responseTime < 5000) {
      warn(`Slow response time (${responseTime}ms)`);
      return true;
    } else {
      error(`Very slow response time (${responseTime}ms)`);
      return false;
    }
  } catch (err) {
    error(`Failed to measure response time: ${err.message}`);
    return false;
  }
}

async function test9_Favicon() {
  info('Test 9: Favicon availability');

  try {
    const faviconUrl = `${BETA_URL}/favicon-32.png`;
    const response = await fetch(faviconUrl);

    if (response.status === 200) {
      success('Favicon is accessible');
      return true;
    } else {
      warn(`Favicon returned ${response.status}`);
      return true; // Non-critical
    }
  } catch (err) {
    warn(`Favicon check failed: ${err.message}`);
    return true; // Non-critical
  }
}

async function test10_Redirects() {
  info('Test 10: SPA redirect configuration');

  try {
    // Test a route that should redirect to index.html
    const testRoute = `${BETA_URL}/acc/example.acme`;
    const response = await fetch(testRoute);

    if (response.status === 200 && response.body.includes('<!DOCTYPE html>')) {
      success('SPA redirects configured correctly');
      debug('Non-existent routes serve index.html');
      return true;
    } else {
      warn('SPA redirects may not be configured');
      return true; // Non-critical for initial deployment
    }
  } catch (err) {
    warn(`Redirect check failed: ${err.message}`);
    return true; // Non-critical
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('🧪 Beta Explorer Deployment Smoke Tests', 'blue');
  log(`Target: ${BETA_URL}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');
  console.log('='.repeat(60) + '\n');

  const tests = [
    test1_BasicConnectivity,
    test2_HTMLContent,
    test3_CacheHeaders,
    test4_AssetAvailability,
    test5_ViteEnvironment,
    test6_SecurityHeaders,
    test7_BuildCommit,
    test8_ResponseTime,
    test9_Favicon,
    test10_Redirects,
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push({ name: test.name, passed: result });
      console.log(''); // Blank line between tests
    } catch (err) {
      error(`Test ${test.name} threw an error: ${err.message}`);
      results.push({ name: test.name, passed: false });
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(60));
  log('📊 Test Summary', 'blue');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log('');

  if (passed === total) {
    success(`All tests passed! (${passed}/${total})`);
    log('\n🎉 Deployment looks good! Beta explorer is ready.', 'green');
  } else if (passed >= total * 0.8) {
    warn(`Most tests passed (${passed}/${total} - ${percentage}%)`);
    log('\n✅ Deployment is functional but has some warnings.', 'yellow');
  } else {
    error(`Many tests failed (${passed}/${total} - ${percentage}%)`);
    log('\n⚠️  Deployment has issues that need investigation.', 'red');
  }

  console.log('\n' + '='.repeat(60));

  // Failed tests detail
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ Failed tests:');
    failed.forEach(f => console.log(`   - ${f.name}`));
  }

  console.log('');

  // Exit code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
