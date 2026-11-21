import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { scanCookie } from "@/lib/auth/session";
import { integrations } from "@/lib/env";
import { getStore } from "@/lib/store";
import type { AthleteProfile, Scan } from "@/lib/types";

export async function createScan(profile: Partial<AthleteProfile>, missing: string[], ownerId?: string): Promise<Scan> {
  const scan: Scan = {
    id: crypto.randomUUID(),
    ownerId,
    accessToken: crypto.randomBytes(24).toString("base64url"),
    createdAt: new Date().toISOString(),
    status: "extracted",
    mode: integrations().demoMode ? "demo" : "live",
    // Stored as partial until the athlete confirms; validated strictly before the run.
    profile: { positions: [], stats: [], measurables: [], achievements: [], film: [], provenance: {}, ...profile } as AthleteProfile,
    missing,
    preferences: { divisions: [], states: [], regions: [], academicPriority: "any" },
    matches: [],
    emails: [],
    events: [],
    costUsd: 0,
  };
  await getStore().saveScan(scan);
  (await cookies()).set(scanCookie(scan.id), scan.accessToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return scan;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}
