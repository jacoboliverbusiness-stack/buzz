import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { extractProfile } from "@/lib/profile/extract";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, createScan } from "@/lib/scans";

/** Step 1: paste a link → extract the public profile → create a scan to confirm. */
export async function POST(req: Request) {
  const body = z.object({ url: z.string().min(4).max(500) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Paste your Hudl profile link." }, { status: 400 });
  if (!rateLimit(`extract:${await clientIp()}`, 20, 60 * 60 * 1000))
    return NextResponse.json({ error: "Too many lookups from this network. Try again in an hour." }, { status: 429 });

  const result = await extractProfile(body.data.url);
  if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: 422 });
  const viewer = await getViewer();
  const scan = await createScan(result.profile, result.missing, viewer?.id);
  return NextResponse.json({ id: scan.id, profile: scan.profile, missing: result.missing, notes: result.notes });
}
