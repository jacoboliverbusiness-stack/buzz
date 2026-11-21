import "server-only";
import type { Viewer } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { planById, type Plan } from "./plans";

export async function viewerPlan(viewer: Viewer | null): Promise<Plan> {
  if (!viewer) return planById("preview");
  const sub = await getStore().getSubscription(viewer.id);
  if (sub && (sub.status === "active" || sub.status === "trialing")) return planById(sub.plan);
  return planById("preview");
}

export function monthStartIso(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function checkQuota(viewer: Viewer | null, metric: "scans" | "regenerations", plan: Plan): Promise<{ ok: boolean; used: number; limit: number }> {
  const limit = metric === "scans" ? plan.limits.scansPerMonth : plan.limits.regenerationsPerMonth;
  if (!viewer) return { ok: true, used: 0, limit }; // anonymous previews are rate-limited by IP instead
  const used = await getStore().usageSince(viewer.id, metric, monthStartIso());
  return { ok: used < limit, used, limit };
}
