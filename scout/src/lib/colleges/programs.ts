import fs from "node:fs";
import path from "node:path";
import { Division, Program, type SportId } from "@/lib/types";

/**
 * Program catalogue. Seeded from data/programs.<sport>.psv (real institutions and their
 * official athletics sites) and, when Supabase is configured, overridden by the
 * `programs` table maintained by the ingestion job.
 */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseProgramSeed(text: string, sport: SportId): Program[] {
  const out: Program[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [division, conference, school, city, state, site] = line.split("|").map((s) => s.trim());
    const parsed = Program.safeParse({
      id: `${sport}-${slugify(school)}`,
      school,
      sport,
      division: Division.parse(division),
      conference: conference || undefined,
      city,
      state,
      athleticsUrl: `https://${site}`,
    });
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const cache = new Map<SportId, Program[]>();

export function seedPrograms(sport: SportId): Program[] {
  if (!cache.has(sport)) {
    const file = path.join(process.cwd(), "data", `programs.${sport}.psv`);
    cache.set(sport, fs.existsSync(file) ? parseProgramSeed(fs.readFileSync(file, "utf8"), sport) : []);
  }
  return cache.get(sport)!;
}

/** Conferences whose members are academically selective — a factual membership signal. */
export const ACADEMIC_CONFERENCES = new Set(["Ivy League", "Patriot League", "NESCAC", "UAA", "Centennial", "PAC", "NCAC", "SCIAC", "Liberty League", "ODAC", "SAA"]);
export const ACADEMIC_SCHOOLS = new Set([
  "Stanford University", "Duke University", "Northwestern University", "Vanderbilt University", "Rice University",
  "University of Notre Dame", "Wake Forest University", "Boston College", "Georgia Tech", "University of Virginia",
  "University of California, Berkeley", "UCLA", "University of Michigan", "University of North Carolina",
  "Washington University in St. Louis", "Carnegie Mellon University", "Case Western Reserve University",
  "Johns Hopkins University", "Naval Academy", "Army West Point", "Air Force Academy", "William & Mary",
  "University of Richmond", "Villanova University", "Tulane University",
]);

export function academicSignal(p: Program): "top" | "strong" | undefined {
  if (p.academicTier === "top" || p.academicTier === "strong") return p.academicTier;
  if (p.conference === "Ivy League" || p.conference === "NESCAC") return "top";
  if (ACADEMIC_SCHOOLS.has(p.school) || (p.conference && ACADEMIC_CONFERENCES.has(p.conference))) return "strong";
  return undefined;
}
