import { notFound } from "next/navigation";
import { ScanApp } from "@/components/scan/ScanApp";
import { SiteHeader } from "@/components/SiteHeader";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { viewerPlan } from "@/lib/billing/entitlements";
import { presentScan } from "@/lib/present";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your campaign" };

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await getStore().getScan(id);
  const viewer = await getViewer();
  if (!scan || !(await canAccessScan(scan, viewer))) notFound();
  return (
    <>
      <SiteHeader />
      <main className="border-t hairline">
        <ScanApp initial={presentScan(scan, await viewerPlan(viewer), !!viewer)} />
      </main>
    </>
  );
}
