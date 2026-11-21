import Link from "next/link";
import { LinkInput } from "@/components/LinkInput";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { plans } from "@/lib/billing/plans";
import { BRAND } from "@/lib/brand";

const STEPS = [
  ["Reads your profile", "Position, class, school, size, measurables and film from your public Hudl page. You confirm it in one screen."],
  ["Finds programs that fit", "Every NCAA, NAIA and junior college football program in our catalogue, filtered to the levels and places you care about."],
  ["Reads their rosters", "Counts who's at your position and who's in classes that leave before you'd arrive."],
  ["Finds the right coaches", "Your position coach, the recruiting coordinator, the head coach — from each school's official staff page."],
  ["Checks every address", "Only addresses published by the school, checked that they still accept mail."],
  ["Writes each email", "A short note in your voice, built from your real profile and that program's situation. You edit and approve."],
];

const PRINCIPLES = [
  ["Nothing invented", "Every stat in an email comes from your profile or from you. If it isn't verified, it isn't written."],
  ["Projections, not promises", "Roster openings are estimates from public class years. We say so, every time, and never call them offers."],
  ["You stay in control", "Scout drafts. You approve. Nothing is sent on your behalf without your say-so."],
];

export default function Home() {
  const paid = plans().filter((p) => p.priceMonthlyUsd > 0);
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="rise mb-6 inline-flex items-center gap-2 rounded-full border hairline px-3 py-1 text-[12px] text-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" /> Autonomous recruiting agent for high school football
            </p>
            <h1 className="rise text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[72px]" style={{ animationDelay: "60ms" }}>
              Your recruiting starts with a link.
            </h1>
            <p className="rise mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-mute sm:text-[19px]" style={{ animationDelay: "120ms" }}>
              Paste your Hudl profile. Scout finds colleges that fit you, connects you with the right coaches, and handles your recruiting outreach.
            </p>
          </div>
          <div className="rise mx-auto mt-10 max-w-2xl" style={{ animationDelay: "180ms" }}>
            <LinkInput autoFocus />
          </div>
        </section>

        {/* What happens */}
        <section className="border-t hairline">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1.4fr] md:py-28">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">What happens next</p>
              <h2 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">The work you&apos;d do over a month, in about a minute.</h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-mute">
                Research hundreds of programs, figure out who&apos;s recruiting your position, find the right coach, find their email, write to each of them. Scout does it while you watch.
              </p>
            </div>
            <ol className="border-t hairline">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[3rem_1fr] gap-2 border-b hairline py-5">
                  <span className="font-mono text-[12px] tabular text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[16px] font-medium tracking-[-0.01em]">{title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-mute">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section className="border-t hairline bg-wash">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-24">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">How Scout works for families</p>
            <div className="mt-8 grid gap-px overflow-hidden rounded-xl border hairline bg-line md:grid-cols-3">
              {PRINCIPLES.map(([t, b]) => (
                <div key={t} className="bg-paper p-7">
                  <h3 className="text-[17px] font-medium tracking-[-0.01em]">{t}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-mute">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t hairline">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1.4fr] md:py-24">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">Pricing</p>
              <h2 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em]">See your matches free. Subscribe when you&apos;re ready to reach out.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {paid.map((p) => (
                <div key={p.id} className="rounded-xl border hairline p-6">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[16px] font-medium">{p.name}</h3>
                    <span className="text-[15px]"><span className="text-[26px] font-semibold tracking-[-0.03em]">${p.priceMonthlyUsd}</span><span className="text-mute">/mo</span></span>
                  </div>
                  <ul className="mt-5 space-y-2 text-[14px] text-mute">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2"><span className="text-ink">—</span>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <Link href="/pricing" className="text-[14px] text-mute underline decoration-line underline-offset-4 hover:text-ink sm:col-span-2">Compare plans</Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t hairline">
          <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
            <h2 className="text-[34px] font-semibold tracking-[-0.035em] sm:text-[44px]">{BRAND.tagline}</h2>
            <div className="mt-8 text-left"><LinkInput compact /></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
