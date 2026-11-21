import { describe, expect, it } from "vitest";
import { extractHudlModel, mapHudlModel, parseHeight, parseHudlUrl } from "@/lib/profile/sources/hudl";
import { classifyCoachTitle, positionGroups } from "@/lib/sports/football";
import { normalizeClass, parseRosterHtml } from "@/lib/roster/parse";
import { rosterOutlook } from "@/lib/roster/outlook";
import { parseStaffHtml } from "@/lib/coaches/parse";
import { detectPattern, inferEmail } from "@/lib/coaches/infer";
import { lintEmail } from "@/lib/outreach/lint";
import { parseRobots, robotsAllows } from "@/lib/http/fetcher";
import { parseProgramSeed } from "@/lib/colleges/programs";
import { prefilter } from "@/lib/matching/score";
import fs from "node:fs";

// Synthetic page shaped like a public Hudl profile (field names match Hudl's public model).
const hudlHtml = `<html><script>window.__hudlEmbed={"data":{"pageData":{}},"model":{"user":{"firstName":"Sam","lastName":"Example","positions":"WR","graduationYear":2028,"jersey":"4","mostRelevantTeam":{"schoolName":"Example High School","schoolLocation":"Austin, TX","stateAbbreviation":"TX","sportName":"Football"}},"about":{"overview":{"organization":"Example High School","location":"Austin, TX","graduationYear":2028,"height":"6'1\\"","weight":180,"teams":[{"positions":["WR","DB"],"sportName":"Football"}]},"strengthAndSpeed":{"forty":"4.62","fortyVerified":true,"vertical":null},"academic":null},"highlights":{"reels":[{"title":"Junior Highlights","videoUrl":"/video/3/1/abc","season":2026,"durationMs":120000,"isDraft":false}]}}};</script></html>`;

describe("hudl extraction", () => {
  it("parses profile and video URLs", () => {
    expect(parseHudlUrl("hudl.com/profile/12345678/sam-example")?.profileId).toBe("12345678");
    expect(parseHudlUrl("https://www.hudl.com/video/3/12345678/abc")?.profileId).toBe("12345678");
    expect(parseHudlUrl("https://evil.com/profile/123456")).toBeNull();
  });
  it("maps the public model without inventing anything", () => {
    const m = extractHudlModel(hudlHtml)!;
    const r = mapHudlModel(m, "https://www.hudl.com/profile/1", "1");
    expect(r.profile).toMatchObject({ firstName: "Sam", sport: "football", gradYear: 2028, state: "TX", heightIn: 73, weightLb: 180 });
    expect(r.profile.positions).toEqual(["WR", "DB"]);
    expect(r.profile.measurables).toEqual([{ label: "40-yard dash", value: "4.62", verified: true, source: "hudl" }]);
    expect(r.profile.film?.[0].url).toBe("https://www.hudl.com/video/3/1/abc");
    expect(r.profile.stats).toBeUndefined();
  });
  it("parses heights", () => {
    expect(parseHeight(`6'1"`)).toBe(73);
    expect(parseHeight("5-11")).toBe(71);
    expect(parseHeight("")).toBeUndefined();
  });
});

describe("football knowledge", () => {
  it("normalises positions", () => {
    expect(positionGroups("OLB/DE")).toEqual(["LB", "DL"]);
    expect(positionGroups("Wide Receiver")).toEqual(["WR"]);
    expect(positionGroups("XYZ")).toEqual([]);
  });
  it("classifies coach titles", () => {
    expect(classifyCoachTitle("Wide Receivers Coach")).toMatchObject({ role: "position", groups: ["WR"] });
    expect(classifyCoachTitle("Head Coach")).toMatchObject({ role: "head" });
    expect(classifyCoachTitle("Recruiting Coordinator / Tight Ends")).toMatchObject({ role: "recruiting" });
    expect(classifyCoachTitle("Director of Strength & Conditioning").excluded).toBe(true);
    expect(classifyCoachTitle("Defensive Coordinator").groups).toEqual(["DL", "LB", "DB"]);
  });
});

const rosterHtml = `<title>2026 Football Roster</title><table><thead><tr><th>No.</th><th>Name</th><th>Pos.</th><th>Ht.</th><th>Wt.</th><th>Cl.</th></tr></thead><tbody>
${["Sr.", "Sr.", "Gr.", "Jr.", "So.", "Fr.", "R-Fr."].map((c, i) => `<tr><td>${i}</td><td>Player ${i}</td><td>WR</td><td>6-${i}</td><td>18${i}</td><td>${c}</td></tr>`).join("")}
${Array.from({ length: 12 }, (_, i) => `<tr><td>${i + 20}</td><td>Lineman ${i}</td><td>OL</td><td>6-4</td><td>300</td><td>Jr.</td></tr>`).join("")}
</tbody></table>`;

describe("rosters", () => {
  it("normalises class years", () => {
    expect(normalizeClass("R-Fr.")).toBe("RS-FR");
    expect(normalizeClass("Graduate")).toBe("GR");
    expect(normalizeClass("Sophomore")).toBe("SO");
  });
  it("parses roster tables and projects departures", () => {
    const r = parseRosterHtml(rosterHtml, positionGroups);
    expect(r.season).toBe(2026);
    expect(r.players).toHaveLength(19);
    const snap = { programId: "p", season: 2026, sourceUrl: "https://x.edu/roster", fetchedAt: "", players: r.players };
    // Class of 2027 arrives fall 2027: SR + GR leave (3 of 7).
    expect(rosterOutlook(snap, "WR", 2027, "wide receivers")).toMatchObject({ departingBeforeArrival: 3, onRoster: 7, signal: "strong" });
    // Class of 2028: JR also gone (4 of 7).
    expect(rosterOutlook(snap, "WR", 2028, "wide receivers").departingBeforeArrival).toBe(4);
  });
});

describe("coaches", () => {
  const staffHtml = `<table><thead><tr><th>Name</th><th>Title</th><th>Email</th></tr></thead><tbody>
  <tr><td>Alex Smith</td><td>Head Coach</td><td><a href="mailto:asmith@x.edu">Email</a></td></tr>
  <tr><td>Jordan Lee</td><td>Wide Receivers</td><td><a href="mailto:jlee@x.edu">Email</a></td></tr>
  <tr><td>Chris Diaz</td><td>Offensive Line</td><td><a href="mailto:cdiaz@x.edu">Email</a></td></tr>
  <tr><td>Pat Kim</td><td>Recruiting Coordinator</td><td></td></tr></tbody></table>`;
  it("parses published emails and infers only with a clear pattern", () => {
    const staff = parseStaffHtml(staffHtml);
    expect(staff).toHaveLength(4);
    const pat = detectPattern(staff)!;
    expect(pat).toMatchObject({ pattern: "flast", domain: "x.edu" });
    expect(inferEmail("Pat Kim", pat.pattern, pat.domain)).toBe("pkim@x.edu");
    expect(detectPattern(staff.slice(0, 2))).toBeNull();
  });
});

describe("email guardrails", () => {
  const facts = ["Height: 6'1\"", "Stat (2026): Receiving yards 742"];
  it("rejects numbers that aren't verified facts", () => {
    expect(lintEmail("x", "I had 900 receiving yards and ran a 4.4. " + "word ".repeat(60), facts).some((i) => i.includes('"900"'))).toBe(true);
  });
  it("rejects hype and invented attachment", () => {
    const issues = lintEmail("x", "It has always been my dream school with a storied program! " + "word ".repeat(60), facts);
    expect(issues).toEqual(expect.arrayContaining(["invented personal attachment", "flattery", "exclamation point"]));
  });
});

describe("robots.txt", () => {
  it("honours disallow and allow specificity", () => {
    const r = parseRobots("User-agent: *\nDisallow: /admin/\nAllow: /admin/public\n");
    expect(robotsAllows(r, "/admin/x")).toBe(false);
    expect(robotsAllows(r, "/admin/public/a")).toBe(true);
    expect(robotsAllows(r, "/sports/football/roster")).toBe(true);
  });
});

describe("matching", () => {
  const programs = parseProgramSeed(fs.readFileSync("data/programs.football.psv", "utf8"), "football");
  const athlete = { firstName: "Sam", lastName: "E", sport: "football", positions: ["WR"], gradYear: 2028, state: "OR", stats: [], measurables: [], achievements: [], film: [], provenance: {} } as never;
  it("loads the seed catalogue", () => expect(programs.length).toBeGreaterThan(300));
  it("respects division and region preferences and explains itself", () => {
    const c = prefilter(programs, athlete, { divisions: ["D3"], states: [], regions: ["Midwest"], academicPriority: "any" });
    expect(c.length).toBeGreaterThan(5);
    expect(c.every((x) => x.program.division === "D3")).toBe(true);
    expect(c[0].reasons.length).toBeGreaterThan(0);
  });
});
