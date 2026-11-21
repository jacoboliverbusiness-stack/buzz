import "server-only";
import crypto from "node:crypto";
import * as z from "zod/v4";
import { structured } from "@/lib/ai/client";
import { AI_MODEL, integrations } from "@/lib/env";
import { fmtHeight } from "@/lib/roster/outlook";
import { SPORTS } from "@/lib/sports";
import type { EmailDraft } from "@/lib/types";
import { buildFacts, coachSalutation, positionLabel, positionShort, type EmailContext } from "./facts";
import { lintEmail } from "./lint";

const SYSTEM = `You write first-contact recruiting emails from a high school athlete to a college coach.

Write as the athlete: plain, respectful, specific, and short (90–160 words in the body). Coaches read hundreds of these on a phone; get to the point.

Hard rules:
- Use ONLY the facts provided. Do not add statistics, honors, measurements, academic details, or anything else that is not listed.
- Do not claim the athlete loves, admires, or has always wanted to attend the school. Do not praise the program's tradition or prestige.
- If a roster observation is provided, you may mention it carefully as something the athlete noticed on the public roster (e.g. "I saw your receiver room has several seniors this year"). Never say the program needs the athlete or has an opening.
- If the coach works with the athlete's position group or handles recruiting, say that's why you're writing to them.
- No exclamation points, emojis, buzzwords or flattery. Address them as "Coach <Last name>".
- Ask for one thing: to look at the film. Include the film/profile URL on its own line.
- End with a signature block: name, position | Class of year, high school and location, then any contact details provided.
- Subject format: "<Class> <Position abbreviation> | <Full name> | <High school, State>" (skip any part that isn't provided).

Return the subject and body, plus the list of fact lines you used.`;

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  used_facts: z.array(z.string()),
});

export async function composeEmail(ctx: EmailContext): Promise<{ draft: EmailDraft; usd: number }> {
  const facts = buildFacts(ctx);
  const base = {
    id: crypto.randomUUID(),
    programId: ctx.match.program.id,
    coachId: ctx.coach.id,
    facts,
    status: "draft" as const,
    createdAt: new Date().toISOString(),
  };

  if (integrations().ai) {
    try {
      const res = await structured({
        model: AI_MODEL,
        system: SYSTEM,
        user: `Write the email to ${coachSalutation(ctx.coach)}.\n\nFacts you may use:\n${facts.map((f) => `- ${f}`).join("\n")}`,
        schema: EmailSchema,
        maxTokens: 2000,
        effort: "low",
      });
      const issues = lintEmail(res.output.subject, res.output.body, facts);
      if (issues.length === 0) {
        return { draft: { ...base, subject: res.output.subject.trim(), body: res.output.body.trim(), generator: "ai", model: res.model, warnings: [] }, usd: res.usd };
      }
      // Fall through to the grounded writer rather than show an email that broke a rule.
      const t = groundedEmail(ctx);
      return { draft: { ...base, ...t, generator: "grounded-template", warnings: [`AI draft rejected: ${issues.join("; ")}`] }, usd: res.usd };
    } catch (e) {
      const t = groundedEmail(ctx);
      return { draft: { ...base, ...t, generator: "grounded-template", warnings: [`AI unavailable: ${(e as Error).message}`] }, usd: 0 };
    }
  }
  const t = groundedEmail(ctx);
  return { draft: { ...base, ...t, generator: "grounded-template", warnings: [] }, usd: 0 };
}

/**
 * Deterministic writer used without an AI key and as the safety net. It still
 * personalises from real context (coach role, roster projection, distance, the
 * athlete's measurables and film) — it never inserts anything that isn't a fact.
 */
export function groundedEmail(ctx: EmailContext): { subject: string; body: string } {
  const { athlete: a, match: m, coach: c, prefs } = ctx;
  const cfg = SPORTS[a.sport];
  const group = a.positions.map((p) => cfg.positionGroups(p)[0]).find(Boolean);
  const pos = positionLabel(a);
  const full = `${a.firstName} ${a.lastName}`.trim();
  const where = a.highSchool ? `${a.highSchool}${a.state ? ` in ${a.city ? `${a.city}, ` : ""}${a.state}` : ""}` : a.state ? `a high school in ${a.state}` : "high school";

  const subject = [
    [a.gradYear, positionShort(a)].filter(Boolean).join(" "),
    full,
    a.highSchool ? `${a.highSchool}${a.state ? `, ${a.state}` : ""}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  const intro = `My name is ${full}, and I'm a ${a.gradYear ? `${a.gradYear} ` : ""}${pos} at ${where}.`;

  const why: string[] = [];
  const coversGroup = group && c.positionGroups.includes(group);
  if (coversGroup) why.push(`I'm writing to you because you coach the ${cfg.groupLabel(group!).plural} at ${m.program.school}`);
  else if (c.role === "recruiting") why.push(`I'm writing to you because you handle recruiting at ${m.program.school}`);
  else why.push(`I'm reaching out about ${m.program.school} football`);
  if (m.outlook && (m.outlook.signal === "strong" || m.outlook.signal === "moderate") && group) {
    why.push(
      `I noticed on your current roster that ${m.outlook.departingBeforeArrival} of the ${m.outlook.onRoster} ${cfg.groupLabel(group).plural} are in classes that finish before I would arrive${a.gradYear ? ` in ${a.gradYear}` : ""}, and I'd like to be considered for that class`,
    );
  } else if (prefs.divisions.includes(m.program.division) && m.program.conference) {
    why.push(`I'm focused on finding the right fit at the ${m.program.conference} level`);
  } else if (m.distanceMiles === 0) {
    why.push(`I'd like to stay close to home in ${m.program.state}`);
  }
  const whyLine = why.length > 1 ? `${why[0]}. ${why[1]}.` : `${why[0]}.`;

  const credentials: string[] = [];
  const size = [a.heightIn ? fmtHeight(a.heightIn) : "", a.weightLb ? `${a.weightLb} lbs` : ""].filter(Boolean).join(", ");
  if (size) credentials.push(`I'm ${size}`);
  const stats = a.stats.slice(0, 3).map((s) => `${s.value} ${s.label.toLowerCase()}`);
  if (stats.length) credentials.push(`${a.stats[0].season ? `in ${a.stats[0].season} ` : "this past season "}I had ${stats.join(", ")}`);
  const meas = a.measurables.slice(0, 2).map((s) => `${s.label.toLowerCase()} of ${s.value}${s.verified ? " (verified)" : ""}`);
  if (meas.length) credentials.push(`I've recorded a ${meas.join(" and a ")}`);
  if (a.achievements[0]) credentials.push(a.achievements[0].replace(/\.$/, ""));
  if (a.gpa) credentials.push(`I carry a ${a.gpa.toFixed(2)} GPA`);
  const credLine = credentials.length ? credentials.map((s, i) => (i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1))).join("; ") + "." : "";

  const film = a.film[0]?.url ?? a.sourceUrl;
  const contact = [a.contactEmail, a.contactPhone].filter(Boolean).join(" | ");

  const body = [
    `Hi ${coachSalutation(c)},`,
    "",
    intro,
    "",
    whyLine,
    credLine ? `\n${credLine.charAt(0).toUpperCase() + credLine.slice(1)}` : "",
    "",
    film ? `I'd appreciate it if you could take a look at my film:\n${film}` : "I'd appreciate the chance to send you my film.",
    "",
    "Thank you for your time, Coach.",
    "",
    full,
    `${positionShort(a)} | Class of ${a.gradYear ?? ""}`.replace(/ \| Class of $/, ""),
    a.highSchool ? `${a.highSchool}${a.city && a.state ? `, ${a.city}, ${a.state}` : ""}` : "",
    contact,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject, body };
}
