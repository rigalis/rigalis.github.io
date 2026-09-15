import { useState, useMemo, useEffect } from "react";
import { blogPosts } from "@/data/blog";
import DeepDivePost from "@/components/DeepDivePost";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-java";
import "prismjs/themes/prism-tomorrow.css";

export default function BlogTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activePostId, setActivePostId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash.replace(/^#/, "");
    const urlId = params.get("post") || (hashId && blogPosts.some((p) => p.id === hashId) ? hashId : null);
    if (urlId && blogPosts.some((p) => p.id === urlId)) setActivePostId(urlId);
  }, []);

  useEffect(() => {
    if (activePostId) history.replaceState(null, "", `#${activePostId}`);
    else if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }, [activePostId]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return blogPosts.filter((post) => {
      const matchSearch = !q || post.title.toLowerCase().includes(q) || post.description.toLowerCase().includes(q) || post.tags.some((t) => t.toLowerCase().includes(q));
      const matchCat = selectedCategory === "All" || post.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ["All", "Reverse Engineering", "Binary Analysis", "Design", "CTF Writeups"];
  const activePost = useMemo(() => blogPosts.find((p) => p.id === activePostId), [activePostId]);

  const renderInline = (text: string) => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--foreground)' }}>{linkMatch[1]}</a>;
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const code = part.slice(1, -1);
        return <code key={i} className="px-1 py-0.5 rounded text-[12.5px] border" style={{ background: "var(--card-inner)", borderColor: "var(--card-border)", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>{code}</code>;
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i} style={{ color: "var(--foreground)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
        return <em key={i} style={{ color: "var(--muted-foreground)" }}>{part.slice(1, -1)}</em>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Sidebar TOC for generic posts (z0d1ak-hadopelagic-vmception), mirrors DeepDivePost behavior
  useEffect(() => {
    const block = document.getElementById("deepdive-sidebar-block");
    const nav = document.getElementById("sidebar-toc-nav") as HTMLElement | null;
    if (!activePost) {
      if (block) { block.classList.add("hidden"); block.classList.remove("flex"); }
      document.body.classList.remove("deepdive-mode");
      return;
    }
    if (activePost.id === "heap-overflow-elf-hunting") return; // DeepDivePost handles its own
    // show sidebar for generic post
    if (block) { block.classList.remove("hidden"); block.classList.add("flex"); }
    document.body.classList.add("deepdive-mode");
    if (!nav) return;
    // extract headings, short 4-word titles, Part 1/2 as parents (skip code blocks)
    const shortMap: Record<string, string> = {
      "part-1-hadopelagic": "1. Hadopelagic",
      "first-look": "First Look",
      "the-two-currents-up-close": "Two Currents",
      "trying-to-just-read-the-native-lib-and-giving-up-on-that-plan": "Native Lib",
      "what-the-harness-told-me": "Harness Insights",
      "the-actual-key-derivation": "Key Derivation",
      "the-anti-debug-trap-and-why-gdb-kept-lying-to-me": "Anti-Debug Trap",
      "cracking-the-signing-block-then-inverting-f": "Signing Block",
      "landing-the-plane": "Final Flag",
      "the-scripts-that-actually-mattered": "Key Scripts",
      "part-2-vmception": "2. VMception",
      "what-we-re-dealing-with": "Overview",
      "two-separate-memory-spaces-mixed-up-at-first": "Memory Spaces",
      "fifteen-opcodes-one-dispatch-table": "Opcode Table",
      "self-modifying-and-confusing-because-of-it": "Self Modifying",
      "turning-the-vm-into-a-constraint-system": "Constraint System",
      "flag": "VM Flag",
      "the-solver-in-shape": "Solver Logic",
      "takeaways": "Takeaways",
      "references": "References",
    };
    const headings: { id: string; label: string; shortLabel: string; level: number }[] = [];
    let inCode = false;
    for (const line of activePost.content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) { inCode = !inCode; continue; }
      if (inCode) continue;
      const hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (!hm) continue;
      const level = hm[1].length;
      if (level < 1 || level > 3) continue;
      const label = hm[2].trim();
      if (!label) continue;
      const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      let short = shortMap[id];
      if (!short) {
        short = label.split(/\s+/).slice(0, 4).join(" ");
        if (short.length > 22) short = short.slice(0, 20) + "…";
      }
      headings.push({ id, label, shortLabel: short, level });
    }
    // limit to max 4 subtitles per Part (plus parents)
    const keepIds = new Set([
      "part-1-hadopelagic",
      "first-look",
      "the-two-currents-up-close",
      "the-actual-key-derivation",
      "landing-the-plane",
      "part-2-vmception",
      "what-we-re-dealing-with",
      "fifteen-opcodes-one-dispatch-table",
      "turning-the-vm-into-a-constraint-system",
      "flag",
      "takeaways",
      "references",
    ]);
    const displayHeadings = headings.filter(h => keepIds.has(h.id));
    // populate nav, no left line, use background pill for active
    nav.style.borderLeft = "none";
    nav.style.paddingLeft = "0";
    nav.className = "space-y-1";
    nav.innerHTML = "";
    displayHeadings.forEach(h => {
      const isParent = h.level <= 2;
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.setAttribute("data-toc-id", h.id);
      a.textContent = h.shortLabel;
      a.title = h.label;
      a.className = "block leading-4 transition-colors rounded-[6px] px-2 truncate";
      if (isParent) {
        a.classList.add("py-1.5", "font-medium");
        a.style.fontSize = "11px";
        a.style.marginLeft = "0px";
      } else {
        a.classList.add("py-1");
        a.style.fontSize = "10.5px";
        a.style.opacity = "0.9";
        a.style.marginLeft = "12px";
      }
      a.style.color = "var(--muted-foreground)";
      a.style.fontFamily = "var(--font-sans)";
      nav.appendChild(a);
    });
    if (displayHeadings.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-[11px] py-2";
      empty.style.color = "var(--muted-foreground)";
      empty.textContent = "No sections";
      nav.appendChild(empty);
      return;
    }
    const clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const a = target.closest("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      const id = href.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    };
    nav.addEventListener("click", clickHandler);
    let activeId = displayHeadings[0]?.id || "";
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) activeId = entry.target.id;
      nav.querySelectorAll("a").forEach(a => {
        const id = a.getAttribute("data-toc-id");
        const isActive = id === activeId;
        (a as HTMLElement).style.color = isActive ? "var(--foreground)" : "var(--muted-foreground)";
        (a as HTMLElement).style.fontWeight = isActive ? "500" : "400";
        (a as HTMLElement).style.background = isActive ? "var(--card-inner)" : "transparent";
        (a as HTMLElement).style.borderRadius = "6px";
      });
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
    const t = setTimeout(() => {
      displayHeadings.forEach(h => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });
      // init active
      nav.querySelectorAll("a").forEach(a => {
        const id = a.getAttribute("data-toc-id");
        if (id === activeId) {
          (a as HTMLElement).style.color = "var(--foreground)";
          (a as HTMLElement).style.fontWeight = "500";
          (a as HTMLElement).style.background = "var(--card-inner)";
        }
      });
    }, 400);
    return () => {
      nav.removeEventListener("click", clickHandler);
      observer.disconnect();
      clearTimeout(t);
    };
  }, [activePost]);

  if (activePost) {
    if (activePost.id === "heap-overflow-elf-hunting") {
      return <DeepDivePost onBack={() => setActivePostId(null)} />;
    }
    return (
      <article className="max-w-3xl mx-auto" id="blog-reader-post">
        <button onClick={() => setActivePostId(null)} className="flex items-center gap-2 text-[13px] mb-6 px-3 py-1.5 rounded-full border hover:bg-[var(--card-inner)] transition-colors" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--card-border)', fontFamily: 'var(--font-sans)' }}>
          ← Back to index
        </button>
        <header className="mb-8">
          <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight leading-[1.05]" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{activePost.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-[13px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>
            <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'var(--card-inner)', border: '1px solid var(--card-border)' }}>R</span> rigalis</span>
            <span>·</span><span>{activePost.date}</span><span>·</span><span>{activePost.readTime}</span><span>·</span><span className="px-2 py-0.5 rounded-full border text-[11px]" style={{ borderColor: 'var(--card-border)', background: 'var(--card-inner)' }}>#{activePost.category.toLowerCase()}</span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed italic" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>"{activePost.description}"</p>
        </header>
        <div className="w-full rounded-[12px] overflow-hidden relative mb-8" style={{ border: '1px solid var(--card-border)', background: 'var(--card-inner)' }}>
          <div className="w-full aspect-[200/96] overflow-hidden relative">
            <img src={activePost.image || "/images/pixel-clouds-blog.jpg"} alt={activePost.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 28%', display: 'block' }} />
          </div>
        </div>
        <div className="prose max-w-none text-[15px] leading-7 space-y-4" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
          {(() => {
            let lastHeadingId = "";
            const _parts = activePost.content.split(/(```[\s\S]*?```)/g);
            const _blocks: string[] = [];
            for (const _part of _parts) {
              if (_part.trim().startsWith("```")) _blocks.push(_part);
              else _blocks.push(..._part.split("\n\n"));
            }
            return _blocks.map((para, pIdx) => {
            const t = para.trim();
            if (t === "---" || t === "***" || t === "___") return <hr key={pIdx} className="my-6" style={{ borderColor: 'var(--card-border)' }} />;
            if (t.startsWith("> ")) {
              const q = t.replace(/^>\s?/gm, "").trim();
              return <blockquote key={pIdx} className="my-6 pl-4 py-2 border-l-2 text-[14.5px] leading-6 italic" style={{ borderColor: 'var(--foreground)', color: 'var(--muted-foreground)', background: 'color-mix(in srgb, var(--card) 60%, transparent)' }}>{renderInline(q)}</blockquote>;
            }
            const hm = t.match(/^(#{1,6})\s+(.*)$/);
            if (hm) {
              const level = hm[1].length;
              const txt = hm[2].trim();
              const id = txt.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              if (level === 1) return <h1 key={pIdx} id={id} className="text-[32px] font-extrabold tracking-tight mt-12 mb-6 flex items-center gap-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{txt}<a href={`#${id}`} className="text-[16px] opacity-40 hover:opacity-100" style={{ color: 'var(--muted-foreground)' }}>#</a></h1>;
              if (level === 2) return <h2 key={pIdx} id={id} className="text-[26px] font-bold tracking-tight mt-10 mb-3 flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)', borderColor: 'var(--card-border)' }}>{txt}<a href={`#${id}`} className="text-[14px] opacity-40 hover:opacity-100 ml-2" style={{ color: 'var(--muted-foreground)' }}>#</a></h2>;
              return <h3 key={pIdx} id={id} className="text-[21px] font-semibold tracking-tight mt-8 mb-2 flex items-center gap-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--foreground)', opacity: 0.7 }} />{txt}<a href={`#${id}`} className="text-[13px] opacity-40 hover:opacity-100" style={{ color: 'var(--muted-foreground)' }}>#</a></h3>;
            }
            if (t.startsWith("```")) {
              const mm = t.match(/^```(\w*)\n?([\s\S]*?)```$/);
              const langRaw = (mm?.[1] || "").toLowerCase();
              const codeRaw = (mm?.[2] ?? t.replace(/```[a-z]*\n?/g, "").replace(/```/g, "")).trimEnd();
              // highlighted flag only at end of each part, site-matched, minimal
              const flagMatch = codeRaw.match(/zdk\{[^}]+\}/);
              const isEndFlag = lastHeadingId === "landing-the-plane" || lastHeadingId === "flag";
              if (flagMatch && isEndFlag) {
                const flag = flagMatch[0];
                const partLabel = codeRaw.includes("bearing") ? "Part 1 · Hadopelagic" : "Part 2 · VMception";
                return (
                  <div key={pIdx} className="my-6 rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--card-border)", background: "var(--card)" }}>
                    <div className="px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono tracking-wide border-b" style={{ background: "var(--card-inner)", color: "var(--muted-foreground)", borderColor: "var(--card-border)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--foreground)" }} />
                      FLAG
                      <span className="ml-auto text-[9px] opacity-60">{partLabel}</span>
                    </div>
                    <div className="p-3.5" style={{ background: "var(--card-inner)" }}>
                      <code className="text-[13px] font-medium tracking-wide break-all" style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{flag}</code>
                    </div>
                  </div>
                );
              }
              const langMap: Record<string, string> = { py: "python", sh: "bash", text: "clike", glsl: "clike", spv: "clike" };
              const lang = langMap[langRaw] || (langRaw || "clike");
              let highlighted: string;
              try {
                const grammar = (Prism.languages as any)[lang] || (Prism.languages as any).clike;
                highlighted = Prism.highlight(codeRaw, grammar, lang);
              } catch {
                highlighted = codeRaw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              }
              return (
                <div key={pIdx} className="rounded-[10px] overflow-hidden my-4" style={{ border: "1px solid var(--card-border)", background: "var(--card-inner)" }}>
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] border-b" style={{ borderColor: "var(--card-border)", background: "var(--card)", fontFamily: "var(--font-mono)" }}>
                    <span className="px-1 py-0 rounded text-[9px] leading-none border" style={{ borderColor: "var(--card-border)", background: "var(--card-inner)", lineHeight: "1.4" }}>{langRaw || "text"}</span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-[13px] leading-[1.6] prism-code" style={{ fontFamily: "var(--font-mono)", background: "var(--card-inner)", margin: 0 }}><code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
                </div>
              );
            }
            if (t.startsWith("- ")) return <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-3">{t.split("\n").map((li, i) => <li key={i} style={{ color: 'var(--muted-foreground)' }}>{renderInline(li.replace(/^(-|\*)\s+/, "").trim())}</li>)}</ul>;
            if (/^\d+\.\s/.test(t)) return <ol key={pIdx} className="list-decimal pl-5 space-y-1.5 my-3">{t.split("\n").map((li, i) => <li key={i} style={{ color: 'var(--muted-foreground)' }}>{renderInline(li.replace(/^\d+\.\s+/, "").trim())}</li>)}</ol>;
            return <p key={pIdx} style={{ color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>{renderInline(t)}</p>;
          });
          })()}
        </div>
        <footer className="mt-10 pt-6 flex flex-wrap gap-2 items-center" style={{ borderTop: '1px solid var(--card-border)' }}>
          <span className="text-[12px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>Tags:</span>
          {activePost.tags.map((t) => <span key={t} className="px-2.5 py-1 rounded-full text-[12px] border" style={{ background: 'var(--card-inner)', borderColor: 'var(--card-border)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>#{t}</span>)}
        </footer>
      </article>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="blog-catalog-container">
      <header className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>Blog</h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>Binary notes, reverse engineering, and design explorations.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none" style={{ color: 'var(--muted-foreground)' }}>⌕</span>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Type to search..." className="w-full pl-9 pr-4 py-2 rounded-[8px] text-[13px] outline-none border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)} className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${selectedCategory === c ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' : 'bg-transparent border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`} style={{ fontFamily: 'var(--font-sans)' }}>{c}</button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {filteredPosts.length ? (
          filteredPosts.map((post) => (
            <article key={post.id} onClick={() => setActivePostId(post.id)} className="bento p-5 flex gap-4 cursor-pointer hover:opacity-[0.96] transition-opacity overflow-hidden">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[12px] mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}><span>{post.date}</span><span>·</span><span>{post.readTime}</span><span>·</span><span className="px-1.5 py-0.5 rounded-full border text-[10px]" style={{ borderColor: 'var(--card-border)', background: 'var(--card-inner)' }}>{post.category}</span></div>
                <h2 className="text-[18px] font-semibold tracking-tight leading-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{post.title}</h2>
                <p className="text-[13px] leading-relaxed mt-1.5 line-clamp-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{post.description}</p>
                <div className="text-[11px] mt-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>Read →</div>
              </div>
              <div className="hidden sm:block w-[200px] h-[96px] shrink-0 rounded-[10px] overflow-hidden self-start" style={{ border: '1px solid var(--card-border)', background: 'var(--card-inner)' }}>
                <img src={post.image || "/images/pixel-clouds-blog.jpg"} alt={post.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 28%' }} />
              </div>
            </article>
          ))
        ) : (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>No writeups matched.</div>
        )}
      </div>
    </div>
  );
}
