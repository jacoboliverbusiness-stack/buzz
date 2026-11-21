import "server-only";

/**
 * Polite HTTP client for public pages.
 * - Identifies itself honestly (no browser spoofing).
 * - Honours robots.txt for the configured user agent (cached per origin).
 * - Per-host concurrency of 1 with a minimum gap between requests.
 * - Short in-process response cache; the database is the durable cache.
 * - Never sends credentials or cookies, never follows login redirects.
 */

export const USER_AGENT =
  process.env.SCOUT_USER_AGENT ?? "ScoutByRecrua/0.1 (+https://recrua.com/bot; college recruiting research)";
const UA_TOKEN = "scoutbyrecrua";
const MIN_GAP_MS = Number(process.env.SCOUT_HOST_GAP_MS ?? 750);
const DEFAULT_TIMEOUT_MS = 12_000;

export class FetchBlockedError extends Error {
  constructor(public url: string, public reason: "robots" | "network" | "status" | "login", detail?: string) {
    super(`${reason}: ${url}${detail ? ` (${detail})` : ""}`);
  }
}

type RobotsRules = { allow: string[]; disallow: string[]; crawlDelayMs?: number };
const robotsCache = new Map<string, Promise<RobotsRules>>();
const pageCache = new Map<string, { at: number; body: string; finalUrl: string }>();
const hostQueues = new Map<string, Promise<unknown>>();
const hostLast = new Map<string, number>();
const PAGE_TTL_MS = 10 * 60_000;

export function parseRobots(txt: string, agentToken = UA_TOKEN): RobotsRules {
  // Groups: consecutive User-agent lines followed by rules.
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "disallow" && value) current.rules.disallow.push(value);
    else if (key === "allow" && value) current.rules.allow.push(value);
    else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n)) current.rules.crawlDelayMs = Math.min(n * 1000, 10_000);
    }
  }
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && agentToken.includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  return (specific ?? star)?.rules ?? { allow: [], disallow: [] };
}

function ruleMatches(rule: string, path: string): number {
  // Supports * wildcards and $ anchors. Returns match length (specificity) or -1.
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const re = new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path) ? body.length : -1;
}

export function robotsAllows(rules: RobotsRules, path: string): boolean {
  let best = -1;
  let allowed = true;
  for (const r of rules.disallow) {
    const m = ruleMatches(r, path);
    if (m > best) { best = m; allowed = false; }
  }
  for (const r of rules.allow) {
    const m = ruleMatches(r, path);
    if (m >= best && m >= 0) { best = m; allowed = true; }
  }
  return allowed;
}

async function getRobots(origin: string): Promise<RobotsRules> {
  let p = robotsCache.get(origin);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(origin + "/robots.txt", {
          headers: { "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(6_000),
          redirect: "follow",
        });
        if (res.status >= 400 && res.status < 500) return { allow: [], disallow: [] }; // no robots → allowed
        if (!res.ok) return { allow: [], disallow: ["/"] }; // server error → be conservative
        return parseRobots(await res.text());
      } catch {
        return { allow: [], disallow: ["/"] };
      }
    })();
    robotsCache.set(origin, p);
  }
  return p;
}

async function throttle<T>(host: string, gapMs: number, fn: () => Promise<T>): Promise<T> {
  const prev = hostQueues.get(host) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(async () => {
    const wait = (hostLast.get(host) ?? 0) + gapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      hostLast.set(host, Date.now());
    }
  });
  hostQueues.set(host, next);
  return next;
}

export interface FetchedPage {
  url: string;
  finalUrl: string;
  body: string;
  fromCache: boolean;
}

export async function fetchPage(url: string, opts: { timeoutMs?: number; accept?: string } = {}): Promise<FetchedPage> {
  const u = new URL(url);
  const cached = pageCache.get(url);
  if (cached && Date.now() - cached.at < PAGE_TTL_MS) return { url, finalUrl: cached.finalUrl, body: cached.body, fromCache: true };

  const rules = await getRobots(u.origin);
  if (!robotsAllows(rules, u.pathname + u.search)) throw new FetchBlockedError(url, "robots");

  return throttle(u.host, Math.max(MIN_GAP_MS, rules.crawlDelayMs ?? 0), async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: opts.accept ?? "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        redirect: "follow",
      });
    } catch (e) {
      throw new FetchBlockedError(url, "network", (e as Error).message);
    }
    if (/\/(login|signin|account\/sign)/i.test(new URL(res.url).pathname)) throw new FetchBlockedError(url, "login");
    if (!res.ok) throw new FetchBlockedError(url, "status", String(res.status));
    const body = await res.text();
    pageCache.set(url, { at: Date.now(), body, finalUrl: res.url });
    return { url, finalUrl: res.url, body, fromCache: false };
  });
}

/** Run async work over items with bounded concurrency, preserving order of results. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}
