import { describe, expect, it } from 'vitest';

import { utcOffsetLabel } from './time';

describe('utcOffsetLabel', () => {
  it('renders western offsets with a single minus (#47)', () => {
    // US Central: previously "UTC--5" or "UTC-" depending on the site.
    expect(utcOffsetLabel(-300)).toBe('-5');
    expect(utcOffsetLabel(-60)).toBe('-1');
  });

  it('renders eastern offsets with a plus', () => {
    expect(utcOffsetLabel(120)).toBe('+2');
  });

  it('handles half-hour zones', () => {
    expect(utcOffsetLabel(330)).toBe('+5.5');
    expect(utcOffsetLabel(-210)).toBe('-3.5');
  });

  it('renders UTC itself as +0', () => {
    expect(utcOffsetLabel(0)).toBe('+0');
  });
});
