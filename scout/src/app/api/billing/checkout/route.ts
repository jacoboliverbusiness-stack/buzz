import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { planById, stripePriceFor } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { appUrl, integrations } from "@/lib/env";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Create an account first.", code: "auth" }, { status: 401 });
  if (!integrations().stripe) return NextResponse.json({ error: "Billing isn't configured yet (Stripe keys missing).", code: "not_configured" }, { status: 503 });
  const body = z.object({ plan: z.string(), returnTo: z.string().startsWith("/").optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
  const plan = planById(body.data.plan);
  const price = stripePriceFor(plan);
  if (!price) return NextResponse.json({ error: `No Stripe price configured for ${plan.name}` }, { status: 503 });

  const store = getStore();
  const existing = await store.getSubscription(viewer.id);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: existing?.stripeCustomerId,
    customer_email: existing?.stripeCustomerId ? undefined : viewer.email,
    client_reference_id: viewer.id,
    subscription_data: { metadata: { ownerId: viewer.id, plan: plan.id } },
    metadata: { ownerId: viewer.id, plan: plan.id },
    allow_promotion_codes: true,
    success_url: `${appUrl()}${body.data.returnTo ?? "/campaigns"}?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
  });
  return NextResponse.json({ url: session.url });
}
