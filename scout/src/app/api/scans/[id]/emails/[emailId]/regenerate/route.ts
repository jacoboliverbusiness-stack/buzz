import { NextResponse } from "next/server";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { checkQuota, viewerPlan } from "@/lib/billing/entitlements";
import { composeEmail } from "@/lib/outreach/compose";
import { presentEmail } from "@/lib/present";
import { getStore } from "@/lib/store";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; emailId: string }> }) {
  const { id, emailId } = await ctx.params;
  const viewer = await getViewer();
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan || !(await canAccessScan(scan, viewer))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!viewer) return NextResponse.json({ error: "Create an account to regenerate drafts.", code: "auth" }, { status: 401 });
  const plan = await viewerPlan(viewer);
  const q = await checkQuota(viewer, "regenerations", plan);
  if (!q.ok) return NextResponse.json({ error: "Regeneration limit reached for this month.", code: "quota" }, { status: 402 });

  const idx = scan.emails.findIndex((e) => e.id === emailId);
  const old = scan.emails[idx];
  const match = scan.matches.find((m) => m.program.id === old?.programId);
  const coach = match?.coaches.find((c) => c.id === old?.coachId);
  if (!old || !match || !coach) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { draft, usd } = await composeEmail({ athlete: scan.profile, prefs: scan.preferences, match, coach });
  draft.id = old.id;
  scan.emails[idx] = draft;
  scan.costUsd += usd;
  await store.saveScan(scan);
  await store.recordUsage(viewer.id, "regenerations", 1);
  if (usd) await store.recordCost({ scanId: scan.id, ownerId: viewer.id, kind: "ai", detail: "regenerate email", usd, at: new Date().toISOString() });
  return NextResponse.json(presentEmail(draft, scan, plan));
}
