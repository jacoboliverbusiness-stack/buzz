import { NextResponse } from "next/server";
import { clearDevSession, supabaseServer } from "@/lib/auth/session";
import { integrations } from "@/lib/env";

export async function POST() {
  if (integrations().supabase) await (await supabaseServer()).auth.signOut();
  else await clearDevSession();
  return NextResponse.json({ ok: true });
}
