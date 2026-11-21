import { z } from "zod";

/**
 * Core domain model. Every athlete-facing fact carries provenance so the UI and
 * the email writer can tell the difference between "extracted from Hudl",
 * "entered by the athlete", and "missing". Nothing here is ever inferred.
 */

export const Division = z.enum(["FBS", "FCS", "D2", "D3", "NAIA", "NJCAA", "CCCAA"]);
export type Division = z.infer<typeof Division>;

export const DIVISION_LABEL: Record<Division, string> = {
  FBS: "NCAA D1 FBS",
  FCS: "NCAA D1 FCS",
  D2: "NCAA D2",
  D3: "NCAA D3",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
  CCCAA: "CCCAA",
};

export const SportId = z.enum(["football", "basketball", "volleyball"]);
export type SportId = z.infer<typeof SportId>;

export const FactSource = z.enum(["hudl", "athlete", "maxpreps", "sportsrecruits", "ncsa", "website"]);
export type FactSource = z.infer<typeof FactSource>;

export const StatLine = z.object({
  label: z.string(),
  value: z.string(),
  season: z.number().int().optional(),
  verified: z.boolean().default(false),
  source: FactSource,
});
export type StatLine = z.infer<typeof StatLine>;

export const Film = z.object({
  title: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  season: z.number().int().optional(),
  durationSec: z.number().optional(),
});
export type Film = z.infer<typeof Film>;

export const AthleteProfile = z.object({
  sourceUrl: z.string().url().optional(),
  sourceKind: FactSource.optional(),
  sourceId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().default(""),
  sport: SportId,
  /** Normalised position codes for the sport (e.g. "WR", "OLB"). */
  positions: z.array(z.string()).default([]),
  gradYear: z.number().int().min(2024).max(2040).optional(),
  highSchool: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  heightIn: z.number().int().min(48).max(96).optional(),
  weightLb: z.number().int().min(80).max(450).optional(),
  jersey: z.string().optional(),
  stats: z.array(StatLine).default([]),
  measurables: z.array(StatLine).default([]),
  achievements: z.array(z.string()).default([]),
  gpa: z.number().min(0).max(5).optional(),
  testScores: z.string().optional(),
  intendedMajor: z.string().optional(),
  film: z.array(Film).default([]),
  commitment: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  twitter: z.string().optional(),
  /** Which fields came from where — used for the confirm screen. */
  provenance: z.record(z.string(), FactSource).default({}),
});
export type AthleteProfile = z.infer<typeof AthleteProfile>;

export const Preferences = z.object({
  divisions: z.array(Division).default([]),
  /** Two-letter state codes; empty = anywhere. */
  states: z.array(z.string().length(2)).default([]),
  regions: z.array(z.string()).default([]),
  maxDistanceMiles: z.number().int().positive().optional(),
  academicPriority: z.enum(["any", "strong", "top"]).default("any"),
  notes: z.string().max(500).optional(),
});
export type Preferences = z.infer<typeof Preferences>;

export const Program = z.object({
  id: z.string(),
  school: z.string(),
  shortName: z.string().optional(),
  nickname: z.string().optional(),
  sport: SportId,
  division: Division,
  conference: z.string().optional(),
  city: z.string(),
  state: z.string().length(2),
  /** Official athletics website (base URL). */
  athleticsUrl: z.string().url(),
  /** Path overrides when a site doesn't follow the common layout. */
  rosterPath: z.string().optional(),
  staffPath: z.string().optional(),
  /** Admissions selectivity band, only when backed by a licensed dataset. */
  academicTier: z.enum(["top", "strong", "standard"]).optional(),
  verifiedAt: z.string().optional(),
});
export type Program = z.infer<typeof Program>;

export const RosterPlayer = z.object({
  name: z.string(),
  position: z.string(),
  positionGroup: z.string(),
  classYear: z.enum(["FR", "SO", "JR", "SR", "GR", "RS-FR", "RS-SO", "RS-JR", "RS-SR", "UNK"]),
  heightIn: z.number().optional(),
  weightLb: z.number().optional(),
  hometownState: z.string().optional(),
});
export type RosterPlayer = z.infer<typeof RosterPlayer>;

export const RosterSnapshot = z.object({
  programId: z.string(),
  season: z.number().int(),
  sourceUrl: z.string().url(),
  fetchedAt: z.string(),
  players: z.array(RosterPlayer),
});
export type RosterSnapshot = z.infer<typeof RosterSnapshot>;

export const RosterOutlook = z.object({
  positionGroup: z.string(),
  onRoster: z.number().int(),
  /** Seniors + grad students at the group: leave before the athlete's class arrives. */
  departingBeforeArrival: z.number().int(),
  /** Players still enrolled when the athlete would arrive. */
  remainingAtArrival: z.number().int(),
  signal: z.enum(["strong", "moderate", "low", "unknown"]),
  explanation: z.string(),
  sourceUrl: z.string().url().optional(),
});
export type RosterOutlook = z.infer<typeof RosterOutlook>;

export const VerificationStatus = z.enum(["verified", "accept_all", "unverified", "invalid", "unknown"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const Coach = z.object({
  id: z.string(),
  programId: z.string(),
  name: z.string(),
  title: z.string(),
  role: z.enum(["head", "coordinator", "recruiting", "position", "assistant", "other"]),
  /** Position groups this coach is responsible for, derived from their title. */
  positionGroups: z.array(z.string()).default([]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  verification: VerificationStatus.default("unknown"),
  verificationDetail: z.string().optional(),
  sourceUrl: z.string().url(),
  lastVerifiedAt: z.string(),
  demo: z.boolean().default(false),
});
export type Coach = z.infer<typeof Coach>;

export const MatchReason = z.object({
  kind: z.enum(["division", "geography", "roster", "measurables", "academics", "preference", "level"]),
  text: z.string(),
  weight: z.number(),
});
export type MatchReason = z.infer<typeof MatchReason>;

export const Match = z.object({
  program: Program,
  score: z.number(),
  reasons: z.array(MatchReason),
  outlook: RosterOutlook.optional(),
  distanceMiles: z.number().optional(),
  coaches: z.array(Coach).default([]),
});
export type Match = z.infer<typeof Match>;

export const EmailDraft = z.object({
  id: z.string(),
  programId: z.string(),
  coachId: z.string(),
  subject: z.string(),
  body: z.string(),
  /** The grounded facts the writer was allowed to use. */
  facts: z.array(z.string()),
  status: z.enum(["draft", "edited", "approved"]).default("draft"),
  generator: z.enum(["ai", "grounded-template"]),
  model: z.string().optional(),
  warnings: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type EmailDraft = z.infer<typeof EmailDraft>;

export const ScanStatus = z.enum(["extracted", "running", "complete", "failed"]);

export const Scan = z.object({
  id: z.string(),
  ownerId: z.string().optional(),
  /** Opaque secret that lets an anonymous visitor reach their own scan before signing up. */
  accessToken: z.string(),
  createdAt: z.string(),
  status: ScanStatus,
  mode: z.enum(["live", "demo"]),
  profile: AthleteProfile,
  missing: z.array(z.string()).default([]),
  preferences: Preferences.default({}),
  matches: z.array(Match).default([]),
  emails: z.array(EmailDraft).default([]),
  events: z.array(z.lazy(() => PipelineEvent)).default([]),
  costUsd: z.number().default(0),
  error: z.string().optional(),
});
export type Scan = z.infer<typeof Scan>;

export const PipelineStep = z.enum([
  "profile",
  "opportunities",
  "programs",
  "rosters",
  "coaches",
  "verify",
  "emails",
]);
export type PipelineStep = z.infer<typeof PipelineStep>;

export const PipelineEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), step: PipelineStep, state: z.enum(["start", "done"]), detail: z.string().optional(), at: z.string() }),
  z.object({ type: z.literal("match"), match: Match, at: z.string() }),
  z.object({ type: z.literal("outlook"), programId: z.string(), outlook: RosterOutlook, at: z.string() }),
  z.object({ type: z.literal("coaches"), programId: z.string(), coaches: z.array(Coach), at: z.string() }),
  z.object({ type: z.literal("email"), email: EmailDraft, at: z.string() }),
  z.object({ type: z.literal("note"), level: z.enum(["info", "warn"]), text: z.string(), at: z.string() }),
  z.object({ type: z.literal("done"), at: z.string() }),
  z.object({ type: z.literal("error"), message: z.string(), at: z.string() }),
]);
export type PipelineEvent = z.infer<typeof PipelineEvent>;
