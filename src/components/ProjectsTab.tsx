import { useState, useMemo } from "react";
import { GitBranch, ExternalLink, ShieldCheck, Code, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { projects } from "@/data/work";
import type { Project } from "@/types";

export default function ProjectsTab() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Categories
  const categories = ["All", "Security Tools", "Design Systems", "Exploits / PoCs"];

  // Filter items
  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) => activeCategory === "All" || p.category === activeCategory
    );
  }, [activeCategory]);

  const toggleExpand = (id: string) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  // Color mapping for tags — muted to match home
  const getTagColor = (tag: string) => {
    return "bg-[var(--card-inner)] text-[var(--muted-foreground)] border border-[var(--card-border)]";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="projects-tab-container">
      {/* Category header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bento/80 p-4 rounded-none shadow-md">
        <div className="flex flex-col gap-1">
          <span className="font-display font-normal text-[18px] text-[var(--foreground)]" style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>Repos & <span style={{ color: 'var(--muted-foreground)' }}>projects.</span></span>
          <span className="text-[13px] leading-relaxed" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>Compilers, tools, and exploits.</span>
        </div>

        {/* Categories toggler */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full scroller-mini">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1 font-mono text-xs rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === c
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[var(--accent)] text-[var(--accent)] font-bold"
                  : "bg-[var(--card-inner)] border-[var(--card-border)] hover:border-[var(--card-border)] text-[var(--muted-foreground)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Projects catalog list */}
      <div className="space-y-4">
        {filteredProjects.map((proj) => {
          const isExpanded = expandedProjectId === proj.id;
          return (
            <div
              key={proj.id}
              id={`portfolio-item-${proj.id}`}
              className={`bento rounded-none overflow-hidden shadow-lg transition-all ${
                isExpanded ? "border-[var(--card-border)] shadow-xl" : "border-[var(--card-border)] hover:border-[var(--card-border)]"
              }`}
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1 select-none">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[var(--card-inner)] border border-[var(--card-border)] rounded text-[10px] font-mono text-[var(--muted-foreground)] font-bold">
                      {proj.category}
                    </span>
                    {proj.featured && (
                      <span className="px-1.5 py-0.5 bg-[var(--card-inner)] text-[var(--muted-foreground)] border border-[var(--card-border)] rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> Featured Tool
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans font-bold text-lg md:text-xl text-[var(--foreground)]">
                    {proj.title}
                  </h3>
                  <p className="font-mono text-xs text-neutral-450 leading-relaxed max-w-2xl">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.tags.map((tag) => (
                      <span key={tag} className={`px-2 py-0.5 rounded text-[10px] font-mono ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Grid Action Controls */}
                <div className="flex items-center gap-2 md:self-center">
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[var(--card-inner)] hover:bg-neutral-850 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--card-border)] hover:border-neutral-750 rounded-none cursor-pointer transition-colors"
                      title="Inspect Github Source"
                    >
                      <GitBranch className="w-4 h-4" />
                    </a>
                  )}

                  {proj.demoUrl && (
                    <button
                      onClick={() => {
                        if (proj.demoUrl === "#terminal") {
                          window.location.href = "/terminal";
                        }
                      }}
                      className="p-2 bg-[var(--card-inner)] hover:bg-neutral-850 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--card-border)] hover:border-neutral-750 rounded-none cursor-pointer transition-colors"
                      title="Run Sandbox Simulator"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpand(proj.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--card-inner)] border border-[var(--card-border)] hover:border-neutral-750 rounded-none font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors select-none"
                  >
                    <span>Inspect Specs</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible details breakdown */}
              {isExpanded && (
                <div className="bg-[var(--card-inner)]/40 border-t border-[var(--card-border)] p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                    {/* Architectural block */}
                    <div className="space-y-2 col-span-2">
                      <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-bold flex items-center gap-1.5 pb-1 border-b border-[var(--card-border)]/50">
                        <Code className="w-3.5 h-3.5 text-[var(--muted-foreground)]" /> Architectural & Systems Design
                      </div>
                      <p className="text-neutral-350 leading-relaxed text-sm">
                        {proj.longDescription}
                      </p>
                    </div>

                    {/* Specifications column */}
                    <div className="space-y-3 bento/60 p-4 border border-[var(--card-border)]/80 rounded-none">
                      <div className="text-[10px] text-[var(--muted-foreground)] tracking-wider uppercase font-bold flex items-center gap-1 pb-1 border-b border-[var(--card-border)]/50">
                        <Settings className="w-3.5 h-3.5 text-yellow-500" /> Pipeline Specs
                      </div>
                      <div className="space-y-2 text-[11px] text-neutral-450">
                        <div>
                          <span className="text-[var(--muted-foreground)]">Binary Host:</span> Linux x86_64, portable POSIX
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Security Target:</span> Heap limits check, buffer guard
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">Build System:</span> Cargo / CMake tooling / Webpack
                        </div>
                        <div>
                          <span className="text-[var(--muted-foreground)]">CTF Deploy status:</span> Audited, stable local test suite
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
