import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const Limits = z.object({
  scansPerMonth: z.number().int(),
  matchesPerScan: z.number().int(),
  visibleEmailDrafts: z.number().int(),
  revealContacts: z.boolean(),
  regenerationsPerMonth: z.number().int(),
  managedSending: z.boolean(),
  autoFollowUps: z.boolean(),
  replyInbox: z.boolean(),
  ongoingDiscovery: z.boolean(),
});
const Plan = z.object({
  id: z.string(),
  name: z.string(),
  priceMonthlyUsd: z.number(),
  stripePriceEnv: z.string().nullable(),
  limits: Limits,
  features: z.array(z.string()).default([]),
});
export type Plan = z.infer<typeof Plan>;

let cached: Plan[] | null = null;
export function plans(): Plan[] {
  if (!cached) {
    const raw = process.env.SCOUT_PLANS_JSON ?? fs.readFileSync(path.join(process.cwd(), "data", "plans.json"), "utf8");
    cached = z.object({ plans: z.array(Plan) }).parse(JSON.parse(raw)).plans;
  }
  return cached;
}
export function planById(id: string | undefined | null): Plan {
  return plans().find((p) => p.id === id) ?? plans()[0];
}
export function stripePriceFor(plan: Plan): string | undefined {
  return plan.stripePriceEnv ? process.env[plan.stripePriceEnv] : undefined;
}
