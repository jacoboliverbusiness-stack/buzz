import type { RawStaff } from "./parse";

/**
 * When a staff page hides one coach's address but publishes others, infer it only if
 * at least three published addresses on the same domain follow one unambiguous pattern.
 * Inferred addresses are always stored as "unverified" and are never used for sending
 * until a verification provider upgrades them.
 */

type Pattern = "first.last" | "flast" | "firstl" | "first_last" | "firstlast" | "last" | "lastf" | "first";

function parts(name: string) {
  const tokens = name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/[^a-z\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return { first: tokens[0] ?? "", last: (tokens[tokens.length - 1] ?? "").replace(/-/g, "") };
}

const BUILD: Record<Pattern, (f: string, l: string) => string> = {
  "first.last": (f, l) => `${f}.${l}`,
  flast: (f, l) => `${f[0]}${l}`,
  firstl: (f, l) => `${f}${l[0]}`,
  first_last: (f, l) => `${f}_${l}`,
  firstlast: (f, l) => `${f}${l}`,
  last: (_f, l) => l,
  lastf: (f, l) => `${l}${f[0]}`,
  first: (f) => f,
};

export function detectPattern(staff: RawStaff[]): { pattern: Pattern; domain: string; support: number } | null {
  const tally = new Map<string, number>();
  for (const s of staff) {
    if (!s.email) continue;
    const [local, domain] = s.email.split("@");
    const { first, last } = parts(s.name);
    if (!first || !last) continue;
    for (const [p, build] of Object.entries(BUILD) as Array<[Pattern, (f: string, l: string) => string]>) {
      if (build(first, last) === local) tally.set(`${p}@${domain}`, (tally.get(`${p}@${domain}`) ?? 0) + 1);
    }
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 3) return null;
  if (ranked[1] && ranked[1][1] >= ranked[0][1] * 0.5) return null; // ambiguous
  const [pattern, domain] = ranked[0][0].split("@") as [Pattern, string];
  return { pattern, domain, support: ranked[0][1] };
}

export function inferEmail(name: string, pattern: Pattern, domain: string): string | undefined {
  const { first, last } = parts(name);
  if (!first || !last) return undefined;
  return `${BUILD[pattern](first, last)}@${domain}`;
}
