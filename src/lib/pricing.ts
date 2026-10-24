/** Hours from now to end, rounded up to the next full hour. $1 per hour. */
export function releasedPrice(now: Date | string, end: Date | string) {
  const ms = new Date(end).getTime() - new Date(now).getTime();
  const hours = Math.max(0, Math.ceil(ms / 36e5));
  return { hours, total: hours * 1 };
}
