import { useState, useMemo, useEffect } from "react";
import { blogPosts } from "@/data/blog";
import DeepDivePost from "@/components/DeepDivePost";

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
            <img src="/images/pixel-clouds-blog.jpg" alt="Pixel clouds artwork for the writeup" className="w-full h-full object-cover" style={{ objectPosition: 'center 28%', display: 'block' }} />
          </div>
        </div>
        <div className="prose max-w-none text-[15px] leading-7 space-y-4" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
          {activePost.content.split("\n\n").map((para, pIdx) => {
            const t = para.trim();
            if (t.startsWith("### ")) { const txt = t.replace("### ", "").trim(); const id = txt.toLowerCase().replace(/[^a-z0-9]+/g, "-"); return <h2 key={pIdx} id={id} className="text-[22px] font-semibold tracking-tight mt-8 flex items-center gap-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{txt}<a href={`#${id}`} className="text-[14px] opacity-0 hover:opacity-100" style={{ color: 'var(--muted-foreground)' }}>#</a></h2>; }
            if (t.startsWith("#### ")) { const txt = t.replace("#### ", "").trim(); const id = txt.toLowerCase().replace(/[^a-z0-9]+/g, "-"); return <h3 key={pIdx} id={id} className="text-[18px] font-semibold mt-6 flex items-center gap-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{txt}<a href={`#${id}`} className="text-[13px] opacity-0 hover:opacity-100" style={{ color: 'var(--muted-foreground)' }}>#</a></h3>; }
            if (t.startsWith("```")) return <pre key={pIdx} className="p-4 rounded-[8px] overflow-x-auto text-[13px] leading-5" style={{ background: 'var(--card-inner)', border: '1px solid var(--card-border)', color: 'var(--foreground)', fontFamily: 'var(--font-mono)' }}><code>{t.replace(/```[a-z]*\n?/g, "").replace(/```/g, "")}</code></pre>;
            if (t.startsWith("- ")) return <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-3">{t.split("\n").map((li, i) => <li key={i} style={{ color: 'var(--muted-foreground)' }}>{li.replace("- ", "").trim()}</li>)}</ul>;
            return <p key={pIdx} style={{ color: 'var(--foreground)' }}>{t}</p>;
          })}
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
                <img src="/images/pixel-clouds-blog.jpg" alt="Pixel clouds artwork for the writeup" className="w-full h-full object-cover" style={{ objectPosition: 'center 28%' }} />
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
