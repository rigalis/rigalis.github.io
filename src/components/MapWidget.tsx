import { useEffect, useRef } from 'react'

const TEAL = '#14b8a6'

const locations = {
  mumbai: {
    city: 'Mumbai',
    country: 'India',
    coordinates: [19.076, 72.8777] as [number, number],
    story: 'Homebase, where it all started.',
  },
  delhi: {
    city: 'Delhi',
    country: 'India',
    coordinates: [28.6139, 77.209] as [number, number],
    story: "Terrier Cyber Quest '26 Finals.",
  },
  pune: {
    city: 'Pune',
    country: 'India',
    coordinates: [18.5204, 73.8567] as [number, number],
    story: 'Won 2nd place at PCCOE Kurukshetra CTF.',
  },
  kushinagar: {
    city: 'Kushinagar, UP',
    country: 'India',
    coordinates: [26.7406, 83.8887] as [number, number],
    story: '[DJS ARYA] ISRO IN-SPACe CANSAT Competition.',
  },
  virginia: {
    city: 'Virginia',
    country: 'USA',
    coordinates: [37.4316, -78.6569] as [number, number],
    story: '[DJS ARYA] AIR 1 and Global Rank 10 at the AAS CanSat Competition.',
  },
} as const

function curvedRoute(start: [number, number], end: [number, number], bend = 1.25): [number, number][] {
  const points: [number, number][] = []
  for (let step = 0; step <= 32; step += 1) {
    const t = step / 32
    const arc = Math.sin(Math.PI * t) * bend
    points.push([
      start[0] + (end[0] - start[0]) * t + arc,
      start[1] + (end[1] - start[1]) * t - arc * 0.2,
    ])
  }
  return points
}

export default function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let mounted = true

    import('leaflet').then((L) => {
      if (!mounted || !mapRef.current) return

      const phone = window.matchMedia('(max-width: 1023px)').matches
      const map = L.map(mapRef.current, {
        center: locations.mumbai.coordinates,
        zoom: phone ? 10 : 7,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
      })
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 19,
      }).addTo(map)

      const routes = [
        curvedRoute(locations.mumbai.coordinates, locations.delhi.coordinates),
        curvedRoute(locations.mumbai.coordinates, locations.pune.coordinates, 0.16),
        curvedRoute(locations.mumbai.coordinates, locations.kushinagar.coordinates, 0.8),
        curvedRoute(locations.mumbai.coordinates, locations.virginia.coordinates, 4),
      ]
      routes.forEach((route) => {
        L.polyline(route, {
          className: 'travel-route',
          color: TEAL,
          weight: 1.2,
          opacity: 0.9,
          dashArray: '3 4',
          lineCap: 'round',
          interactive: false,
        }).addTo(map)
      })

      const fallbackBoundaries = {
        mumbai: {
          type: 'Polygon',
          coordinates: [[
            [72.77, 19.27], [72.88, 19.30], [72.98, 19.22], [72.99, 19.08],
            [72.94, 18.91], [72.83, 18.89], [72.79, 19.03], [72.77, 19.27],
          ]],
        },
        delhi: {
          type: 'Polygon',
          coordinates: [[
            [76.84, 28.88], [77.12, 28.89], [77.35, 28.72], [77.33, 28.48],
            [77.18, 28.40], [76.94, 28.42], [76.83, 28.58], [76.84, 28.88],
          ]],
        },
        pune: {
          type: 'Polygon',
          coordinates: [[
            [73.73, 18.62], [73.86, 18.65], [74.01, 18.58], [74.03, 18.48],
            [73.94, 18.41], [73.79, 18.43], [73.70, 18.51], [73.73, 18.62],
          ]],
        },
        kushinagar: {
          type: 'Polygon',
          coordinates: [[
            [83.55, 27.10], [83.84, 27.18], [84.18, 27.05], [84.25, 26.78],
            [84.08, 26.56], [83.75, 26.51], [83.51, 26.72], [83.55, 27.10],
          ]],
        },
        virginia: {
          type: 'Polygon',
          coordinates: [[
            [-83.68, 36.60], [-81.67, 36.59], [-80.71, 37.20], [-79.48, 37.53],
            [-77.32, 39.00], [-75.24, 38.03], [-75.75, 36.55], [-79.51, 36.54],
            [-81.93, 36.61], [-83.68, 36.60],
          ]],
        },
      } as const

      let activeLocation: keyof typeof locations = 'mumbai'
      const boundaryRings: Partial<Record<keyof typeof locations, [number, number][]>> = {}
      let shineLayer: any = null
      const shinePatternId = 'activeRegionStripes'

      const ensureShine = () => {
        const ring = boundaryRings[activeLocation]
        if (!ring?.length) return

        if (!shineLayer) {
          shineLayer = L.polygon(ring, {
            stroke: false,
            fill: true,
            fillOpacity: 1,
            interactive: false,
            className: 'region-shine',
          }).addTo(map)

          const path = shineLayer.getElement() as SVGPathElement | null
          const svg = path?.ownerSVGElement
          if (path && svg && !svg.querySelector(`#${shinePatternId}`)) {
            const ns = 'http://www.w3.org/2000/svg'
            const defs = svg.querySelector('defs') ?? svg.insertBefore(document.createElementNS(ns, 'defs'), svg.firstChild)
            const pattern = document.createElementNS(ns, 'pattern')
            pattern.setAttribute('id', shinePatternId)
            pattern.setAttribute('width', '18')
            pattern.setAttribute('height', '18')
            pattern.setAttribute('patternUnits', 'userSpaceOnUse')
            pattern.setAttribute('patternTransform', 'rotate(45)')

            const stripe = document.createElementNS(ns, 'rect')
            stripe.setAttribute('width', '8')
            stripe.setAttribute('height', '18')
            stripe.setAttribute('fill', '#5eead4')
            stripe.setAttribute('opacity', '0.18')

            const movement = document.createElementNS(ns, 'animateTransform')
            movement.setAttribute('attributeName', 'patternTransform')
            movement.setAttribute('type', 'translate')
            movement.setAttribute('from', '0 0')
            movement.setAttribute('to', '18 0')
            movement.setAttribute('dur', '2.4s')
            movement.setAttribute('repeatCount', 'indefinite')
            movement.setAttribute('additive', 'sum')
            pattern.append(stripe, movement)
            defs.appendChild(pattern)
          }
        } else {
          shineLayer.setLatLngs(ring)
        }

        shineLayer.bringToFront()
        shineLayer.getElement()?.setAttribute('fill', `url(#${shinePatternId})`)
      }

      const selectLocation = (key: keyof typeof locations) => {
        activeLocation = key
        ensureShine()
      }

      const drawBoundary = (key: keyof typeof locations, geojson: any) => {
        if (!mounted || !leafletRef.current) return
        L.geoJSON(geojson, {
          interactive: false,
          style: {
            color: TEAL,
            weight: 1.1,
            opacity: 0.62,
            fillColor: TEAL,
            fillOpacity: 0.07,
          },
        }).addTo(map)

        const polygons = geojson.type === 'Polygon' ? [geojson.coordinates] : geojson.coordinates
        let largestRing: number[][] = []
        polygons.forEach((polygon: number[][][]) => {
          if (polygon[0] && polygon[0].length > largestRing.length) largestRing = polygon[0]
        })
        boundaryRings[key] = largestRing.map(([lng, lat]) => [lat, lng] as [number, number])
        if (key === activeLocation) ensureShine()
      }

      const loadBoundary = (key: keyof typeof locations, query: string) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&polygon_geojson=1&polygon_threshold=0.001&limit=5`
        fetch(url, { headers: { Accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error('boundary request failed')
            return response.json()
          })
          .then((results) => {
            const match = Array.isArray(results)
              ? results.find((result: any) => result?.geojson?.type === 'Polygon' || result?.geojson?.type === 'MultiPolygon')
              : null
            drawBoundary(key, match?.geojson ?? fallbackBoundaries[key])
          })
          .catch(() => drawBoundary(key, fallbackBoundaries[key]))
      }

      loadBoundary('mumbai', 'Greater Mumbai, Maharashtra, India')
      loadBoundary('delhi', 'National Capital Territory of Delhi, India')
      loadBoundary('pune', 'Pune, Maharashtra, India')
      loadBoundary('kushinagar', 'Kushinagar district, Uttar Pradesh, India')
      loadBoundary('virginia', 'Virginia, United States')

      Object.entries(locations).forEach(([key, location]) => {

        const icon = L.divIcon({
          className: 'travel-marker-wrap',
          html: '<span class="travel-marker"></span>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        const marker = L.marker(location.coordinates, { icon, keyboard: true, title: location.city }).addTo(map)
        marker.on('click', () => selectLocation(key as keyof typeof locations))
        marker.bindPopup(
          `<article class="map-popup-card">
            <h3>${location.city}, ${location.country}</h3>
            <p>${location.story}</p>
          </article>`,
          {
            className: 'location-popup',
            closeButton: true,
            autoPan: true,
            autoPanPadding: [20, 20],
            offset: [0, -8],
            minWidth: 190,
            maxWidth: 190,
          },
        )
      })

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
    <section className="bento p-0 overflow-hidden h-full flex flex-col relative rounded-[12px]" aria-label="Places I have been">
      <div className="absolute inset-0 rounded-[12px] overflow-hidden bg-[var(--card-inner)]">
        <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-[12px] minimal-map" style={{ background: 'var(--card-inner)' }} />
        <div className="absolute inset-0 pointer-events-none rounded-[12px] z-[500]" style={{ boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--card-border) 32%, transparent)' }} />
      </div>

      <style>{`
        .minimal-map .leaflet-tile{image-rendering:auto;filter:grayscale(1) invert(.92) brightness(.88) contrast(1.35)}
        .minimal-map .leaflet-control-attribution{display:none}
        .minimal-map{filter:contrast(1.02) brightness(1.02)}
        .minimal-map path{transition:opacity .4s ease}
        .minimal-map .travel-route{animation:route-drift 14s linear infinite}
        .travel-marker-wrap{background:transparent;border:0}
        .travel-marker{position:relative;display:block;width:7px;height:7px;margin:2.5px;border-radius:50%;background:${TEAL};opacity:.82;cursor:pointer;transition:opacity .15s ease}
        .travel-marker:hover{opacity:1}
        .minimal-map .leaflet-bar{border:1px solid var(--card-border);box-shadow:none;border-radius:7px;overflow:hidden}
        .minimal-map .leaflet-bar a{width:26px;height:26px;line-height:25px;background:color-mix(in srgb, var(--card) 92%, transparent);color:var(--foreground);border-color:var(--card-border);font:16px/25px var(--font-sans);backdrop-filter:blur(8px)}
        .minimal-map .leaflet-bar a:hover{background:var(--card-inner)}
        .minimal-map .location-popup .leaflet-popup-content-wrapper{padding:0;border:1px solid var(--card-border);border-radius:10px;background:var(--card);color:var(--foreground);box-shadow:0 12px 34px rgba(0,0,0,.28)}
        .minimal-map .location-popup .leaflet-popup-content{margin:0;width:min(190px,calc(100vw - 64px))!important}
        .minimal-map .location-popup .leaflet-popup-tip{background:var(--card);box-shadow:none}
        .minimal-map .location-popup .leaflet-popup-close-button{top:5px;right:5px;width:22px;height:22px;color:var(--muted-foreground);font:17px/20px var(--font-sans)}
        .map-popup-card{padding:12px 14px;font-family:var(--font-sans)}
        .map-popup-card h3{margin:0;padding-right:18px;color:var(--foreground);font:600 14px/1.2 var(--font-title)}
        .map-popup-card p{margin:5px 0 0;color:var(--muted-foreground);font-size:11px;line-height:1.45}
        @keyframes route-drift{to{stroke-dashoffset:-14}}
        @media (prefers-reduced-motion:reduce){.minimal-map .travel-route{animation:none}.travel-marker{transition:none}}
      `}</style>
    </section>
  )
}
