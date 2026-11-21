import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";

/**
 * Single entry point for model calls. Every call:
 *  - runs server-side only (key never reaches the browser)
 *  - returns schema-validated structured output (zod)
 *  - is priced and returned with its USD cost for the cost ledger
 *  - opts into server-side refusal fallbacks so a declined request is retried on a fallback model
 *  - caches the stable system prompt so per-coach calls in one scan reuse it
 */

/** USD per million tokens. Keep in sync with Anthropic's pricing page. */
const PRICES: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

export interface AiResult<T> {
  output: T;
  model: string;
  usd: number;
  inputTokens: number;
  outputTokens: number;
}

export class AiRefusalError extends Error {}

export async function structured<S extends z.ZodType>(opts: {
  model: string;
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<AiResult<z.infer<S>>> {
  const res = await getClient().beta.messages.parse({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
  });

  if (res.stop_reason === "refusal") throw new AiRefusalError("Model declined this request");
  if (!res.parsed_output) throw new Error(`Model output did not match schema (stop_reason=${res.stop_reason})`);

  const u = res.usage;
  const price = PRICES[res.model] ?? PRICES[opts.model] ?? PRICES["claude-opus-5-5"];
  const usd =
    ((u.input_tokens ?? 0) * price.in +
      (u.output_tokens ?? 0) * price.out +
      (u.cache_read_input_tokens ?? 0) * price.cacheRead +
      (u.cache_creation_input_tokens ?? 0) * price.cacheWrite) /
    1_000_000;

  return { output: res.parsed_output as z.infer<S>, model: res.model, usd, inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0 };
}
