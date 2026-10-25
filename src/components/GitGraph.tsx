import { useEffect, useState, useMemo } from "react";
import type { ContributionDay } from "@/types";

const NUM_WEEKS_DESKTOP = 24;
const NUM_WEEKS_MOBILE = 40;
const CELL_DESKTOP = 16;
const GAP_DESKTOP = 4;
// phone: minimal small cells, zoomed to fill width (~360px)
const CELL_MOBILE = 7;
const GAP_MOBILE = 2;

type GitGraphProps = {
  /** Contribution calendar, generated at build time by scripts/fetch-github.mjs */
  data?: ContributionDay[]
  profileUrl?: string
}

export default function GitGraph({ data = [], profileUrl = "https://github.com/rigalis" }: GitGraphProps) {
  const [numWeeks, setNumWeeks] = useState<number>(NUM_WEEKS_DESKTOP);
  const [cell, setCell] = useState<number>(CELL_DESKTOP);
  const [gap, setGap] = useState<number>(GAP_DESKTOP);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      const m = mq.matches;
      setIsMobile(m);
      setNumWeeks(m ? NUM_WEEKS_MOBILE : NUM_WEEKS_DESKTOP);
      setCell(m ? CELL_MOBILE : CELL_DESKTOP);
      setGap(m ? GAP_MOBILE : GAP_DESKTOP);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { weeks, monthLabels, total } = useMemo(() => {
    // Build the calendar on UTC calendar dates so the keys line up exactly with
    // the `YYYY-MM-DD` strings produced at build time, regardless of the
    // visitor's timezone.
    const DAY = 86_400_000;
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dow = new Date(todayUTC).getUTCDay();
    const startUTC = todayUTC - dow * DAY - (numWeeks - 1) * 7 * DAY;

    const map = new Map(data.map((d) => [d.date, d.count]));
    const all: (ContributionDay | null)[] = [];
    let sum = 0;

    for (let i = 0; i < numWeeks * 7; i++) {
      const t = startUTC + i * DAY;
      if (t > todayUTC) {
        all.push(null);
        continue;
      }
      const key = new Date(t).toISOString().slice(0, 10);
      const count = map.get(key) ?? 0;
      sum += count;
      all.push({ date: key, count });
    }

    const weeks: (ContributionDay | null)[][] = [];
    for (let w = 0; w < numWeeks; w++) weeks.push(all.slice(w * 7, w * 7 + 7));

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabels: { label: string; weekIdx: number }[] = [];
    let last = -1;
    weeks.forEach((week, wIdx) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      // Parse the month straight from the date string — no Date/local-timezone round trip.
      const m = Number(first.date.slice(5, 7)) - 1;
      if (m !== last) {
        monthLabels.push({ label: MONTHS[m], weekIdx: wIdx });
        last = m;
      }
    });

    return { weeks, monthLabels, total: sum };
  }, [data, numWeeks]);

  const bg = (c: number) => {
    const teal = "#239B8C";
    if (c === 0) return "var(--card-inner)";
    if (c === 1) return `color-mix(in srgb, ${teal} 16%, var(--card-inner))`;
    if (c === 2) return `color-mix(in srgb, ${teal} 36%, var(--card-inner))`;
    if (c === 3) return `color-mix(in srgb, ${teal} 58%, var(--card-inner))`;
    return `color-mix(in srgb, ${teal} 78%, var(--card-inner))`;
  };

  const CELL = cell;
  const GAP = gap;

  return (
    <div
      className={isMobile ? "w-full flex flex-col relative py-1" : "bento px-5 pt-5 pb-3 h-full flex flex-col relative"}
      title={`${total} contributions in the last ${numWeeks} weeks`}
    >
      <div className="flex-1 flex items-center justify-center overflow-x-auto py-1">
        <div style={{ display: "inline-flex", flexDirection: "column", gap: GAP, minWidth: "max-content" }}>
          <div style={{ display: "flex", gap: GAP }}>
            {isMobile ? (
              <div className="flex w-full justify-between text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", width: weeks.length * (CELL + GAP) - GAP }}>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            ) : (
              weeks.map((_, wIdx) => {
                const lbl = monthLabels.find((m) => m.weekIdx === wIdx);
                return (
                  <div key={wIdx} style={{ width: CELL, fontSize: 9, lineHeight: "1", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textAlign: "left", flexShrink: 0 }}>
                    {lbl ? lbl.label : ""}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
              <div key={dow} style={{ display: "flex", gap: GAP }}>
                <div style={{ display: "flex", gap: GAP }}>
                  {weeks.map((week, wIdx) => {
                    const d = week[dow];
                    if (d === null) return <div key={wIdx} style={{ width: CELL, height: CELL, flexShrink: 0, background: "transparent" }} />;
                    return (
                      <div
                        key={wIdx}
                        title={`${d.count} · ${d.date}`}
                        style={{
                          width: CELL,
                          height: CELL,
                          flexShrink: 0,
                          background: bg(d.count),
                          border: "none",
                          borderRadius: 2,
                          boxSizing: "border-box",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((c) => (
            <span key={c} className="block rounded-[2px] shrink-0" style={{ width: isMobile ? 8 : 10, height: isMobile ? 8 : 10, background: bg(c), border: "none" }} />
          ))}
          <span>More</span>
        </div>
        {profileUrl ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--foreground) 82%, var(--background))", border: "1px solid color-mix(in srgb, var(--foreground) 82%, var(--background))", color: "var(--background)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </a>
        ) : (
          <div
            aria-label="GitHub"
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 opacity-60"
            style={{ background: "color-mix(in srgb, var(--foreground) 82%, var(--background))", border: "1px solid color-mix(in srgb, var(--foreground) 82%, var(--background))", color: "var(--background)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}
