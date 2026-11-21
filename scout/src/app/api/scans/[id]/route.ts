import { NextResponse } from "next/server";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { viewerPlan } from "@/lib/billing/entitlements";
import { presentScan } from "@/lib/present";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const scan = await getStore().getScan(id);
  const viewer = await getViewer();
  if (!scan || !(await canAccessScan(scan, viewer))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(presentScan(scan, await viewerPlan(viewer), !!viewer));
}
