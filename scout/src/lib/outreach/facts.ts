import { fmtHeight } from "@/lib/roster/outlook";
import { SPORTS } from "@/lib/sports";
import type { AthleteProfile, Coach, Match, Preferences } from "@/lib/types";
import { DIVISION_LABEL } from "@/lib/types";

/**
 * The only facts an email may use. Built from the confirmed profile, the program record,
 * the coach's published title and the roster projection. If something isn't here, the
 * writer isn't allowed to say it — that is how "never fabricate" is enforced.
 */

export interface EmailContext {
  athlete: AthleteProfile;
  prefs: Preferences;
  match: Match;
  coach: Coach;
}

export function coachSalutation(coach: Coach): string {
  const parts = coach.name.replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim().split(/\s+/);
  return `Coach ${parts[parts.length - 1]}`;
}

export function positionLabel(a: AthleteProfile): string {
  const cfg = SPORTS[a.sport];
  const g = a.positions.map((p) => cfg.positionGroups(p)[0]).find(Boolean);
  return g ? cfg.groupLabel(g).singular : a.positions[0] ?? "athlete";
}

export function positionShort(a: AthleteProfile): string {
  return a.positions[0]?.toUpperCase() ?? "ATH";
}

export function buildFacts(ctx: EmailContext): string[] {
  const { athlete: a, match: m, coach: c, prefs } = ctx;
  const f: string[] = [];
  f.push(`Athlete name: ${a.firstName} ${a.lastName}`.trim());
  f.push(`Position: ${a.positions.join(" / ")} (${positionLabel(a)})`);
  if (a.gradYear) f.push(`High school graduating class: ${a.gradYear}`);
  if (a.highSchool) f.push(`High school: ${a.highSchool}${a.city && a.state ? `, ${a.city}, ${a.state}` : a.state ? `, ${a.state}` : ""}`);
  if (a.heightIn) f.push(`Height: ${fmtHeight(a.heightIn)}`);
  if (a.weightLb) f.push(`Weight: ${a.weightLb} lbs`);
  for (const s of a.stats) f.push(`Stat${s.season ? ` (${s.season})` : ""}: ${s.label} ${s.value}`);
  for (const s of a.measurables) f.push(`Measurable: ${s.label} ${s.value}${s.verified ? " (verified)" : ""}`);
  for (const ach of a.achievements) f.push(`Achievement: ${ach}`);
  if (a.gpa) f.push(`GPA: ${a.gpa.toFixed(2)}`);
  if (a.testScores) f.push(`Test scores: ${a.testScores}`);
  if (a.intendedMajor) f.push(`Intended major: ${a.intendedMajor}`);
  if (a.film[0]) f.push(`Highlight film URL: ${a.film[0].url}`);
  else if (a.sourceUrl) f.push(`Hudl profile URL: ${a.sourceUrl}`);
  if (a.contactEmail) f.push(`Athlete email: ${a.contactEmail}`);
  if (a.contactPhone) f.push(`Athlete phone: ${a.contactPhone}`);

  f.push(`College: ${m.program.school} (${DIVISION_LABEL[m.program.division]}${m.program.conference ? `, ${m.program.conference}` : ""}), ${m.program.city}, ${m.program.state}`);
  f.push(`Coach: ${c.name}, ${c.title}`);
  if (c.positionGroups.length && a.positions.length) {
    const g = SPORTS[a.sport].positionGroups(a.positions[0])[0];
    if (g && c.positionGroups.includes(g)) f.push(`This coach works with the athlete's position group.`);
  }
  if (c.role === "recruiting") f.push(`This coach handles recruiting.`);
  if (m.outlook && (m.outlook.signal === "strong" || m.outlook.signal === "moderate")) {
    f.push(`Public roster observation (projection only, not a confirmed need): ${m.outlook.explanation}`);
  }
  if (m.distanceMiles === 0) f.push(`The college is in the athlete's home state.`);
  else if (m.distanceMiles !== undefined && m.distanceMiles <= 300) f.push(`The college is in a nearby state.`);
  if (prefs.divisions.length) f.push(`Athlete is focusing on: ${prefs.divisions.map((d) => DIVISION_LABEL[d]).join(", ")}`);
  if (prefs.notes) f.push(`Athlete's own note on what they want: ${prefs.notes}`);
  if (a.commitment) f.push(`Note: athlete lists a commitment to ${a.commitment}`);
  return f;
}
