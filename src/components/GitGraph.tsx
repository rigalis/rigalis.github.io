import { useEffect, useState, useMemo } from "react";

interface Day { date: string; count: number; }

const NUM_WEEKS_DESKTOP = 24;
const NUM_WEEKS_MOBILE = 40;
const CELL_DESKTOP = 16;
const GAP_DESKTOP = 4;
// phone: minimal small cells, zoomed to fill width (~360px)
const CELL_MOBILE = 7;
const GAP_MOBILE = 2;

type GitGraphProps = {
  profileUrl?: string
  username?: string
}

export default function GitGraph({ profileUrl = "https://github.com/rigalis", username = "rigalis" }: GitGraphProps) {
  const [realData, setRealData] = useState<Day[] | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    // Try multiple public contribution APIs, fallback to mock if all fail
    const apis = [
      `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
      `https://gh-contributions-api.jogruber.de/v4/${username}?y=last`,
      `https://github-contributions-api.deno.dev/${username}`,
    ];
    const tryFetch = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const json: any = await res.json();
      // jogruber: { contributions: [{date, count, level}] }
      // deno: { contributions: [{date, count}] } or { data: [...] }
      const arr: any[] = json.contributions || json.data || json;
      if (!Array.isArray(arr)) throw new Error("bad shape");
      return arr.map((d: any) => ({ date: d.date, count: Math.min(4, d.count ?? d.contributionCount ?? 0) }));
    };
    (async () => {
      for (const url of apis) {
        try {
          const data = await tryFetch(url);
          if (!cancelled && data.length) { setRealData(data); return; }
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (numWeeks - 1) * 7);

    let all: (Day | null)[] = [];
    if (realData && realData.length) {
      const map = new Map(realData.map((d) => [d.date, d.count]));
      for (let i = 0; i < numWeeks * 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const key = d.toISOString().split("T")[0];
        if (d > today) all.push(null);
        else all.push({ date: key, count: map.get(key) ?? 0 });
      }
    } else {
      // fallback mock
      let s = 1337;
      const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let i = 0; i < numWeeks * 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        if (d > today) { all.push(null); rand(); continue; }
        const luck = rand();
        let count = 0;
        if (luck > 0.86) count = 4;
        else if (luck > 0.72) count = 3;
        else if (luck > 0.52) count = 2;
        else if (luck > 0.28) count = 1;
        all.push({ date: d.toISOString().split("T")[0], count });
      }
    }
    const weeks: (Day | null)[][] = [];
    for (let w = 0; w < numWeeks; w++) weeks.push(all.slice(w * 7, w * 7 + 7));
    const monthLabels: { label: string; weekIdx: number }[] = [];
    let last = -1;
    weeks.forEach((week, wIdx) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      const m = new Date(first.date).getMonth();
      if (m !== last) {
        monthLabels.push({ label: new Date(first.date).toLocaleDateString("en-US", { month: "short" }), weekIdx: wIdx });
        last = m;
      }
    });
    return { weeks, monthLabels };
  }, [realData, numWeeks]);

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
    <div className={isMobile ? "w-full flex flex-col relative py-1" : "bento px-5 pt-5 pb-3 h-full flex flex-col relative"}>
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
