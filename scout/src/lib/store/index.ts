import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Coach, RosterSnapshot, Scan } from "@/lib/types";

/**
 * Persistence. Shared research (rosters, coaches) is stored once per program and reused
 * across every athlete — that's what keeps per-scan cost low. Athlete data (scans) is
 * private to its owner.
 *
 * - SupabaseStore: production. Uses the service-role key server-side only; row-level
 *   security in supabase/migrations protects direct client access.
 * - FileStore: local development and demo mode. Writes JSON under .data/.
 */

export interface CostEntry {
  scanId?: string;
  ownerId?: string;
  kind: "ai" | "verify" | "fetch" | "send" | "other";
  detail: string;
  usd: number;
  at: string;
}

export interface Subscription {
  ownerId: string;
  plan: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "none";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface Store {
  kind: "supabase" | "file";
  getScan(id: string): Promise<Scan | null>;
  saveScan(scan: Scan): Promise<void>;
  listScans(ownerId: string): Promise<Scan[]>;
  getRoster(programId: string): Promise<RosterSnapshot | null>;
  saveRoster(s: RosterSnapshot): Promise<void>;
  getCoaches(programId: string): Promise<{ coaches: Coach[]; fetchedAt: string } | null>;
  saveCoaches(programId: string, coaches: Coach[], fetchedAt: string): Promise<void>;
  recordCost(e: CostEntry): Promise<void>;
  recordUsage(ownerId: string, metric: string, qty: number): Promise<void>;
  usageSince(ownerId: string, metric: string, sinceIso: string): Promise<number>;
  getSubscription(ownerId: string): Promise<Subscription | null>;
  saveSubscription(s: Subscription): Promise<void>;
  findOwnerByCustomer(customerId: string): Promise<string | null>;
}

/* ------------------------------------------------------------------ */

class FileStore implements Store {
  kind = "file" as const;
  private dir = path.join(process.cwd(), ".data");
  constructor() {
    fs.mkdirSync(this.dir, { recursive: true });
  }
  private file(name: string) {
    return path.join(this.dir, name + ".json");
  }
  private read<T>(name: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(this.file(name), "utf8")) as T;
    } catch {
      return fallback;
    }
  }
  private write(name: string, value: unknown) {
    const tmp = this.file(name) + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, this.file(name));
  }
  async getScan(id: string) {
    return this.read<Scan | null>(`scan-${id.replace(/[^a-z0-9-]/gi, "")}`, null);
  }
  async saveScan(scan: Scan) {
    this.write(`scan-${scan.id}`, scan);
  }
  async listScans(ownerId: string) {
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.startsWith("scan-") && f.endsWith(".json"))
      .map((f) => this.read<Scan | null>(f.replace(/\.json$/, ""), null))
      .filter((s): s is Scan => !!s && s.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getRoster(programId: string) {
    return this.read<Record<string, RosterSnapshot>>("rosters", {})[programId] ?? null;
  }
  async saveRoster(s: RosterSnapshot) {
    const all = this.read<Record<string, RosterSnapshot>>("rosters", {});
    all[s.programId] = s;
    this.write("rosters", all);
  }
  async getCoaches(programId: string) {
    return this.read<Record<string, { coaches: Coach[]; fetchedAt: string }>>("coaches", {})[programId] ?? null;
  }
  async saveCoaches(programId: string, coaches: Coach[], fetchedAt: string) {
    const all = this.read<Record<string, { coaches: Coach[]; fetchedAt: string }>>("coaches", {});
    all[programId] = { coaches, fetchedAt };
    this.write("coaches", all);
  }
  async recordCost(e: CostEntry) {
    fs.appendFileSync(path.join(this.dir, "costs.ndjson"), JSON.stringify(e) + "\n");
  }
  async recordUsage(ownerId: string, metric: string, qty: number) {
    fs.appendFileSync(path.join(this.dir, "usage.ndjson"), JSON.stringify({ ownerId, metric, qty, at: new Date().toISOString() }) + "\n");
  }
  async usageSince(ownerId: string, metric: string, sinceIso: string) {
    try {
      return fs
        .readFileSync(path.join(this.dir, "usage.ndjson"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { ownerId: string; metric: string; qty: number; at: string })
        .filter((u) => u.ownerId === ownerId && u.metric === metric && u.at >= sinceIso)
        .reduce((a, u) => a + u.qty, 0);
    } catch {
      return 0;
    }
  }
  async getSubscription(ownerId: string) {
    return this.read<Record<string, Subscription>>("subscriptions", {})[ownerId] ?? null;
  }
  async saveSubscription(s: Subscription) {
    const all = this.read<Record<string, Subscription>>("subscriptions", {});
    all[s.ownerId] = s;
    this.write("subscriptions", all);
  }
  async findOwnerByCustomer(customerId: string) {
    const all = this.read<Record<string, Subscription>>("subscriptions", {});
    return Object.values(all).find((s) => s.stripeCustomerId === customerId)?.ownerId ?? null;
  }
}

/* ------------------------------------------------------------------ */

class SupabaseStore implements Store {
  kind = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async getScan(id: string) {
    const { data } = await this.db.from("scans").select("data").eq("id", id).maybeSingle();
    return (data?.data as Scan) ?? null;
  }
  async saveScan(scan: Scan) {
    const { error } = await this.db.from("scans").upsert({
      id: scan.id,
      owner_id: scan.ownerId ?? null,
      access_token: scan.accessToken,
      status: scan.status,
      sport: scan.profile.sport,
      grad_year: scan.profile.gradYear ?? null,
      cost_usd: scan.costUsd,
      data: scan,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
  async listScans(ownerId: string) {
    const { data } = await this.db.from("scans").select("data").eq("owner_id", ownerId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => r.data as Scan);
  }
  async getRoster(programId: string) {
    const { data } = await this.db.from("roster_snapshots").select("data").eq("program_id", programId).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    return (data?.data as RosterSnapshot) ?? null;
  }
  async saveRoster(s: RosterSnapshot) {
    await this.db.from("roster_snapshots").insert({ program_id: s.programId, season: s.season, source_url: s.sourceUrl, fetched_at: s.fetchedAt, data: s });
  }
  async getCoaches(programId: string) {
    const { data } = await this.db.from("coaches").select("*").eq("program_id", programId).eq("active", true);
    if (!data?.length) return null;
    const coaches = data.map((r) => r.data as Coach);
    const fetchedAt = data.map((r) => r.last_verified_at as string).sort()[0];
    return { coaches, fetchedAt };
  }
  async saveCoaches(programId: string, coaches: Coach[], fetchedAt: string) {
    // Coaches no longer listed on the official page are deactivated, not deleted, so
    // historical campaigns keep their references.
    await this.db.from("coaches").update({ active: false }).eq("program_id", programId);
    if (coaches.length)
      await this.db.from("coaches").upsert(
        coaches.map((c) => ({
          id: c.id,
          program_id: programId,
          name: c.name,
          title: c.title,
          role: c.role,
          email: c.email ?? null,
          verification: c.verification,
          source_url: c.sourceUrl,
          last_verified_at: fetchedAt,
          active: true,
          data: c,
        })),
      );
  }
  async recordCost(e: CostEntry) {
    await this.db.from("cost_ledger").insert({ scan_id: e.scanId ?? null, owner_id: e.ownerId ?? null, kind: e.kind, detail: e.detail, usd: e.usd, at: e.at });
  }
  async recordUsage(ownerId: string, metric: string, qty: number) {
    await this.db.from("usage_events").insert({ owner_id: ownerId, metric, qty });
  }
  async usageSince(ownerId: string, metric: string, sinceIso: string) {
    const { data } = await this.db.from("usage_events").select("qty").eq("owner_id", ownerId).eq("metric", metric).gte("at", sinceIso);
    return (data ?? []).reduce((a, r) => a + Number(r.qty), 0);
  }
  async getSubscription(ownerId: string) {
    const { data } = await this.db.from("subscriptions").select("*").eq("owner_id", ownerId).maybeSingle();
    if (!data) return null;
    return {
      ownerId,
      plan: data.plan,
      status: data.status,
      stripeCustomerId: data.stripe_customer_id ?? undefined,
      stripeSubscriptionId: data.stripe_subscription_id ?? undefined,
      currentPeriodEnd: data.current_period_end ?? undefined,
    };
  }
  async saveSubscription(s: Subscription) {
    await this.db.from("subscriptions").upsert({
      owner_id: s.ownerId,
      plan: s.plan,
      status: s.status,
      stripe_customer_id: s.stripeCustomerId ?? null,
      stripe_subscription_id: s.stripeSubscriptionId ?? null,
      current_period_end: s.currentPeriodEnd ?? null,
    });
  }
  async findOwnerByCustomer(customerId: string) {
    const { data } = await this.db.from("subscriptions").select("owner_id").eq("stripe_customer_id", customerId).maybeSingle();
    return (data?.owner_id as string) ?? null;
  }
}

let instance: Store | null = null;

export function getStore(): Store {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    instance = url && key ? new SupabaseStore(createClient(url, key, { auth: { persistSession: false } })) : new FileStore();
  }
  return instance;
}
