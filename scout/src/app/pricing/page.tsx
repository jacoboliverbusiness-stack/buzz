import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { plans } from "@/lib/billing/plans";

export const metadata = { title: "Pricing" };

export default function Pricing() {
  const all = plans();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <h1 className="max-w-2xl text-[36px] font-semibold leading-tight tracking-[-0.035em] sm:text-[48px]">Simple monthly plans. Cancel anytime.</h1>
        <p className="mt-4 max-w-xl text-[16px] text-mute">Your first campaign preview is free — no account needed.</p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border hairline bg-line md:grid-cols-3">
          {all.map((p) => (
            <div key={p.id} className="flex flex-col bg-paper p-7">
              <h2 className="text-[16px] font-medium">{p.name}</h2>
              <p className="mt-3"><span className="text-[36px] font-semibold tracking-[-0.03em]">${p.priceMonthlyUsd}</span>{p.priceMonthlyUsd > 0 && <span className="text-mute">/mo</span>}</p>
              <ul className="mt-6 space-y-2 text-[14px] text-mute">
                {(p.features.length ? p.features : [`${p.limits.matchesPerScan} college matches`, "Coach names and titles", `${p.limits.visibleEmailDrafts} full email drafts`]).map((f) => (
                  <li key={f}>— {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-faint">Managed sending, follow-ups and the reply inbox roll out to Pro after launch. Nothing is ever sent without your approval.</p>
      </main>
      <SiteFooter />
    </>
  );
}
