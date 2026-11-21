import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { integrations } from "@/lib/env";

/**
 * Viewer identity.
 * - Production: Supabase Auth (email magic link). Session lives in Supabase's cookies.
 * - Local/demo without Supabase: a signed dev-session cookie so the account flow can be
 *   exercised. It is refused in production builds.
 */

export interface Viewer {
  id: string;
  email: string;
}

export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* called from a server component; middleware refreshes instead */
        }
      },
    },
  });
}

const DEV_COOKIE = "scout_dev_session";
const devSecret = () => process.env.SCOUT_SESSION_SECRET ?? "dev-only-secret-change-me";
export const devAuthAllowed = () => !integrations().supabase && (process.env.NODE_ENV !== "production" || integrations().demoMode);

function sign(v: string) {
  return crypto.createHmac("sha256", devSecret()).update(v).digest("base64url");
}

export async function getViewer(): Promise<Viewer | null> {
  if (integrations().supabase) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  }
  if (!devAuthAllowed()) return null;
  const raw = (await cookies()).get(DEV_COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || sign(payload) !== sig) return null;
  const email = Buffer.from(payload, "base64url").toString("utf8");
  return { id: "dev-" + crypto.createHash("sha1").update(email).digest("hex").slice(0, 16), email };
}

export async function setDevSession(email: string) {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  (await cookies()).set(DEV_COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearDevSession() {
  (await cookies()).delete(DEV_COOKIE);
}

/* Anonymous scan access: the creator holds a per-scan token in an httpOnly cookie. */
export const scanCookie = (id: string) => `scout_scan_${id}`;

export async function canAccessScan(scan: { id: string; ownerId?: string; accessToken: string }, viewer: Viewer | null) {
  if (scan.ownerId && viewer?.id === scan.ownerId) return true;
  const tok = (await cookies()).get(scanCookie(scan.id))?.value;
  return !!tok && tok.length === scan.accessToken.length && crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(scan.accessToken));
}
