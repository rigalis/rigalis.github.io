import { useState, useMemo, useEffect } from "react";
import { blogPosts } from "@/data/blog";

export default function BlogTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Legacy /blog#<id> and /blog?post=<id> URLs redirect to canonical
  // per-post pages. Hashes never reach servers and are invisible to
  // crawlers, so each post now lives at /blog/<id>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashId = window.location.hash.replace(/^#/, "");
    const urlId = params.get("post") || hashId;
    if (urlId && blogPosts.some((p) => p.id === urlId)) {
      window.location.replace(`/blog/${urlId}`);
    }
  }, []);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return blogPosts.filter((post) => {
      const matchSearch = !q || post.title.toLowerCase().includes(q) || post.description.toLowerCase().includes(q) || post.tags.some((t) => t.toLowerCase().includes(q));
      const matchCat = selectedCategory === "All" || post.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ["All", "Reverse Engineering", "Binary Analysis", "Design", "CTF Writeups"];



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
            <a key={post.id} href={`/blog/${post.id}`} className="bento p-5 flex gap-4 cursor-pointer hover:opacity-[0.96] transition-opacity overflow-hidden">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[12px] mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}><span>{post.date}</span><span>·</span><span>{post.readTime}</span><span>·</span><span className="px-1.5 py-0.5 rounded-full border text-[10px]" style={{ borderColor: 'var(--card-border)', background: 'var(--card-inner)' }}>{post.category}</span></div>
                <h2 className="text-[18px] font-semibold tracking-tight leading-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>{post.title}</h2>
                <p className="text-[13px] leading-relaxed mt-1.5 line-clamp-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{post.description}</p>
                <div className="text-[11px] mt-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>Read →</div>
              </div>
              <div className="hidden sm:block w-[200px] h-[96px] shrink-0 rounded-[10px] overflow-hidden self-start" style={{ border: '1px solid var(--card-border)', background: 'var(--card-inner)' }}>
                <img src={post.image || "/images/pixel-clouds-blog.jpg"} alt={post.title} className="w-full h-full object-cover" style={{ objectPosition: 'center 28%' }} />
              </div>
            </a>
          ))
        ) : (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>No writeups matched.</div>
        )}
      </div>
    </div>
  );
}
