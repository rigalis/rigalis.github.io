import { useEffect, useState } from "react";
import { Key, Terminal } from "lucide-react";

interface TimelineEvent {
  year: string;
  title: string;
  association: string;
  description: string;
}

export default function AboutTab() {
  const [age, setAge] = useState<string>("20.3333333");

  useEffect(() => {
    const start = new Date("2006-04-30T15:00:00");
    const update = () => {
      const diff = Date.now() - start.getTime();
      const years = diff / (1000 * 60 * 60 * 24 * 365.25);
      setAge(years.toFixed(7));
    };
    update();
    const id = setInterval(update, 80);
    return () => clearInterval(id);
  }, []);

  const ctfMilestones: TimelineEvent[] = [
    {
      year: "2025 - Present",
      title: "Head of Research & Development",
      association: "DJS ARYA · DJSCE",
      description: "Leading R&D for ARYA — scoping systems and AI projects, mentoring teams, and building tooling around compilers, distributed execution, and security research."
    },
    {
      year: "2025 - Present",
      title: "CTF Player",
      association: "THEM?!",
      description: "Competing in international CTFs. Focus on binary exploitation, reverse engineering, and custom VM / heap challenges. Also authoring Sekai-adjacent VM and pwn tasks."
    },
    {
      year: "2024",
      title: "Security Research Associate",
      association: "Cyber Threat Intelligence Core",
      description: "Traced heap corruption (double-frees & chunk overlaps) on older glibc, audited x86 dumps, and documented mitigations — with an eye toward how allocators behave as system components."
    },
    {
      year: "2023",
      title: "Design Engineer — Systems Interfaces",
      association: "Studio Brutalism",
      description: "Prototyped UI systems over low-level state — diagnostic dashboards that map systems internals to calm, readable views."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="about-tab-grid">
      
      <div className="bento/85 p-6 rounded-none shadow-lg space-y-4">
        <div className="flex flex-col gap-1">
          <span className="font-display font-normal text-[18px] text-[var(--foreground)]" style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>About & <span style={{ color: 'var(--muted-foreground)' }}>bio.</span></span>
          <span className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>A bit about me and where I spend my time.</span>
        </div>
        <div className="text-sm text-[var(--muted-foreground)] leading-relaxed font-sans space-y-3">
          <p>
            Hi! I'm <strong className="text-[var(--foreground)]">Parth Patel</strong> (@rigalis) — <strong className="text-[var(--foreground)]">CTF player at THEM?!</strong> and <strong className="text-[var(--foreground)]">Head of Research & Development at DJS ARYA</strong>. My work sits between systems and security.
          </p>
          <p>
            I am <span className="font-mono text-[var(--foreground)]" style={{ fontFamily: "var(--font-mono)" }}>{age}</span> years old.
          </p>
          <p>
            I care about how low-level systems actually behave — compilers, allocators, runtimes, distributed execution — and then designing calm, modern interfaces over that mess. CTF is still a big part of my days (pwn / reverse), but I think of myself as a systems person who uses CTF to stay sharp.
          </p>
          <p>
            At ARYA I lead R&D — helping scope projects, mentor teams, and turn messy system constraints into legible tooling.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px] text-neutral-450 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[var(--muted-foreground)]/70" /> Located: India
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--muted-foreground)]/70" /> Shell: zsh / tmux / nvim
          </div>
        </div>
      </div>

      <div className="bento/85 p-6 rounded-none shadow-lg space-y-4">
        <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-3 mb-2">
          <span className="font-display font-normal text-[18px] text-[var(--foreground)]" style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>History & <span style={{ color: 'var(--muted-foreground)' }}>timeline.</span></span>
          <span className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>Work, CTF, and research milestones.</span>
        </div>
        <div className="space-y-4 font-mono pr-1">
          {ctfMilestones.map((mil, idx) => (
            <div key={idx} className="relative pl-5 border-l border-[var(--card-border)] space-y-1 text-xs">
              <div className="absolute top-1 -left-[4.5px] w-2 h-2 rounded-full bg-[var(--muted-foreground)]/60 shadow-sm"></div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{mil.year}</div>
              <h4 className="font-sans font-bold text-[var(--foreground)] text-sm leading-tight">
                {mil.title}
              </h4>
              <div className="text-[10px] font-mono text-[var(--muted-foreground)]/70">{mil.association}</div>
              <p className="text-[var(--muted-foreground)] leading-relaxed font-sans mt-1 text-[11px]">
                {mil.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
