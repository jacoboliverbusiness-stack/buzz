import * as cheerio from "cheerio";

/**
 * Parse coaching staff from a program's official coaches / staff-directory page.
 * Emails are only taken from what the page publishes (mailto links or plain text);
 * see infer.ts for the narrowly-scoped pattern inference and how it is labelled.
 */

export interface RawStaff {
  name: string;
  title: string;
  email?: string;
  phone?: string;
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function emailFrom($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): string | undefined {
  const href = $(el).find("a[href^='mailto:']").first().attr("href");
  if (href) {
    const e = decodeURIComponent(href.replace(/^mailto:/i, "").split("?")[0]).trim();
    if (EMAIL_RE.test(e)) return e.toLowerCase();
  }
  const m = clean($(el).text()).match(EMAIL_RE);
  return m ? m[0].toLowerCase() : undefined;
}

function looksLikeName(s: string): boolean {
  return /^[A-Z][A-Za-z'’.\-]+(\s+[A-Z][A-Za-z'’.\-]+){1,3}(\s+(Jr\.?|Sr\.?|II|III|IV))?$/.test(s);
}

export function parseStaffHtml(html: string, opts: { footballOnly?: boolean } = {}): RawStaff[] {
  const $ = cheerio.load(html);
  const out: RawStaff[] = [];

  // Sidearm "coaches" list view.
  $(".sidearm-coaches-coach, .sidearm-roster-coach").each((_, el) => {
    const name = clean($(el).find(".sidearm-coaches-coach-name, .sidearm-roster-coach-name, h3, h4").first().text());
    const title = clean($(el).find(".sidearm-coaches-coach-title, .sidearm-roster-coach-title").first().text());
    if (name && title) out.push({ name, title, email: emailFrom($, el), phone: clean($(el).find("a[href^='tel:']").first().text()) || undefined });
  });

  // Nuxt person cards.
  $(".s-person-card").each((_, el) => {
    const name = clean($(el).find(".s-person-details__personal-single-line, h3").first().text());
    const title = clean($(el).find(".s-person-details__position, .s-person-card__content__person__position").first().text());
    if (name && title) out.push({ name, title, email: emailFrom($, el) });
  });

  // Tables (Sidearm staff directory, Presto, WMT). Track section headings so a full
  // department directory can be narrowed to the football section.
  $("table").each((_, table) => {
    const headers = $(table)
      .find("thead th, tr:first-child th")
      .map((__, th) => clean($(th).text()).toLowerCase())
      .get();
    const iName = headers.findIndex((h) => /name/.test(h));
    const iTitle = headers.findIndex((h) => /title|position/.test(h));
    if (iName < 0 || iTitle < 0) return;
    let section = clean($(table).find("caption").text()) || clean($(table).prevAll("h2, h3, h4").first().text());
    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr).find("td, th");
        if (cells.length === 1 || $(tr).hasClass("sidearm-staff-category")) {
          section = clean(cells.first().text());
          return;
        }
        if ($(tr).find("th").length === cells.length) return; // header row
        const name = clean($(cells[iName]).text());
        const title = clean($(cells[iTitle]).text());
        if (!name || !title || !looksLikeName(name)) return;
        if (opts.footballOnly && section && !/football/i.test(section) && !/football/i.test(title)) return;
        out.push({ name, title, email: emailFrom($, tr), phone: clean($(tr).find("a[href^='tel:']").first().text()) || undefined });
      });
  });

  const seen = new Map<string, RawStaff>();
  for (const s of out) {
    const key = s.name.toLowerCase();
    const prev = seen.get(key);
    if (!prev || (!prev.email && s.email)) seen.set(key, s);
  }
  return [...seen.values()];
}
