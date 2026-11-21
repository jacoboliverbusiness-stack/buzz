import type { SportId } from "@/lib/types";
import * as football from "./football";

/**
 * Sport registry. Football is the MVP; basketball and volleyball are registered
 * so the data model and UI already speak "sport", but their matching configs
 * are not enabled until roster parsing and title rules are written for them.
 */
export interface SportConfig {
  id: SportId;
  label: string;
  enabled: boolean;
  /** Path segment used by most college athletics CMSs (Sidearm, PrestoSports, WMT). */
  sitePaths: string[];
  groups: readonly string[];
  groupLabel: (g: string) => { singular: string; plural: string };
  positionGroups: (raw: string | null | undefined) => string[];
}

export const SPORTS: Record<SportId, SportConfig> = {
  football: {
    id: "football",
    label: "Football",
    enabled: true,
    sitePaths: ["football"],
    groups: football.FOOTBALL_GROUPS,
    groupLabel: (g) => football.GROUP_LABEL[g as football.FootballGroup] ?? { singular: g, plural: g },
    positionGroups: football.positionGroups,
  },
  basketball: {
    id: "basketball",
    label: "Basketball",
    enabled: false,
    sitePaths: ["mens-basketball", "womens-basketball"],
    groups: ["G", "F", "C"],
    groupLabel: (g) => ({ G: { singular: "guard", plural: "guards" }, F: { singular: "forward", plural: "forwards" }, C: { singular: "center", plural: "centers" } })[g] ?? { singular: g, plural: g },
    positionGroups: (raw) => (raw ? [...new Set(raw.toUpperCase().match(/\b(PG|SG|G|SF|PF|F|C)\b/g)?.map((p) => (p.endsWith("G") ? "G" : p.endsWith("F") ? "F" : "C")) ?? [])] : []),
  },
  volleyball: {
    id: "volleyball",
    label: "Volleyball",
    enabled: false,
    sitePaths: ["womens-volleyball", "mens-volleyball"],
    groups: ["S", "OH", "MB", "OPP", "L", "DS"],
    groupLabel: (g) => ({ singular: g, plural: g + "s" }),
    positionGroups: (raw) => (raw ? [...new Set(raw.toUpperCase().match(/\b(S|OH|MB|MH|OPP|RS|L|DS)\b/g) ?? [])] : []),
  },
};

export function sportFromHudlName(name: string | null | undefined): SportId | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (n.includes("football") && !n.includes("flag")) return "football";
  if (n.includes("basketball")) return "basketball";
  if (n.includes("volleyball")) return "volleyball";
  return undefined;
}
