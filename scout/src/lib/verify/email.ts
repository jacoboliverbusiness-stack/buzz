import "server-only";
import dns from "node:dns/promises";
import type { VerificationStatus } from "@/lib/types";

/**
 * Email verification in layers, cheapest first:
 *   1. Syntax + disposable/role checks (free).
 *   2. Provenance: was the address published on the program's official page? (free, from ingestion)
 *   3. Domain accepts mail: MX lookup, cached per domain (free).
 *   4. Mailbox-level check through a paid provider, only if configured (≈$0.003–0.008/check).
 * The status shown to athletes always says which layer it came from.
 */

const SYNTAX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const GENERIC_LOCAL = /^(info|athletics|sports|webmaster|media|tickets|admissions|noreply|no-reply|sid|communications)$/i;

const mxCache = new Map<string, Promise<boolean>>();

async function viaDoh(domain: string): Promise<boolean> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("doh " + res.status);
  const j = (await res.json()) as { Status: number; Answer?: Array<{ type: number }> };
  return j.Status === 0 && !!j.Answer?.some((a) => a.type === 15);
}

export function domainAcceptsMail(domain: string): Promise<boolean> {
  let p = mxCache.get(domain);
  if (!p) {
    p = (async () => {
      try {
        const mx = await dns.resolveMx(domain);
        return mx.length > 0;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code === "ENOTFOUND" || code === "ENODATA") return false;
        try {
          return await viaDoh(domain);
        } catch {
          return false;
        }
      }
    })();
    mxCache.set(domain, p);
  }
  return p;
}

export interface VerificationResult {
  status: VerificationStatus;
  detail: string;
  costUsd: number;
}

interface ProviderResult {
  status: VerificationStatus;
  detail: string;
}

/** Pluggable mailbox verifier. ZeroBounce shown; NeverBounce/Kickbox follow the same shape. */
async function providerCheck(email: string): Promise<ProviderResult | null> {
  const key = process.env.ZEROBOUNCE_API_KEY;
  if (!key) return null;
  const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(key)}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const j = (await res.json()) as { status?: string; sub_status?: string };
  switch (j.status) {
    case "valid":
      return { status: "verified", detail: "Mailbox confirmed by verification provider" };
    case "catch-all":
      return { status: "accept_all", detail: "Domain accepts all addresses; mailbox can't be confirmed individually" };
    case "invalid":
      return { status: "invalid", detail: `Rejected by verification provider (${j.sub_status ?? "invalid"})` };
    default:
      return { status: "unknown", detail: "Verification provider could not determine status" };
  }
}

export const PROVIDER_COST_USD = Number(process.env.EMAIL_VERIFY_COST_USD ?? 0.008);

export async function verifyEmail(email: string, opts: { publishedOnOfficialPage: boolean; inferred?: boolean }): Promise<VerificationResult> {
  const e = email.trim().toLowerCase();
  if (!SYNTAX.test(e)) return { status: "invalid", detail: "Not a valid email address", costUsd: 0 };
  const [local, domain] = e.split("@");
  if (GENERIC_LOCAL.test(local)) return { status: "invalid", detail: "Shared department inbox, not a coach", costUsd: 0 };
  const mx = await domainAcceptsMail(domain);
  if (!mx) return { status: "invalid", detail: `${domain} does not accept email`, costUsd: 0 };

  const provider = await providerCheck(e).catch(() => null);
  if (provider) return { ...provider, costUsd: PROVIDER_COST_USD };

  if (opts.publishedOnOfficialPage && !opts.inferred)
    return { status: "verified", detail: "Published on the program's official staff page; domain accepts mail", costUsd: 0 };
  return { status: "unverified", detail: "Inferred from the staff email pattern; not yet confirmed", costUsd: 0 };
}
