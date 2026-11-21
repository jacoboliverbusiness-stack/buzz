import crypto from "node:crypto";
import type { Coach, Program, RosterPlayer, RosterSnapshot } from "@/lib/types";

/**
 * DEMO MODE ONLY (SCOUT_DEMO_MODE=1). Produces obviously-labelled sample rosters and
 * coaches so the interface can be exercised without network access to college sites.
 * Every record is flagged `demo: true`, uses reserved example.edu addresses, and the UI
 * shows a "Demo data" banner. Nothing here is ever written to the shared database.
 */

function rng(seed: string) {
  let h = crypto.createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10_000) / 10_000;
  };
}

const GROUP_SIZE: Record<string, number> = { QB: 4, RB: 6, WR: 12, TE: 5, OL: 16, DL: 14, LB: 10, DB: 14, ST: 4 };
const CLASSES: RosterPlayer["classYear"][] = ["FR", "RS-FR", "SO", "RS-SO", "JR", "RS-JR", "SR", "RS-SR", "GR"];

export function demoRoster(program: Program, season: number): RosterSnapshot {
  const r = rng(program.id);
  const players: RosterPlayer[] = [];
  for (const [group, n] of Object.entries(GROUP_SIZE)) {
    for (let i = 0; i < n; i++) {
      players.push({
        name: `Sample Player ${group}${i + 1}`,
        position: group,
        positionGroup: group,
        classYear: CLASSES[Math.floor(r() * CLASSES.length)],
        heightIn: 68 + Math.floor(r() * 10) + (group === "OL" || group === "DL" ? 6 : 0),
        weightLb: 170 + Math.floor(r() * 60) + (group === "OL" || group === "DL" ? 90 : 0),
      });
    }
  }
  return { programId: program.id, season, sourceUrl: program.athleticsUrl, fetchedAt: new Date().toISOString(), players };
}

export function demoCoaches(program: Program, group: string | undefined): Coach[] {
  const now = new Date().toISOString();
  const mk = (title: string, role: Coach["role"], groups: string[], slug: string): Coach => ({
    id: `demo-${program.id}-${slug}`,
    programId: program.id,
    name: `Demo Coach ${slug.toUpperCase()}`,
    title,
    role,
    positionGroups: groups,
    email: `demo.${slug}@example.edu`,
    verification: "unverified",
    verificationDetail: "Demo data — not a real coach or address",
    sourceUrl: program.athleticsUrl,
    lastVerifiedAt: now,
    demo: true,
  });
  const g = group ?? "ATH";
  return [
    mk(`${g} Coach (sample)`, "position", [g], g.toLowerCase()),
    mk("Recruiting Coordinator (sample)", "recruiting", [], "rc"),
    mk("Head Coach (sample)", "head", [], "hc"),
  ];
}
