import * as cheerio from "cheerio";
import { parseHeight, parseWeight } from "@/lib/profile/sources/hudl";
import type { RosterPlayer } from "@/lib/types";

/**
 * Deterministic roster parsing for the page layouts most college athletics sites use
 * (Sidearm list + table views, PrestoSports and WMT tables). When these fail the
 * pipeline may fall back to an AI extraction of the same public page (see ai/extract.ts).
 */

type GroupFn = (raw: string) => string[];

export function normalizeClass(raw: string | undefined | null): RosterPlayer["classYear"] {
  if (!raw) return "UNK";
  const s = raw.toLowerCase().replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
  const rs = /\b(r|rs|redshirt|r-)\s?-?\s?(fr|so|jr|sr|freshman|sophomore|junior|senior)/.test(s) || /^r(fr|so|jr|sr)\b/.test(s.replace(/[\s-]/g, ""));
  const base = /\b(gr|grad|graduate|5th|fifth|6th)\b/.test(s)
    ? "GR"
    : /(fr|freshman|first)/.test(s)
      ? "FR"
      : /(so|sophomore|second)/.test(s)
        ? "SO"
        : /(jr|junior|third)/.test(s)
          ? "JR"
          : /(sr|senior|fourth)/.test(s)
            ? "SR"
            : null;
  if (!base) return "UNK";
  if (base === "GR") return "GR";
  return (rs ? `RS-${base}` : base) as RosterPlayer["classYear"];
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function fromSidearmList($: cheerio.CheerioAPI, groups: GroupFn): RosterPlayer[] {
  const out: RosterPlayer[] = [];
  $("li.sidearm-roster-player, .sidearm-roster-player").each((_, el) => {
    const $el = $(el);
    const name = clean($el.find(".sidearm-roster-player-name h3, .sidearm-roster-player-name a").first().text());
    const pos = clean($el.find(".sidearm-roster-player-position .text-bold, .sidearm-roster-player-position-long-short, .sidearm-roster-player-position span").first().text() || $el.find(".sidearm-roster-player-position").first().text());
    const cls = clean($el.find(".sidearm-roster-player-academic-year").first().text());
    if (!name || !pos) return;
    out.push({
      name,
      position: pos,
      positionGroup: groups(pos)[0] ?? "UNK",
      classYear: normalizeClass(cls),
      heightIn: parseHeight(clean($el.find(".sidearm-roster-player-height").first().text())),
      weightLb: parseWeight(clean($el.find(".sidearm-roster-player-weight").first().text())),
      hometownState: clean($el.find(".sidearm-roster-player-hometown").first().text()).match(/,\s*([A-Z]{2})\b|\b([A-Z][a-z]+\.)$/)?.[1],
    });
  });
  return out;
}

function fromNuxtCards($: cheerio.CheerioAPI, groups: GroupFn): RosterPlayer[] {
  const out: RosterPlayer[] = [];
  $(".s-person-card").each((_, el) => {
    const $el = $(el);
    const name = clean($el.find(".s-person-details__personal-single-line, h3").first().text());
    const statText = $el
      .find("[data-test-id*='bio-stats'], .s-person-details__bio-stats-item")
      .map((__, s) => clean($(s).text()))
      .get();
    const pos = statText.find((t) => /^position/i.test(t))?.replace(/^position\s*/i, "") ?? statText[0] ?? "";
    const cls = statText.find((t) => /^(academic year|class|year)/i.test(t))?.replace(/^(academic year|class|year)\s*/i, "");
    const ht = statText.find((t) => /^height/i.test(t))?.replace(/^height\s*/i, "");
    const wt = statText.find((t) => /^weight/i.test(t))?.replace(/^weight\s*/i, "");
    if (!name || !pos) return;
    out.push({
      name,
      position: pos,
      positionGroup: groups(pos)[0] ?? "UNK",
      classYear: normalizeClass(cls),
      heightIn: parseHeight(ht),
      weightLb: parseWeight(wt),
    });
  });
  return out;
}

function fromTables($: cheerio.CheerioAPI, groups: GroupFn): RosterPlayer[] {
  let best: RosterPlayer[] = [];
  $("table").each((_, table) => {
    const headers = $(table)
      .find("thead th, tr:first-child th")
      .map((__, th) => clean($(th).text()).toLowerCase())
      .get();
    if (!headers.length) return;
    const idx = (re: RegExp) => headers.findIndex((h) => re.test(h));
    const iName = idx(/^(full )?name|player/);
    const iPos = idx(/^pos/);
    const iCls = idx(/^(cl|class|yr|year|academic|elig)/);
    const iHt = idx(/^(ht|height)/);
    const iWt = idx(/^(wt|weight)/);
    if (iName < 0 || iPos < 0) return;
    const rows: RosterPlayer[] = [];
    $(table)
      .find("tbody tr")
      .each((__, tr) => {
        const cells = $(tr)
          .find("td, th")
          .map((___, td) => clean($(td).text()))
          .get();
        const name = cells[iName];
        const pos = cells[iPos];
        if (!name || !pos) return;
        rows.push({
          name,
          position: pos,
          positionGroup: groups(pos)[0] ?? "UNK",
          classYear: normalizeClass(iCls >= 0 ? cells[iCls] : undefined),
          heightIn: iHt >= 0 ? parseHeight(cells[iHt]) : undefined,
          weightLb: iWt >= 0 ? parseWeight(cells[iWt]) : undefined,
        });
      });
    if (rows.length > best.length) best = rows;
  });
  return best;
}

export function parseRosterHtml(html: string, groups: GroupFn): { players: RosterPlayer[]; season?: number; method: string } {
  const $ = cheerio.load(html);
  const title = clean($("title").text()) + " " + clean($("h1, h2").first().text());
  const seasonMatch = title.match(/\b(20\d{2})(?:[-–](?:20)?\d{2})?\b/);
  const season = seasonMatch ? Number(seasonMatch[1]) : undefined;

  const candidates: Array<[string, RosterPlayer[]]> = [
    ["sidearm-list", fromSidearmList($, groups)],
    ["nuxt-cards", fromNuxtCards($, groups)],
    ["table", fromTables($, groups)],
  ];
  // Prefer the parse that recovers class years for the most players.
  candidates.sort((a, b) => score(b[1]) - score(a[1]));
  const [method, players] = candidates[0];
  const dedup = new Map<string, RosterPlayer>();
  for (const p of players) dedup.set(p.name.toLowerCase() + "|" + p.position, p);
  return { players: [...dedup.values()], season, method };
}

function score(players: RosterPlayer[]): number {
  return players.length + players.filter((p) => p.classYear !== "UNK").length * 2;
}
