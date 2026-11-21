import { NextResponse } from "next/server";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { getStore } from "@/lib/store";

/** Attach an anonymous preview to the account that just signed in. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan || !(await canAccessScan(scan, viewer))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scan.ownerId && scan.ownerId !== viewer.id) return NextResponse.json({ error: "Already saved to another account" }, { status: 409 });
  scan.ownerId = viewer.id;
  await store.saveScan(scan);
  return NextResponse.json({ ok: true });
}
