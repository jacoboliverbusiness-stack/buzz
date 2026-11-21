import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { viewerPlan } from "@/lib/billing/entitlements";
import { lintEmail } from "@/lib/outreach/lint";
import { presentEmail } from "@/lib/present";
import { getStore } from "@/lib/store";

/** Edit or approve a draft. Approval never sends — sending is disabled in the MVP. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; emailId: string }> }) {
  const { id, emailId } = await ctx.params;
  const viewer = await getViewer();
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan || !(await canAccessScan(scan, viewer))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const plan = await viewerPlan(viewer);
  const email = scan.emails.find((e) => e.id === emailId);
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (presentEmail(email, scan, plan).locked) return NextResponse.json({ error: "Upgrade to edit this draft", code: "locked" }, { status: 402 });

  const body = z
    .object({ subject: z.string().min(1).max(200).optional(), body: z.string().min(1).max(5000).optional(), status: z.enum(["draft", "edited", "approved"]).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid edit" }, { status: 400 });
  if (body.data.subject !== undefined || body.data.body !== undefined) {
    email.subject = body.data.subject ?? email.subject;
    email.body = body.data.body ?? email.body;
    email.status = "edited";
    // Athlete edits are theirs to make; we only flag likely problems.
    email.warnings = lintEmail(email.subject, email.body, email.facts).filter((w) => !w.startsWith("number"));
  }
  if (body.data.status) email.status = body.data.status;
  await store.saveScan(scan);
  return NextResponse.json(presentEmail(email, scan, plan));
}
