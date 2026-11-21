import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { Wordmark } from "./Brand";

export async function SiteHeader() {
  const viewer = await getViewer().catch(() => null);
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
      <Wordmark />
      <nav className="flex items-center gap-1 text-[14px]">
        <Link href="/pricing" className="rounded-md px-3 py-1.5 text-mute transition hover:text-ink">Pricing</Link>
        {viewer ? (
          <Link href="/campaigns" className="rounded-md px-3 py-1.5 text-mute transition hover:text-ink">Campaigns</Link>
        ) : (
          <Link href="/signin" className="rounded-md px-3 py-1.5 text-mute transition hover:text-ink">Sign in</Link>
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-[13px] text-mute sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Recrua, Inc.</span>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink">Privacy &amp; families</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        </div>
      </div>
    </footer>
  );
}
