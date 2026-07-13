'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const storeIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#ed2a2a;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(237,42,42,0.4);font-size:18px">🍜</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const customerIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#10b981;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,185,129,0.4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

interface MapClickHandlerProps {
  onLocationPick: (lat: number, lng: number) => void
}

function MapClickHandler({ onLocationPick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onLocationPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapViewUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

interface DeliveryMapInnerProps {
  storeLat: number
  storeLng: number
  customerLat: number
  customerLng: number
  radiusKm: number
  onLocationPick: (lat: number, lng: number) => void
}

export default function DeliveryMapInner({
  storeLat,
  storeLng,
  customerLat,
  customerLng,
  radiusKm,
  onLocationPick,
}: DeliveryMapInnerProps) {
  return (
    <MapContainer
      center={[customerLat, customerLng]}
      zoom={15}
      style={{ height: '280px', width: '100%' }}
      scrollWheelZoom
    >
      <MapViewUpdater lat={customerLat} lng={customerLng} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[storeLat, storeLng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: '#ed2a2a',
          fillColor: '#ed2a2a',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 6',
        }}
      />
      <Marker position={[storeLat, storeLng]} icon={storeIcon} />
      <Marker
        position={[customerLat, customerLng]}
        icon={customerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng()
            onLocationPick(lat, lng)
          },
        }}
      />
      <MapClickHandler onLocationPick={onLocationPick} />
    </MapContainer>
  )
}
