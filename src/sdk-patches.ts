// Runtime patches for accumulate.js SDK to handle unknown executor versions
import { ExecutorVersion } from 'accumulate.js/lib/core';

// Store original functions
const originalByName = ExecutorVersion.byName;
const originalGetName = ExecutorVersion.getName;

// Patch byName to handle unknown versions gracefully
ExecutorVersion.byName = function (name: string): number {
  try {
    return originalByName(name);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unknown ExecutorVersion')
    ) {
      console.warn(`Unknown ExecutorVersion '${name}', treating as -1`);
      return -1;
    }
    throw error;
  }
};

// Patch fromObject too — it is what the decoder calls, and it reaches the
// SDK's module-local byName, not the property replaced above. Patching byName
// alone never took effect, so Kermit's 'v2-kourou' broke every network-status
// call (#87).
ExecutorVersion.fromObject = function (obj: number | string): number {
  return typeof obj === 'number' ? obj : ExecutorVersion.byName(obj);
};

// Patch getName to handle unknown versions (including -1)
(ExecutorVersion.getName as any) = function (v: number): string {
  if (v === -1) {
    return 'unknown';
  }
  try {
    return originalGetName(v);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unknown ExecutorVersion')
    ) {
      console.warn(`Unknown ExecutorVersion ${v}, treating as 'unknown'`);
      return 'unknown';
    }
    throw error;
  }
};

console.log('[SDK Patches] ExecutorVersion patches applied');
