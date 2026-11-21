import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { getStore, type Subscription } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Stripe is the source of truth for plan status; this keeps our copy in sync. */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("not configured", { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  const store = getStore();

  const sync = async (sub: Stripe.Subscription) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const ownerId = (sub.metadata?.ownerId as string | undefined) ?? (await store.findOwnerByCustomer(customerId));
    if (!ownerId) return;
    const status = (["active", "trialing", "past_due", "canceled"].includes(sub.status) ? sub.status : "none") as Subscription["status"];
    const periodEnd = sub.items.data[0]?.current_period_end;
    await store.saveSubscription({
      ownerId,
      plan: (sub.metadata?.plan as string | undefined) ?? "starter",
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
    });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.subscription) await sync(await getStripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await sync(event.data.object);
      break;
  }
  return new Response("ok");
}
