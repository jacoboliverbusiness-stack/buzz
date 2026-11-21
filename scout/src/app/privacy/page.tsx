import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Privacy & families" };

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-14 text-[15px] leading-relaxed text-mute sm:px-8">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-ink">Privacy &amp; families</h1>
        <p className="mt-6">Most athletes using Scout are minors, so we keep this simple and strict. (Draft — final policy pending legal review.)</p>
        <ul className="mt-6 space-y-3">
          <li>— We only read public profile pages, and only the parts the athlete has made public. We never log in to Hudl or any other site on your behalf.</li>
          <li>— Your details are used to build your campaign and nothing else. We don&apos;t sell athlete data or share it with colleges unless you send an email.</li>
          <li>— Accounts for athletes under 18 should be created with a parent or guardian, who confirms consent at sign-up.</li>
          <li>— No email is sent on your behalf without your explicit approval.</li>
          <li>— You can delete your account and every campaign at any time.</li>
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
