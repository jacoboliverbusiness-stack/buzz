import { z } from "zod";
import { canAccessScan, getViewer } from "@/lib/auth/session";
import { checkQuota, viewerPlan } from "@/lib/billing/entitlements";
import { runPipeline } from "@/lib/pipeline/run";
import { presentEvent } from "@/lib/present";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/scans";
import { getStore } from "@/lib/store";
import { AthleteProfile, Preferences } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Step 2: athlete confirms details → run the research pipeline.
 * The response is an NDJSON stream of real pipeline events, emitted as each task completes.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const scan = await store.getScan(id);
  const viewer = await getViewer();
  if (!scan || !(await canAccessScan(scan, viewer))) return Response.json({ error: "Not found" }, { status: 404 });
  if (scan.status === "running") return Response.json({ error: "This campaign is already being built." }, { status: 409 });

  const body = z.object({ profile: z.unknown(), preferences: z.unknown() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const profile = AthleteProfile.safeParse(body.data.profile);
  if (!profile.success) {
    return Response.json({ error: "Some details are missing or invalid.", issues: profile.error.issues.map((i) => i.path.join(".")) }, { status: 422 });
  }
  const prefs = Preferences.safeParse(body.data.preferences ?? {});
  if (!prefs.success) return Response.json({ error: "Invalid preferences" }, { status: 422 });

  const plan = await viewerPlan(viewer);
  if (viewer) {
    const q = await checkQuota(viewer, "scans", plan);
    if (!q.ok) return Response.json({ error: `You've used all ${q.limit} campaigns on your plan this month.`, code: "quota" }, { status: 402 });
  } else if (!rateLimit(`scan:${await clientIp()}`, 3, 24 * 60 * 60 * 1000)) {
    return Response.json({ error: "Free previews are limited to 3 a day. Create an account to keep going.", code: "quota" }, { status: 429 });
  }

  // Record which confirmed fields the athlete supplied or changed.
  const prov = { ...scan.profile.provenance };
  for (const [k, v] of Object.entries(profile.data)) {
    if (k === "provenance") continue;
    const before = (scan.profile as Record<string, unknown>)[k];
    if (v !== undefined && JSON.stringify(before) !== JSON.stringify(v)) prov[k] = "athlete";
  }
  scan.profile = { ...profile.data, provenance: prov };
  scan.preferences = prefs.data;
  scan.missing = [];
  if (viewer && !scan.ownerId) scan.ownerId = viewer.id;
  if (viewer) await store.recordUsage(viewer.id, "scans", 1);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* client went away — the pipeline still finishes and saves */
        }
      };
      await runPipeline(scan, (e) => send(presentEvent(e, scan, plan)));
      try {
        controller.close();
      } catch {}
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
