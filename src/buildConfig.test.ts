import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Files that Node executes as part of a build, with full process privileges,
// before anyone looks at a page. On 2026-08-14 the GitHub mirror's copy of
// vite.config.js carried a 33,231-character obfuscated payload appended as a
// single line: it read a second stage from Ethereum RPCs and spawned a
// detached node process, so it survived the build that started it. Any
// `npm start`, `npm run build`, or `npm run preview` from that checkout ran it.
//
// Nothing in the toolchain objected. tsc does not read these, eslint does not
// lint them, and the diff was buried in a commit that looked like a release.
// These assertions are cheap and run in the normal suite, so a poisoned build
// config fails in front of whoever pulled it.

const ROOT = join(__dirname, '..');

const BUILD_FILES = [
  'vite.config.js',
  'vitest.config.js',
  'eslint.config.js',
  'postcss.config.js',
  'tailwind.config.js',
];

/** Present in the repo — the list above is aspirational, not all exist. */
function readIfPresent(name: string): string | null {
  try {
    return readFileSync(join(ROOT, name), 'utf8');
  } catch {
    return null;
  }
}

const present = BUILD_FILES.map((f) => [f, readIfPresent(f)] as const).filter(
  (e): e is readonly [string, string] => e[1] !== null,
);

describe('build configuration is not carrying a payload', () => {
  it('has build files to check', () => {
    // Guards the guard: a rename must not turn this suite into a no-op.
    expect(present.map(([f]) => f)).toContain('vite.config.js');
  });

  it.each(present)('%s has no absurdly long line', (_name, text) => {
    // The payload was one 33k-character line. Real config here is hand-written
    // and wraps; the longest legitimate line is well under 200 characters.
    const longest = text
      .split('\n')
      .reduce((max, l) => Math.max(max, l.length), 0);
    expect(longest).toBeLessThan(500);
  });

  it.each(present)('%s does not spawn processes', (_name, text) => {
    // A bundler config has no business starting child processes. The payload
    // used spawn(..., {detached: true}).unref() to outlive the build.
    for (const marker of [
      'child_process',
      'execSync',
      'spawnSync',
      'detached',
      'unref',
    ]) {
      expect(text).not.toContain(marker);
    }
  });

  it.each(present)('%s is not obfuscated', (_name, text) => {
    // Hex-identifier obfuscators (`_0x4f2a`) are not something anyone writes
    // by hand, and were the giveaway here.
    expect(text).not.toMatch(/_0x[0-9a-f]{4,}/i);
    // `global.x = require` re-exposes require inside a module scope.
    expect(text).not.toMatch(
      /global\s*(\.\w+|\[\s*['"]\w+['"]\s*\])\s*=\s*require/,
    );
  });
});

describe('secrets stay ignored', () => {
  // The same commit quietly removed .env.local from .gitignore, so the next
  // `git add -A` on any developer machine would have committed local secrets.
  const gitignore = readIfPresent('.gitignore') ?? '';

  it.each(['.env.local', '.env'])('%s is git-ignored', (entry) => {
    const lines = gitignore.split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain(entry);
  });
});
