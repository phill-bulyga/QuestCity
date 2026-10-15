import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapLocation, PartnerPlace } from '../partners/types'

interface AdventureMapProps {
  location?: MapLocation | null
  pointNumber?: number
  partners?: PartnerPlace[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function AdventureMap({ location, pointNumber = 1, partners = [], selectedId, onSelect }: AdventureMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const select = useRef(onSelect)
  const [tileError, setTileError] = useState(false)
  useEffect(() => { select.current = onSelect }, [onSelect])
  const data = JSON.stringify({ location: location ? { latitude: location.latitude, longitude: location.longitude } : null, pointNumber, partners })

  useEffect(() => {
    const state = JSON.parse(data) as { location?: MapLocation; pointNumber: number; partners: PartnerPlace[] }
    const places = state.partners.filter((place) => place.latitude !== null && place.longitude !== null)
    if (!container.current || (!state.location && !places.length)) return
    const markerCollection = markers.current
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false })
    map.current = instance
    L.control.zoom({ zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(instance)
    const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    const bounds: L.LatLngTuple[] = []
    if (state.location) {
      const pos: L.LatLngTuple = [state.location.latitude, state.location.longitude]
      bounds.push(pos)
      L.marker(pos, { icon: L.divIcon({ className: 'quest-pin', html: `<span>${state.pointNumber}</span>`, iconSize: [38, 38], iconAnchor: [19, 38] }), title: `Точка ${state.pointNumber}`, alt: `Точка ${state.pointNumber}` }).addTo(instance).getElement()?.setAttribute('aria-label', `Точка ${state.pointNumber}`)
    }
    places.forEach((place) => {
      const pos: L.LatLngTuple = [place.latitude!, place.longitude!]
      bounds.push(pos)
      const emoji = place.category === 'coffee' ? '☕' : place.category === 'food' ? '🍽' : '🪑'
      const marker = L.marker(pos, { icon: L.divIcon({ className: `stop-pin ${place.status}`, html: `<span>${emoji}</span>`, iconSize: [36, 36], iconAnchor: [18, 36] }), title: place.name, alt: place.name }).addTo(instance)
      marker.getElement()?.setAttribute('aria-label', place.name)
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = place.name
      popup.append(heading, document.createElement('br'), document.createTextNode(place.address))
      marker.bindPopup(popup).on('click', () => select.current?.(place.id))
      markerCollection.set(place.id, marker)
    })
    instance.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 })
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => { observer.disconnect(); markerCollection.clear(); instance.remove(); map.current = null }
  }, [data])

  useEffect(() => {
    if (!selectedId) return
    const marker = markers.current.get(selectedId)
    if (marker && map.current) {
      map.current.panTo(marker.getLatLng())
      marker.openPopup()
      map.current.getContainer().scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [selectedId, data])

  const hasData = Boolean(location || partners.some((place) => place.latitude !== null))
  return <Stack spacing={1.5}>
    {hasData ? <Box ref={container} role="region" aria-label="Карта точки квеста и мест для остановки" sx={{ height: { mobile: 300, tablet: 390 }, borderRadius: '10px', bgcolor: '#ebe8f3', position: 'relative', zIndex: 0, scrollMarginTop: 110 }} /> : <Box sx={{ p: 4, bgcolor: '#f1edfa', borderRadius: '10px', textAlign: 'center' }}><Typography variant="h3">Маршрут скоро появится на карте</Typography><Typography color="text.secondary" mt={1}>Автору осталось подтвердить места и координаты.</Typography></Box>}
    {tileError && <Alert severity="info">Подложка карты недоступна. Адреса и ссылки на места остаются в карточках ниже.</Alert>}
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" label="● Точка квеста" sx={{ color: 'primary.main', bgcolor: '#f1edfa' }} /><Chip size="small" label="● Место для остановки" sx={{ color: '#a35b1b', bgcolor: '#fff2e3' }} />{partners.some((place) => place.status === 'partner') && <Chip size="small" label="● Партнёр QuestCity" sx={{ color: '#168765', bgcolor: '#e7f5ef' }} />}</Stack>
  </Stack>
}
