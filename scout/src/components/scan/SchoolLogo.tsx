"use client";

import { useState } from "react";
import type { Program } from "@/lib/types";

/** School mark from the program's own site icon; falls back to a monogram. */
export function SchoolLogo({ program, size = 36 }: { program: Pick<Program, "school" | "athleticsUrl">; size?: number }) {
  const [failed, setFailed] = useState(false);
  const host = new URL(program.athleticsUrl).hostname;
  const initials = program.school
    .replace(/^(University of|The)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-lg border hairline bg-paper" style={{ width: size, height: size }}>
      {failed ? (
        <span className="text-[11px] font-semibold tracking-tight text-mute">{initials}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" width={size - 12} height={size - 12} onError={() => setFailed(true)} loading="lazy" />
      )}
    </span>
  );
}
