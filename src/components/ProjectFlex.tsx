import { useState } from "react";
import { projects } from "@/data/work";

const COVERS = [
  "https://picsum.photos/seed/rigalis-ghidra/640/480",
  "https://picsum.photos/seed/rigalis-elf/640/480",
  "https://picsum.photos/seed/rigalis-fuzz/640/480",
  "https://picsum.photos/seed/rigalis-vm/640/480",
  "https://picsum.photos/seed/rigalis-heap/640/480",
  "https://picsum.photos/seed/rigalis-syscall/640/480",
];

const BLURBS: Record<string, string> = {
  "ghidpy-themer": "Eye-safe themes for reverse engineers.",
  "elf-stripper-compiler": "Shrink ELF binaries, hide debug tables.",
  "fuzzforge": "Smart harness fuzzing x86 network daemons.",
  "vm-crackset": "Playable VM puzzles for CTF training.",
  "heap-lens": "Visual heap inspector for glibc chunks.",
  "syscall-sleuth": "Trace syscalls across packed binaries.",
};

export default function ProjectFlex() {
  const [active, setActive] = useState(0);
  const items = projects.slice(0, 6);

  return (
    <div className="bento p-3 w-full h-full flex flex-col">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="px-soft" x="0" y="0" width="100%" height="100%">
            <feFlood x="6" y="6" width="3" height="3" />
            <feComposite width="9" height="9" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="4.5" />
          </filter>
        </defs>
      </svg>
      <div
        className="flex flex-1 min-h-0 w-full gap-1.5 flex-col md:flex-row"
        onMouseLeave={() => setActive(0)}
      >
        {items.map((p, i) => {
          const isActive = i === active;
          const url = p.demoUrl && p.demoUrl !== "#terminal" ? p.demoUrl : p.githubUrl;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              title={p.title}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => {
                if (isActive && url) window.open(url, "_blank", "noreferrer");
                else setActive(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (isActive && url) window.open(url, "_blank", "noreferrer");
                  else setActive(i);
                }
              }}
              className="relative cursor-pointer overflow-hidden rounded-[10px] shrink-0 md:shrink md:min-w-0"
              style={{
                flex: isActive ? "7 1 0%" : "1 1 0%",
                minWidth: isActive ? undefined : "3rem",
                minHeight: "3.25rem",
                transition: "flex-grow 0.5s cubic-bezier(0.22, 1, 0.36, 1), flex-shrink 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                border: "1px solid var(--card-border)",
                background: "var(--card-inner)",
              }}
            >
              <img
                src={COVERS[i % COVERS.length]}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                style={{
                  objectPosition: "center 30%",
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "scale(1)" : "scale(1.06)",
                  transition: "opacity 0.45s ease 0.1s, transform 0.6s ease",
                  filter: "url(#px-soft) saturate(0.85)",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 55%)",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.35s ease 0.1s",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center font-mono select-none pointer-events-none"
                style={{
                  fontSize: isActive ? "120px" : "13px",
                  color: isActive ? "color-mix(in srgb, var(--foreground) 7%, transparent)" : "var(--muted-foreground)",
                  opacity: isActive ? 1 : 0.55,
                  transition: "font-size 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="absolute inset-x-0 bottom-0 p-3 pr-4 pointer-events-none"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 0.3s ease 0.15s, transform 0.3s ease 0.15s",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <p
                  className="font-bold text-[17px] leading-tight truncate"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-title)" }}
                >
                  {p.title}
                </p>
                <p
                  className="text-[12px] mt-1 truncate"
                  style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}
                >
                  {BLURBS[p.id] ?? p.description}
                </p>
                <p
                  className="font-mono text-[10px] mt-0.5 truncate"
                  style={{ color: "var(--muted-foreground)", opacity: 0.7 }}
                >
                  {p.category}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
