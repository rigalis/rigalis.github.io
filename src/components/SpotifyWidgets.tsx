import { useEffect, useState } from "react"

type SpotifyProps = {
  spotifyUrl?: string
  trackTitle?: string
  artist?: string
}

type LastTrack = { name: string; artist: string; album: string; image: string; url: string; uts?: number }

function formatAgo(uts: number) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - uts))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(uts * 1000).toLocaleDateString()
}

export default function SpotifyWidgets({ spotifyUrl = "https://www.last.fm/user/zneq", trackTitle: fallbackTitle = "Orbit Chiptune", artist: fallbackArtist = "rigalis" }: SpotifyProps) {
  const [track, setTrack] = useState<LastTrack | null>(null)
  const [status, setStatus] = useState<string>("Last played — 2h ago")

  useEffect(() => {
    const user = ((import.meta.env.PUBLIC_LASTFM_USER as string) || (import.meta.env.LASTFM_USER as string) || "zneq")
    const key = (import.meta.env.PUBLIC_LASTFM_API_KEY as string) || (import.meta.env.LASTFM_API_KEY as string)
    if (!key) return // no key → keep fallback, free requires key from last.fm/api/account/create
    let cancelled = false
    fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${key}&format=json&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const tracks = data?.recenttracks?.track
        const t = Array.isArray(tracks) ? tracks[0] : tracks
        if (!t || !t.name) {
          setStatus("Last played — 2h ago")
          return
        }
        const img = (t.image?.find((i: any) => i.size === "extralarge") || t.image?.[3] || t.image?.[0])?.["#text"] || ""
        const uts = t.date?.uts ? parseInt(t.date.uts, 10) : undefined
        setTrack({
          name: t.name || fallbackTitle,
          artist: t.artist?.["#text"] || t.artist?.name || fallbackArtist,
          album: t.album?.["#text"] || "system_tones",
          image: img,
          url: t.url || spotifyUrl,
          uts,
        })
        const now = t["@attr"]?.nowplaying === "true"
        if (now) setStatus("Now playing")
        else if (uts) setStatus(`Last played — ${formatAgo(uts)}`)
        else setStatus("Last played — 2h ago")
      })
      .catch(() => {
        if (!cancelled) setStatus("Last played — 2h ago")
      })
    return () => {
      cancelled = true
    }
  }, [fallbackTitle, fallbackArtist, spotifyUrl])

  const displayTitle = track?.name || fallbackTitle
  const displayArtist = track?.artist || fallbackArtist
  const displayAlbum = track?.album || "system_tones"
  const displayImage = track?.image || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&q=80"
  const displayUrl = track?.url || spotifyUrl

  const content = (
    <>
      <div className="w-full shrink-0 select-none overflow-hidden flex justify-center" style={{ borderRadius: "12px 12px 0 0", borderBottom: "1px solid var(--card-border)", background: "var(--card-inner)" }}>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "560 / 356", maxWidth: "420px", boxShadow: "inset 0 0 22px rgba(90,140,255,0.18)" }}>
          <img src="/images/tape.webp" alt="cassette" className="absolute inset-0 w-full h-full object-cover tape-filter" draggable={false} style={{ borderRadius: "3px" }} />
          <img src="/images/cog.png" alt="" aria-hidden className="absolute cog-spin cog-filter" style={{ width: "10.5%", top: "36.8%", left: "24%" }} draggable={false} />
          <img src="/images/cog.png" alt="" aria-hidden className="absolute cog-spin cog-filter" style={{ width: "10.5%", top: "36.8%", left: "65.5%" }} draggable={false} />
          <div className="absolute flex items-center justify-center gap-1.5" style={{ top: "7.5%", left: "7%", width: "86.5%", height: "24%" }}>
            <p className="font-mono text-[10.5px] md:text-[11px] font-bold tracking-tight truncate" style={{ color: "#0a0a0a", lineHeight: 1 }}>{displayTitle}</p>
            <img src={displayImage} alt="album" className="h-[92%] aspect-square object-cover shrink-0 rounded-[2px]" style={{ border: "1px solid rgba(0,0,0,0.18)", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
          </div>
          <div className="absolute flex items-center justify-center" style={{ top: "60%", left: "7%", width: "86.5%", height: "10%" }}>
            <p className="font-mono text-[7.5px] md:text-[8px] tracking-wide truncate px-2" style={{ color: "#222", opacity: 0.85, fontStyle: "oblique" }}>by {displayArtist} · {displayAlbum}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 items-center p-4 pt-3.5 flex-1 min-h-0">
        <img src={displayImage} alt="Album art" className="w-[56px] h-[56px] rounded-[6px] object-cover shrink-0" style={{ border: "1px solid var(--card-border)", boxShadow: "0 0 12px rgba(90,140,255,0.16)" }} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] tracking-wide truncate" style={{ color: "var(--muted-foreground)" }}>{status}</p>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: track ? "#d51007" : "var(--accent)", boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 55%, transparent)" }} />
          </div>
          <p className="font-medium text-[13px] leading-tight truncate" style={{ color: "var(--foreground)", fontFamily: "var(--font-title)" }}>{displayTitle}</p>
          <p className="font-mono text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>by <span style={{ color: "var(--foreground)" }}>{displayArtist}</span> · on <span style={{ color: "var(--foreground)" }}>{displayAlbum}</span></p>
        </div>
      </div>
      <style>{'@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}} .cog-spin{animation:spin 2.8s linear infinite;} .tape-filter{filter:brightness(0.92) contrast(1.08) sepia(0.18) hue-rotate(145deg) saturate(1.45) opacity(0.96)} .cog-filter{filter:sepia(1) hue-rotate(155deg) saturate(1.9) brightness(0.94) contrast(1.05)} :root[data-theme="light"] .tape-filter{filter:brightness(1.02) contrast(1.02) sepia(0.12) hue-rotate(145deg) saturate(1.25) opacity(0.98)} :root[data-theme="light"] .cog-filter{filter:sepia(1) hue-rotate(155deg) saturate(1.5) brightness(1.02)}'}</style>
    </>
  )

  return (
    <a href={displayUrl} target="_blank" rel="noreferrer" aria-label="Open music — rigalis" className="bento h-full flex flex-col relative overflow-hidden block hover:opacity-[0.98] transition-opacity">
      {content}
    </a>
  )
}
