import "server-only";
import * as cheerio from "cheerio";
import * as z from "zod/v4";
import { AI_EXTRACT_MODEL } from "@/lib/env";
import { structured } from "./client";

/**
 * Fallback extraction for official roster / staff pages whose markup the deterministic
 * parsers don't recognise. Runs on the cheap extraction model, only once per program per
 * refresh (results are cached in the shared database), and only copies what the page says.
 */

const MAX_PAGE_CHARS = 150_000;

export function pageText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, header nav, footer").remove();
  // Keep mailto targets visible to the model.
  $("a[href^='mailto:']").each((_, a) => {
    $(a).append(` <${$(a).attr("href")!.replace(/^mailto:/i, "")}>`);
  });
  return $("body").text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

const RosterSchema = z.object({
  season: z.number().int().nullable(),
  players: z.array(
    z.object({
      name: z.string(),
      position: z.string(),
      class_year: z.string().nullable(),
      height: z.string().nullable(),
      weight: z.string().nullable(),
    }),
  ),
});

const StaffSchema = z.object({
  staff: z.array(z.object({ name: z.string(), title: z.string(), email: z.string().nullable(), phone: z.string().nullable() })),
});

const SYSTEM =
  "You copy structured data out of a college athletics web page. Copy values exactly as written on the page. " +
  "Never add people, titles, emails or numbers that are not on the page. Use null when a value is not shown.";

export async function aiExtractRoster(html: string) {
  const text = pageText(html);
  if (text.length > MAX_PAGE_CHARS || text.length < 200) return null;
  return structured({
    model: AI_EXTRACT_MODEL,
    system: SYSTEM,
    user: `Extract every player listed on this football roster page.\n\n<page>\n${text}\n</page>`,
    schema: RosterSchema,
    maxTokens: 16000,
  });
}

export async function aiExtractStaff(html: string) {
  const text = pageText(html);
  if (text.length > MAX_PAGE_CHARS || text.length < 100) return null;
  return structured({
    model: AI_EXTRACT_MODEL,
    system: SYSTEM,
    user: `Extract the football coaching and recruiting staff listed on this page (skip other sports).\n\n<page>\n${text}\n</page>`,
    schema: StaffSchema,
    maxTokens: 8000,
  });
}
