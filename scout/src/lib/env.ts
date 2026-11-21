import "server-only";

/**
 * Integration status, read once per request. The app degrades in clearly-labelled
 * steps rather than faking anything:
 *  - live web research needs outbound access to athletics sites (always on in prod)
 *  - AI-written emails need ANTHROPIC_API_KEY; without it a grounded template writer is used
 *  - accounts need Supabase; billing needs Stripe; sending stays disabled in the MVP
 *  - SCOUT_DEMO_MODE=1 swaps live coach/roster research for labelled sample data
 */
export function integrations() {
  return {
    demoMode: process.env.SCOUT_DEMO_MODE === "1",
    ai: !!process.env.ANTHROPIC_API_KEY,
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseAdmin: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    emailVerifier: !!process.env.ZEROBOUNCE_API_KEY,
    sending: false as const,
  };
}

export const AI_MODEL = process.env.SCOUT_AI_MODEL ?? "claude-opus-5-5";
/** Cheaper model used only for fallback page extraction (rosters/staff that the parsers can't read). */
export const AI_EXTRACT_MODEL = process.env.SCOUT_AI_EXTRACT_MODEL ?? "claude-haiku-5-5";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
