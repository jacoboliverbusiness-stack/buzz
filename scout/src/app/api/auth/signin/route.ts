import { NextResponse } from "next/server";
import { z } from "zod";
import { devAuthAllowed, setDevSession, supabaseServer } from "@/lib/auth/session";
import { appUrl, integrations } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/scans";

export async function POST(req: Request) {
  const body = z
    .object({ email: z.string().email(), next: z.string().startsWith("/").optional(), guardianConsent: z.literal(true) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Enter a valid email and confirm consent." }, { status: 400 });
  if (!rateLimit(`signin:${await clientIp()}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  if (integrations().supabase) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithOtp({
      email: body.data.email,
      options: { emailRedirectTo: `${appUrl()}/api/auth/callback?next=${encodeURIComponent(body.data.next ?? "/campaigns")}`, data: { guardian_consent_at: new Date().toISOString() } },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ sent: true });
  }
  if (devAuthAllowed()) {
    await setDevSession(body.data.email);
    return NextResponse.json({ signedIn: true, dev: true });
  }
  return NextResponse.json({ error: "Accounts aren't configured yet." }, { status: 503 });
}
