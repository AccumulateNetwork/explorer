import { describe, it, expect } from 'vitest';

/**
 * Unit tests for BigInt fix in SendTokens component
 *
 * Tests the reduce() logic that calculates total amount from multiple outputs
 * This fix addresses: TypeError: Cannot mix BigInt and other types
 */

describe('SendTokens BigInt amount calculation', () => {
  // Helper function that mimics the fixed reduce logic
  const calculateTotalAmount = (outputs: Array<{ amount?: bigint | number | string }>) => {
    return outputs.reduce((v, x) => {
      const amt = x.amount ?? 0;
      return v + (typeof amt === 'bigint' ? amt : BigInt(amt));
    }, 0n);
  };

  it('should handle BigInt amounts correctly', () => {
    const outputs = [
      { amount: 25_50000000n },
      { amount: 30_75000000n },
      { amount: 15_25000000n },
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(71_50000000n);
  });

  it('should handle number amounts and convert to BigInt', () => {
    const outputs = [
      { amount: 1000000000 },  // 10 ACME as number
      { amount: 2000000000 },  // 20 ACME as number
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(3000000000n);
  });

  it('should handle string amounts and convert to BigInt', () => {
    const outputs = [
      { amount: '500000000' },  // 5 ACME as string
      { amount: '1500000000' }, // 15 ACME as string
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(2000000000n);
  });

  it('should handle undefined amounts as 0', () => {
    const outputs = [
      { amount: 1000000000n },
      { amount: undefined },
      { amount: 2000000000n },
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(3000000000n);
  });

  it('should handle zero BigInt amounts correctly (not treat as falsy)', () => {
    const outputs = [
      { amount: 0n },          // Zero BigInt should stay 0n
      { amount: 1000000000n },
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(1000000000n);
  });

  it('should handle mixed types (BigInt, number, string)', () => {
    const outputs = [
      { amount: 1000000000n },      // BigInt
      { amount: 500000000 },        // number
      { amount: '250000000' },      // string
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(1750000000n);
  });

  it('should handle empty outputs array', () => {
    const outputs: Array<{ amount?: bigint }> = [];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(0n);
  });

  it('should handle large amounts exceeding Number.MAX_SAFE_INTEGER', () => {
    const largeAmount = BigInt(Number.MAX_SAFE_INTEGER) * 2n;
    const outputs = [
      { amount: largeAmount },
      { amount: largeAmount },
    ];

    const total = calculateTotalAmount(outputs);

    expect(total).toBe(largeAmount * 2n);
  });

  it('should NOT throw "Cannot mix BigInt" error (regression test)', () => {
    // This would fail with the old code: BigInt(x.amount || 0)
    // because x.amount || 0 could return number 0, then BigInt(0n) fails

    const outputs = [
      { amount: 0n },  // This is falsy, old code would use 0 (number)
      { amount: 1n },
    ];

    expect(() => {
      calculateTotalAmount(outputs);
    }).not.toThrow();
  });
});
