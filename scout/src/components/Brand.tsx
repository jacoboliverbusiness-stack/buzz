import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label={BRAND.full}>
      <Image src="/scout-mark.png" alt="" width={size} height={size} priority className="shrink-0" />
      <span className="flex items-baseline gap-1.5">
        <span className="text-[17px] font-semibold tracking-[-0.02em]">{BRAND.product}</span>
        <span className="text-[12px] text-mute">by {BRAND.company}</span>
      </span>
    </Link>
  );
}
