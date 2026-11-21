import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { missingEssentials } from "@/lib/profile/extract";
import { createScan } from "@/lib/scans";

/** "I don't have a Hudl profile" — start from an empty profile the athlete fills in. */
export async function POST() {
  const viewer = await getViewer();
  const profile = { sport: "football" as const, provenance: {} };
  const scan = await createScan(profile, missingEssentials(profile), viewer?.id);
  return NextResponse.json({ id: scan.id, profile: scan.profile, missing: scan.missing, notes: [] });
}
