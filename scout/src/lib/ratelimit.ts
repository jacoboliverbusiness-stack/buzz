import "server-only";
/** Simple fixed-window limiter. Per-instance; put Upstash/Redis behind the same API at scale. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < t) {
    hits.set(key, { n: 1, reset: t + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}
