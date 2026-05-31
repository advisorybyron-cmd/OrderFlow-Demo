'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ShipmentMarker {
  lat: number
  lon: number
  orderNumber: string
  city: string
  postalCode: string
  country: string
  state: string
}

interface InteractiveShipmentMapProps {
  markers: ShipmentMarker[]
  loading?: boolean
}

// Ocean routes that follow water paths around continents (no crossing land)
// Fifi's Atlantic route - circles the Atlantic Ocean
const FIFI_ROUTE = [
  { lat: 32, lon: -72 },   // Off Carolina coast (start)
  { lat: 25, lon: -78 },   // Near Bahamas
  { lat: 18, lon: -75 },   // Caribbean
  { lat: 10, lon: -60 },   // Off Venezuela
  { lat: 0, lon: -40 },    // Mid-Atlantic (equator)
  { lat: -15, lon: -35 },  // Off Brazil
  { lat: -35, lon: -50 },  // Off Argentina
  { lat: -45, lon: -55 },  // South Atlantic
  { lat: -35, lon: -15 },  // Mid-South Atlantic
  { lat: -25, lon: 5 },    // Off Namibia
  { lat: -10, lon: 10 },   // Gulf of Guinea
  { lat: 5, lon: -20 },    // Off West Africa
  { lat: 20, lon: -25 },   // Off Mauritania
  { lat: 35, lon: -15 },   // Off Morocco
  { lat: 45, lon: -20 },   // Off Portugal
  { lat: 55, lon: -25 },   // North Atlantic
  { lat: 50, lon: -40 },   // Mid-North Atlantic
  { lat: 42, lon: -55 },   // Off Newfoundland
  { lat: 38, lon: -68 },   // Off New Jersey
]

// Fernando's Pacific route - circles the Pacific Ocean
const FERNANDO_ROUTE = [
  { lat: 35, lon: -125 },  // Off California (start)
  { lat: 25, lon: -120 },  // Off Baja California
  { lat: 15, lon: -110 },  // Off Mexico
  { lat: 5, lon: -95 },    // Off Ecuador
  { lat: -10, lon: -90 },  // Off Peru
  { lat: -25, lon: -85 },  // Off Chile
  { lat: -40, lon: -90 },  // South Pacific
  { lat: -45, lon: -120 }, // Deep South Pacific
  { lat: -35, lon: -150 }, // Mid-South Pacific
  { lat: -20, lon: -175 }, // Near Fiji/Tonga
  { lat: -5, lon: 175 },   // Near Kiribati
  { lat: 10, lon: 165 },   // Marshall Islands area
  { lat: 25, lon: 155 },   // Near Hawaii (west)
  { lat: 35, lon: 165 },   // North Pacific
  { lat: 45, lon: -175 },  // Aleutian area
  { lat: 50, lon: -155 },  // Gulf of Alaska
  { lat: 45, lon: -135 },  // Off British Columbia
  { lat: 40, lon: -130 },  // Off Oregon
]

// Speed for visible movement - each waypoint transition takes ~30-60 seconds
// This makes their movement noticeable while still being leisurely
const FLAMINGO_BASE_SPEED = 0.0005

// Flamingo SVG icon for the map marker
const createFlamingoIcon = (flipped: boolean = false) => {
  return L.divIcon({
    className: 'flamingo-marker',
    html: `
      <div style="transform: ${flipped ? 'scaleX(-1)' : 'none'};">
        <svg width="30" height="38" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">
          <!-- Water ripple -->
          <ellipse cx="20" cy="48" rx="12" ry="2" fill="rgba(59, 130, 246, 0.3)">
            <animate attributeName="rx" values="10;14;10" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2s" repeatCount="indefinite"/>
          </ellipse>
          
          <!-- Flamingo body floating on water -->
          <ellipse cx="20" cy="42" rx="10" ry="5" fill="#F472B6">
            <animate attributeName="cy" values="42;40;42" dur="1.5s" repeatCount="indefinite"/>
          </ellipse>
          
          <!-- Wing detail -->
          <ellipse cx="22" cy="41" rx="6" ry="3" fill="#EC4899">
            <animate attributeName="cy" values="41;39;41" dur="1.5s" repeatCount="indefinite"/>
          </ellipse>
          
          <!-- Tail feathers -->
          <path d="M10 42 Q5 40 8 38" stroke="#F472B6" stroke-width="2" fill="none">
            <animate attributeName="d" values="M10 42 Q5 40 8 38;M10 40 Q4 38 7 36;M10 42 Q5 40 8 38" dur="1.5s" repeatCount="indefinite"/>
          </path>
          
          <!-- Long curved neck -->
          <path d="M25 40 Q35 35 32 20 Q30 10 22 8" stroke="#F472B6" stroke-width="4" fill="none" stroke-linecap="round">
            <animate attributeName="d" values="M25 40 Q35 35 32 20 Q30 10 22 8;M25 38 Q36 33 33 18 Q31 8 23 6;M25 40 Q35 35 32 20 Q30 10 22 8" dur="1.5s" repeatCount="indefinite"/>
          </path>
          
          <!-- Head -->
          <circle cx="22" cy="8" r="5" fill="#F472B6">
            <animate attributeName="cy" values="8;6;8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Eye -->
          <circle cx="20" cy="7" r="1.5" fill="white">
            <animate attributeName="cy" values="7;5;7" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="20" cy="7" r="0.8" fill="black">
            <animate attributeName="cy" values="7;5;7" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Beak -->
          <path d="M24 9 L30 11 L24 12 Z" fill="#1F2937">
            <animate attributeName="d" values="M24 9 L30 11 L24 12 Z;M24 7 L30 9 L24 10 Z;M24 9 L30 11 L24 12 Z" dur="1.5s" repeatCount="indefinite"/>
          </path>
          <path d="M27 10.5 L30 11 L27 11.5 Z" fill="#111827">
            <animate attributeName="d" values="M27 10.5 L30 11 L27 11.5 Z;M27 8.5 L30 9 L27 9.5 Z;M27 10.5 L30 11 L27 11.5 Z" dur="1.5s" repeatCount="indefinite"/>
          </path>
        </svg>
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
  })
}

export function InteractiveShipmentMap({ markers, loading }: InteractiveShipmentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const flamingoMarkersRef = useRef<L.Marker[]>([])
  const flamingoAnimationRef = useRef<number | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Only render on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapRef.current) return

    // Create map centered on US
    const map = L.map(mapContainerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
      zoomControl: true,
    })

    // Add tile layer with a clean style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map)

    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map)

    mapRef.current = map

    // Add CSS for flamingo animation
    const style = document.createElement('style')
    style.textContent = `
      .flamingo-marker {
        background: transparent !important;
        border: none !important;
      }
      @keyframes flamingo-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
    `
    document.head.appendChild(style)

    // Create 2 flamingos - Fifi on Atlantic, Fernando on Pacific
    const flamingo1 = L.marker([FIFI_ROUTE[0].lat, FIFI_ROUTE[0].lon], {
      icon: createFlamingoIcon(false),
      zIndexOffset: 1000,
    }).addTo(map)
    flamingo1.bindTooltip('Fifi the Flamingo', { permanent: false, direction: 'top', offset: [0, -30] })

    const flamingo2 = L.marker([FERNANDO_ROUTE[0].lat, FERNANDO_ROUTE[0].lon], {
      icon: createFlamingoIcon(false),
      zIndexOffset: 1000,
    }).addTo(map)
    flamingo2.bindTooltip('Fernando the Flamingo', { permanent: false, direction: 'top', offset: [0, -30] })

    flamingoMarkersRef.current = [flamingo1, flamingo2]

    // Routes for each flamingo - they follow their own ocean circuit
    const routes = [FIFI_ROUTE, FERNANDO_ROUTE]
    
    // Animation state - each flamingo follows its route sequentially, then reverses
    const flamingoStates = [
      { waypointIndex: 0, progress: 0, speed: FLAMINGO_BASE_SPEED * (0.9 + Math.random() * 0.2), direction: 1 },
      { waypointIndex: 0, progress: 0, speed: FLAMINGO_BASE_SPEED * (0.9 + Math.random() * 0.2), direction: 1 },
    ]

    // Animate flamingos along their ocean routes
    const animateFlamingos = () => {
      flamingoMarkersRef.current.forEach((flamingo, index) => {
        const state = flamingoStates[index]
        const route = routes[index]
        
        // Get current and next waypoint based on direction
        const currentIdx = state.waypointIndex
        const nextIdx = state.direction === 1 
          ? (currentIdx + 1) % route.length 
          : (currentIdx - 1 + route.length) % route.length
        
        const from = route[currentIdx]
        const to = route[nextIdx]

        // Interpolate position
        state.progress += state.speed
        
        if (state.progress >= 1) {
          // Reached waypoint, move to next in sequence
          state.waypointIndex = nextIdx
          state.progress = 0
          
          // Check if we need to reverse direction at route ends
          if (state.direction === 1 && state.waypointIndex === route.length - 1) {
            state.direction = -1 // Start going backwards
          } else if (state.direction === -1 && state.waypointIndex === 0) {
            state.direction = 1 // Start going forwards
          }
          
          // Slight speed variation to keep movement natural
          state.speed = FLAMINGO_BASE_SPEED * (0.9 + Math.random() * 0.2)
        }

        // Calculate current position with easing
        const easeProgress = state.progress < 0.5 
          ? 2 * state.progress * state.progress 
          : 1 - Math.pow(-2 * state.progress + 2, 2) / 2
        
        const lat = from.lat + (to.lat - from.lat) * easeProgress
        const lon = from.lon + (to.lon - from.lon) * easeProgress

        // Update flamingo position
        flamingo.setLatLng([lat, lon])

        // Update icon direction based on movement (flip when moving left/west)
        const isMovingLeft = to.lon < from.lon
        flamingo.setIcon(createFlamingoIcon(isMovingLeft))
      })

      flamingoAnimationRef.current = requestAnimationFrame(animateFlamingos)
    }

    animateFlamingos()

    return () => {
      if (flamingoAnimationRef.current) {
        cancelAnimationFrame(flamingoAnimationRef.current)
      }
      style.remove()
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      flamingoMarkersRef.current = []
    }
  }, [isClient])

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return

    // Clear existing markers
    markersLayerRef.current.clearLayers()

    // Add new markers
    markers.forEach((marker) => {
      if (marker.lat && marker.lon) {
        // Create pink circle marker
        const circleMarker = L.circleMarker([marker.lat, marker.lon], {
          radius: 6,
          fillColor: '#ec4899', // Pink-500
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        })

        // Add popup with order info
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 150px;">
            <div style="font-weight: 600; color: #ec4899; margin-bottom: 4px;">Order ${marker.orderNumber}</div>
            <div style="color: #374151;">
              ${marker.city}${marker.state ? `, ${marker.state}` : ''}<br/>
              ${marker.postalCode ? `${marker.postalCode}<br/>` : ''}
              ${marker.country}
            </div>
          </div>
        `
        circleMarker.bindPopup(popupContent)

        // Add tooltip on hover
        circleMarker.bindTooltip(`#${marker.orderNumber}`, {
          permanent: false,
          direction: 'top',
          offset: [0, -8],
        })

        markersLayerRef.current?.addLayer(circleMarker)
      }
    })

    // Fit bounds if we have markers - but keep it zoomed out enough to see flamingos
    if (markers.length > 0) {
      const validMarkers = markers.filter(m => m.lat && m.lon)
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lon]))
        // Expand bounds slightly to keep some ocean visible for flamingos
        const expandedBounds = bounds.pad(0.3) // 30% padding
        mapRef.current.fitBounds(expandedBounds, { padding: [30, 30], maxZoom: 5 })
      }
    }
  }, [markers])

  if (!isClient) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="text-muted-foreground">Loading map...</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading shipments...</span>
          </div>
        </div>
      )}
    </div>
  )
}
