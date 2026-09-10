import { useEffect, useRef } from 'react'

export default function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let mounted = true
    import('leaflet').then((L) => {
      if (!mounted || !mapRef.current) return
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const map = L.map(mapRef.current!, {
        center: [19.076, 72.877],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      })
      leafletRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 19,
      }).addTo(map)
      const pin = L.divIcon({
        className: 'custom-pin',
        html: `<div class="cursor-reticle" style="position:relative;width:28px;height:28px"><div style="position:absolute;left:50%;top:50%;width:4px;height:4px;background:#14b8a6;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 6px rgba(20,184,166,0.6)"></div><div style="position:absolute;left:50%;top:50%;width:10px;height:10px;border:2.4px solid #14b8a6;border-right:0;border-bottom:0;transform:translate(-150%,-150%)"></div><div style="position:absolute;left:50%;top:50%;width:10px;height:10px;border:2.4px solid #14b8a6;border-left:0;border-bottom:0;transform:translate(50%,-150%)"></div><div style="position:absolute;left:50%;top:50%;width:10px;height:10px;border:2.4px solid #14b8a6;border-left:0;border-top:0;transform:translate(50%,50%)"></div><div style="position:absolute;left:50%;top:50%;width:10px;height:10px;border:2.4px solid #14b8a6;border-right:0;border-top:0;transform:translate(-150%,50%)"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      L.marker([19.076, 72.877], { icon: pin }).addTo(map)
    })
    return () => {
      mounted = false
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [])

  return (
    <div className="bento p-0 overflow-hidden h-full flex flex-col relative rounded-[12px]">
      <div className="absolute inset-0 rounded-[12px] overflow-hidden bg-[var(--card-inner)]">
        <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-[12px] minimal-map" style={{ background: 'var(--card-inner)' }} />
        <div className="absolute inset-0 pointer-events-none rounded-[12px]" style={{ boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--card-border) 32%, transparent)' }} />
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 pr-12 flex flex-col gap-0.5" style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', borderTop: '1px solid var(--card-border)', backdropFilter: 'blur(10px) saturate(1.2)' }}>
        <h3 className="font-medium text-sm leading-none text-right" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-title)' }}>Mumbai, India</h3>
      </div>
      <style>{`.minimal-map .leaflet-tile{image-rendering:auto; filter:grayscale(1) invert(0.92) brightness(0.88) contrast(1.35)} .minimal-map .leaflet-control-attribution{display:none} .minimal-map{filter:contrast(1.02) brightness(1.02)} @keyframes reticleSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .cursor-reticle{animation:reticleSpin 8s linear infinite}`}</style>
      <a
        href="https://www.openstreetmap.org/?mlat=19.076&mlon=72.877#map=11/19.076/72.877"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Mumbai map"
        className="absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10"
        style={{ background: 'color-mix(in srgb, var(--foreground) 82%, var(--background))', border: '1px solid color-mix(in srgb, var(--foreground) 82%, var(--background))', color: 'var(--background)' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
      </a>
    </div>
  )
}
