import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-14 text-[15px] leading-relaxed text-mute sm:px-8">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-ink">Terms</h1>
        <p className="mt-6">Draft terms pending legal review. Scout provides research and drafting tools. College matches and roster projections are estimates from public information, not offers, evaluations, or guarantees of recruitment.</p>
      </main>
      <SiteFooter />
    </>
  );
}
