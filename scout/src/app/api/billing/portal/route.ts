import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { appUrl } from "@/lib/env";
import { getStore } from "@/lib/store";

export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sub = await getStore().getSubscription(viewer.id);
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: "No subscription" }, { status: 404 });
  const s = await getStripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl()}/campaigns` });
  return NextResponse.json({ url: s.url });
}
