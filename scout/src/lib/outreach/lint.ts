/**
 * Guardrails applied to every generated email, AI or not.
 * - Numbers in the email must appear in the grounded facts (no invented stats).
 * - No hype/corporate phrasing that coaches tune out.
 * - No claims of interest in the school the athlete never stated.
 */

const BANNED: Array<[RegExp, string]> = [
  [/\b(dream school|dream of playing|always dreamed)\b/i, "invented personal attachment"],
  [/\b(I'?ve always (loved|admired|wanted))\b/i, "invented personal attachment"],
  [/\b(storied|prestigious|world-class|elite program|rich tradition|renowned)\b/i, "flattery"],
  [/\b(synergy|leverage|value proposition|circle back|touch base|reach out to you to)\b/i, "corporate phrasing"],
  [/\b(I am confident that I|I guarantee|game[- ]changer|unmatched|unparalleled|second to none)\b/i, "overclaiming"],
  [/\b(I hope this email finds you well|I hope this finds you well)\b/i, "filler"],
  [/\b(your (team|program) needs|you need a)\b/i, "presents a projection as a confirmed need"],
  [/!{1,}/, "exclamation point"],
  [/[\u{1F300}-\u{1FAFF}]/u, "emoji"],
];

export function lintEmail(subject: string, body: string, facts: string[]): string[] {
  const issues: string[] = [];
  const text = `${subject}\n${body}`;
  for (const [re, why] of BANNED) if (re.test(text)) issues.push(why);

  const factText = facts.join("\n");
  const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  for (const n of new Set(numbers)) {
    if (!factText.includes(n)) issues.push(`number "${n}" is not in the athlete's verified facts`);
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > 220) issues.push(`too long (${words} words)`);
  if (words < 50) issues.push(`too short (${words} words)`);
  return [...new Set(issues)];
}
