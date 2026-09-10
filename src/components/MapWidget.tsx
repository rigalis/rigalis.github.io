import { useEffect, useRef } from 'react'

export default function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let mounted = true
    let shineHolder: HTMLDivElement | null = null
    import('leaflet').then((L) => {
      if (!mounted || !mapRef.current) return
      const map = L.map(mapRef.current!, {
        center: [19.02, 72.95],
        zoom: 8,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
      })
      leafletRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 19,
      }).addTo(map)

      const TEAL = '#14b8a6'
      // diagonal shine clipped to the Mumbai shape, follows pan/zoom
      let boundaryRing: [number, number][] = []
      let shinePoly: SVGPolygonElement | null = null
      const ensureShine = () => {
        if (shinePoly || !mapRef.current) return
        const holder = (shineHolder = document.createElement('div'))
        holder.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:450;overflow:hidden;border-radius:12px'
        holder.innerHTML = '<svg width="100%" height="100%" style="display:block"><defs><clipPath id="mumbaiClip"><polygon id="mumbaiPoly" points=""/></clipPath><pattern id="mumbaiStripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect x="0" y="0" width="8" height="18" fill="#5eead4" opacity="0.18"/><animateTransform attributeName="patternTransform" type="translate" from="0 0" to="18 0" dur="2.4s" repeatCount="indefinite" additive="sum"/></pattern></defs><rect x="0" y="0" width="100%" height="100%" fill="url(#mumbaiStripes)" clip-path="url(#mumbaiClip)"/></svg>'
        map.getContainer().appendChild(holder)
        shinePoly = holder.querySelector('#mumbaiPoly')
      }
      const updateShine = () => {
        if (!shinePoly || !boundaryRing.length) return
        const pts = boundaryRing.map(([la, ln]) => {
          const p = map.latLngToContainerPoint([la, ln] as any)
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
        }).join(' ')
        shinePoly.setAttribute('points', pts)
      }
      map.on('moveend zoomend viewreset resize', updateShine)
      const trackRing = (ring: [number, number][]) => {
        boundaryRing = ring
        ensureShine()
        updateShine()
      }
      const drawBoundary = (geojson: any) => {
        if (!mounted || !leafletRef.current) return
        // fade-out glow rings, then crisp outline + slowly blinking fill
        L.geoJSON(geojson, { style: { color: TEAL, weight: 10, opacity: 0.08, fill: false } }).addTo(map)
        L.geoJSON(geojson, { style: { color: TEAL, weight: 5, opacity: 0.22, fill: false } }).addTo(map)
        L.geoJSON(geojson, { style: { color: TEAL, weight: 1.6, opacity: 0.9, fillColor: TEAL, fillOpacity: 0.14 } }).addTo(map)
        // largest outer ring drives the shine clip
        const polys = geojson.type === 'Polygon' ? [geojson.coordinates] : geojson.coordinates
        let best: number[][] = []
        polys.forEach((p: number[][][]) => { if (p[0] && p[0].length > best.length) best = p[0] })
        trackRing(best.map(([lng, lat]) => [lat, lng] as [number, number]))
      }
      const drawFallback = () => {
        if (!mounted || !leafletRef.current) return
        const c: [number, number] = [19.076, 72.877]
        L.circle(c, { radius: 23000, color: TEAL, weight: 8, opacity: 0.08, fill: false }).addTo(map)
        L.circle(c, { radius: 20500, color: TEAL, weight: 4, opacity: 0.22, fill: false }).addTo(map)
        L.circle(c, { radius: 18500, color: TEAL, weight: 1.6, opacity: 0.85, fillColor: TEAL, fillOpacity: 0.14 }).addTo(map)
        const ring: [number, number][] = []
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2
          ring.push([c[0] + (18500 / 111320) * Math.cos(a), c[1] + (18500 / (111320 * Math.cos(c[0] * Math.PI / 180))) * Math.sin(a)])
        }
        trackRing(ring)
      }
      fetch('https://nominatim.openstreetmap.org/search?q=Greater+Mumbai,Maharashtra,India&format=jsonv2&polygon_geojson=1&polygon_threshold=0.001&limit=5', { headers: { Accept: 'application/json' } })
        .then((r) => { if (!r.ok) throw new Error('geo'); return r.json() })
        .then((j) => {
          const poly = Array.isArray(j) ? j.find((x: any) => x?.geojson?.type === 'Polygon' || x?.geojson?.type === 'MultiPolygon') : null
          if (poly) drawBoundary(poly.geojson); else drawFallback()
        })
        .catch(() => drawFallback())
    })
    return () => {
      mounted = false
      if (shineHolder) { shineHolder.remove(); shineHolder = null }
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
      <style>{`.minimal-map .leaflet-tile{image-rendering:auto; filter:grayscale(1) invert(0.92) brightness(0.88) contrast(1.35)} .minimal-map .leaflet-control-attribution{display:none} .minimal-map{filter:contrast(1.02) brightness(1.02)} .minimal-map path{transition:opacity 0.4s ease}`}</style>
      <a
        href="https://www.openstreetmap.org/?mlat=19.02&mlon=72.95#map=8/19.02/72.95"
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
