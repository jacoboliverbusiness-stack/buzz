"use client";

import { useMemo, useState } from "react";
import type { PresentedScan } from "@/lib/present";
import { REGIONS } from "@/lib/colleges/geo";
import type { AthleteProfile, Division, Preferences, StatLine } from "@/lib/types";
import { DIVISION_LABEL } from "@/lib/types";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const DIVISIONS: Division[] = ["FBS", "FCS", "D2", "D3", "NAIA", "NJCAA"];
const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "LS", "ATH"];
const thisYear = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 6 }, (_, i) => thisYear + i);

function Tag({ source }: { source?: string }) {
  if (!source) return null;
  return (
    <span className={`ml-2 rounded px-1.5 py-px font-mono text-[10px] uppercase tracking-wider ${source === "hudl" ? "bg-wash text-mute" : "bg-ink text-paper"}`}>
      {source === "hudl" ? "Hudl" : "You"}
    </span>
  );
}

function Field({ label, source, missing, children, hint }: { label: string; source?: string; missing?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center text-[12px] font-medium text-mute">
        {label}
        <Tag source={source} />
        {missing && <span className="ml-2 text-signal">Needed</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

const input = "h-11 w-full rounded-lg border hairline bg-paper px-3 text-[15px] outline-none transition focus:border-ink";

export function ConfirmStep({ scan, onRun, busy, error }: { scan: PresentedScan; onRun: (p: AthleteProfile, prefs: Preferences) => void; busy: boolean; error: string | null }) {
  const src = scan.profile.provenance ?? {};
  const [p, setP] = useState<AthleteProfile>({ ...scan.profile });
  const [prefs, setPrefs] = useState<Preferences>({ ...scan.preferences, divisions: scan.preferences.divisions ?? [], states: scan.preferences.states ?? [], regions: scan.preferences.regions ?? [] });
  const [showMore, setShowMore] = useState(scan.profile.sourceKind !== "hudl");
  const missing = new Set(scan.missing);
  const set = <K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K]) => setP((x) => ({ ...x, [k]: v }));

  const fromHudl = scan.profile.sourceKind === "hudl";
  const ready = !!(p.firstName && p.lastName && p.positions.length && p.gradYear && p.state && p.highSchool);
  const hudlFacts = useMemo(
    () => [
      p.film.length ? `${p.film.length} highlight ${p.film.length === 1 ? "reel" : "reels"}` : null,
      p.measurables.length ? `${p.measurables.length} measurables` : null,
      p.heightIn ? "height" : null,
      p.weightLb ? "weight" : null,
    ].filter(Boolean),
    [p],
  );

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint">Step 1 of 2 · Confirm</p>
      <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[38px]">
        {fromHudl && scan.profile.firstName ? `Is this you, ${scan.profile.firstName}?` : "Tell us the essentials."}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mute">
        {fromHudl
          ? `We read your public Hudl profile${hudlFacts.length ? ` and found ${hudlFacts.join(", ")}` : ""}. Check it, fill anything marked needed, and we'll build your campaign.`
          : "Just the basics — it takes under a minute. You can add stats and film later."}
      </p>

      {scan.events.length === 0 && scan.status === "failed" && scan.error && <p className="mt-4 text-[14px] text-signal">{scan.error}</p>}

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <Field label="First name" source={src.firstName} missing={missing.has("firstName") && !p.firstName}>
          <input className={input} value={p.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name" source={src.lastName} missing={missing.has("lastName") && !p.lastName}>
          <input className={input} value={p.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Position" source={src.positions} missing={missing.has("positions") && !p.positions.length} hint="Pick your primary position first.">
          <div className="flex flex-wrap gap-1.5">
            {POSITIONS.map((pos) => {
              const on = p.positions.map((x) => x.toUpperCase()).includes(pos);
              return (
                <button key={pos} type="button" onClick={() => set("positions", on ? p.positions.filter((x) => x.toUpperCase() !== pos) : [...p.positions, pos])} className={`h-9 min-w-11 rounded-md border px-2.5 font-mono text-[12px] transition ${on ? "border-ink bg-ink text-paper" : "hairline text-mute hover:border-ink hover:text-ink"}`}>
                  {pos}
                </button>
              );
            })}
            {p.positions.filter((x) => !POSITIONS.includes(x.toUpperCase())).map((x) => (
              <span key={x} className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-2.5 font-mono text-[12px] text-paper">{x}</span>
            ))}
          </div>
        </Field>
        <Field label="Graduation year" source={src.gradYear} missing={missing.has("gradYear") && !p.gradYear}>
          <select className={input} value={p.gradYear ?? ""} onChange={(e) => set("gradYear", e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Select</option>
            {GRAD_YEARS.map((y) => <option key={y} value={y}>Class of {y}</option>)}
          </select>
        </Field>
        <Field label="High school" source={src.highSchool} missing={missing.has("highSchool") && !p.highSchool}>
          <input className={input} value={p.highSchool ?? ""} onChange={(e) => set("highSchool", e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="City" source={src.city}>
            <input className={input} value={p.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State" source={src.state} missing={missing.has("state") && !p.state}>
            <select className={input} value={p.state ?? ""} onChange={(e) => set("state", e.target.value || undefined)}>
              <option value="">—</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Height" source={src.heightIn} hint="Optional">
          <div className="flex gap-2">
            <select className={input} value={p.heightIn ? Math.floor(p.heightIn / 12) : ""} onChange={(e) => set("heightIn", e.target.value ? Number(e.target.value) * 12 + ((p.heightIn ?? 0) % 12) : undefined)}>
              <option value="">ft</option>
              {[4, 5, 6, 7].map((f) => <option key={f} value={f}>{f} ft</option>)}
            </select>
            <select className={input} value={p.heightIn ? p.heightIn % 12 : ""} onChange={(e) => p.heightIn && set("heightIn", Math.floor(p.heightIn / 12) * 12 + Number(e.target.value))}>
              <option value="">in</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
            </select>
          </div>
        </Field>
        <Field label="Weight (lbs)" source={src.weightLb} hint="Optional">
          <input className={input} inputMode="numeric" value={p.weightLb ?? ""} onChange={(e) => set("weightLb", e.target.value ? Number(e.target.value.replace(/\D/g, "")) || undefined : undefined)} />
        </Field>
      </section>

      {/* Optional details */}
      <section className="mt-8 border-t hairline pt-6">
        <button type="button" onClick={() => setShowMore((s) => !s)} className="flex w-full items-center justify-between text-left">
          <span>
            <span className="text-[15px] font-medium">Stats, academics &amp; contact</span>
            <span className="ml-2 text-[13px] text-mute">Optional — makes your emails stronger</span>
          </span>
          <span className="text-mute">{showMore ? "−" : "+"}</span>
        </button>
        {showMore && <OptionalDetails p={p} set={set} />}
      </section>

      {/* Preferences */}
      <section className="mt-8 border-t hairline pt-6">
        <h2 className="text-[15px] font-medium">Where do you want to play?</h2>
        <p className="mt-1 text-[13px] text-mute">Leave everything blank and Scout builds a balanced list across levels, weighted toward home.</p>
        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-[12px] font-medium text-mute">Levels</p>
            <div className="flex flex-wrap gap-1.5">
              {DIVISIONS.map((d) => {
                const on = prefs.divisions.includes(d);
                return (
                  <button key={d} type="button" onClick={() => setPrefs((x) => ({ ...x, divisions: toggle(x.divisions, d) }))} className={`h-9 rounded-md border px-3 text-[13px] transition ${on ? "border-ink bg-ink text-paper" : "hairline text-mute hover:border-ink hover:text-ink"}`}>
                    {DIVISION_LABEL[d]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-medium text-mute">Regions</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(REGIONS).map((r) => {
                const on = prefs.regions.includes(r);
                return (
                  <button key={r} type="button" onClick={() => setPrefs((x) => ({ ...x, regions: toggle(x.regions, r) }))} className={`h-9 rounded-md border px-3 text-[13px] transition ${on ? "border-ink bg-ink text-paper" : "hairline text-mute hover:border-ink hover:text-ink"}`}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Academics">
              <select className={input} value={prefs.academicPriority} onChange={(e) => setPrefs((x) => ({ ...x, academicPriority: e.target.value as Preferences["academicPriority"] }))}>
                <option value="any">No preference</option>
                <option value="strong">Prioritize strong academics</option>
                <option value="top">Only highly selective schools</option>
              </select>
            </Field>
            <Field label="Max distance from home">
              <select className={input} value={prefs.maxDistanceMiles ?? ""} onChange={(e) => setPrefs((x) => ({ ...x, maxDistanceMiles: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">Anywhere</option>
                <option value="300">About 300 miles</option>
                <option value="600">About 600 miles</option>
                <option value="1000">About 1,000 miles</option>
              </select>
            </Field>
          </div>
          <Field label="Anything coaches should know?" hint="Optional. Used only if relevant, in your words — e.g. intended major, two-way player.">
            <input className={input} maxLength={300} value={prefs.notes ?? ""} onChange={(e) => setPrefs((x) => ({ ...x, notes: e.target.value || undefined }))} />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 mt-10 border-t hairline bg-paper/90 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-faint">
            Your details are used only to build your campaign. Under 18? Please do this with a parent or guardian. <a href="/privacy" className="underline">Privacy</a>
          </p>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => onRun({ ...p, sport: p.sport ?? "football" }, prefs)}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-6 text-[15px] font-medium text-paper transition hover:bg-ink/85 disabled:opacity-40"
          >
            {busy ? "Starting…" : "Build my campaign"} <span aria-hidden>→</span>
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-signal">{error}</p>}
      </div>
    </div>
  );
}

function OptionalDetails({ p, set }: { p: AthleteProfile; set: <K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K]) => void }) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const addStat = () => {
    if (!label.trim() || !value.trim()) return;
    const s: StatLine = { label: label.trim(), value: value.trim(), season: new Date().getFullYear(), verified: false, source: "athlete" };
    set("stats", [...p.stats, s]);
    setLabel("");
    setValue("");
  };
  return (
    <div className="mt-5 space-y-6">
      {p.measurables.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-medium text-mute">Measurables <Tag source="hudl" /></p>
          <ul className="divide-y divide-line rounded-lg border hairline text-[14px]">
            {p.measurables.map((m) => (
              <li key={m.label} className="flex justify-between px-3 py-2"><span>{m.label}</span><span className="tabular">{m.value}{m.verified && <span className="ml-2 text-[11px] text-ok">verified</span>}</span></li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-2 text-[12px] font-medium text-mute">Season stats</p>
        {p.stats.length > 0 && (
          <ul className="mb-2 divide-y divide-line rounded-lg border hairline text-[14px]">
            {p.stats.map((s, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2">
                <span>{s.label}</span>
                <span className="flex items-center gap-3 tabular">{s.value}<button type="button" className="text-faint hover:text-signal" onClick={() => set("stats", p.stats.filter((_, j) => j !== i))} aria-label="Remove">×</button></span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input className={input} placeholder="Receiving yards" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className={`${input} max-w-28`} placeholder="742" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStat())} />
          <button type="button" onClick={addStat} className="h-11 shrink-0 rounded-lg border hairline px-4 text-[14px] hover:border-ink">Add</button>
        </div>
        <p className="mt-1 text-[12px] text-faint">Only add numbers you can back up — coaches check.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="GPA">
          <input className={input} inputMode="decimal" value={p.gpa ?? ""} onChange={(e) => set("gpa", e.target.value ? Math.min(5, Number(e.target.value)) || undefined : undefined)} />
        </Field>
        <Field label="Contact email" hint="Goes in your signature">
          <input className={input} type="email" value={p.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value || undefined)} />
        </Field>
        <Field label="Phone">
          <input className={input} type="tel" value={p.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value || undefined)} />
        </Field>
      </div>
    </div>
  );
}
