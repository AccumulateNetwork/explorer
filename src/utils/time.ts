/**
 * Human timezone suffix for "Timestamp (UTC±N)" labels, from an offset in
 * minutes (as returned by `moment().utcOffset()`).
 *
 * A negative offset renders its own sign, so prepending one produced
 * "UTC--5"; and a precedence bug in one site (`a < 0 ? '-' : '+' + a`)
 * rendered "UTC-" with no number at all — for every visitor west of UTC (#47).
 */
export function utcOffsetLabel(minutes: number): string {
  const hours = minutes / 60;
  return hours < 0 ? `${hours}` : `+${hours}`;
}
