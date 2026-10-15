import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded'
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded'
import WeekendRoundedIcon from '@mui/icons-material/WeekendRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { MapLocation, PartnerPlace } from './types'

const categories = { coffee: 'Кофе', food: 'Поесть', rest: 'Отдохнуть' }

function distance(place: PartnerPlace, origin?: MapLocation | null) {
  if (!origin || place.latitude === null || place.longitude === null) return null
  const rad = Math.PI / 180
  const dy = (place.latitude - origin.latitude) * rad
  const dx = (place.longitude - origin.longitude) * rad
  const a = Math.sin(dy / 2) ** 2 + Math.cos(origin.latitude * rad) * Math.cos(place.latitude * rad) * Math.sin(dx / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function PlacesAlongRoute({ places, origin, selectedId, onSelect, onCategoryChange }: { places: PartnerPlace[]; origin?: MapLocation | null; selectedId?: string | null; onSelect?: (id: string) => void; onCategoryChange?: (category: string) => void }) {
  const [category, setCategory] = useState('all')
  const visible = places.filter((place) => category === 'all' || place.category === category)
    .sort((a, b) => (distance(a, origin) ?? Infinity) - (distance(b, origin) ?? Infinity))
  return <Stack spacing={2.5}>
    <Box><Typography component="h2" variant="h2">Пауза — тоже часть приключения</Typography><Typography color="text.secondary" mt={1}>Кофе, обед или передышка по пути. Остановка не сбрасывает прогресс квеста.</Typography></Box>
    {places.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap" aria-label="Тип остановки"><Chip label="Все места" clickable color={category === 'all' ? 'primary' : 'default'} onClick={() => { setCategory('all'); onCategoryChange?.('all') }} />{Object.entries(categories).map(([value, label]) => <Chip key={value} label={label} clickable color={category === value ? 'primary' : 'default'} onClick={() => { setCategory(value); onCategoryChange?.(value) }} />)}</Stack>}
    {!visible.length && <Paper variant="outlined" sx={{ p: 3 }}><Typography color="text.secondary">{places.length ? 'Таких мест пока нет. Посмотрите другие остановки.' : 'Места для остановки ещё не добавлены к этому маршруту.'}</Typography></Paper>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', tablet: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      {visible.map((place) => {
        const Icon = place.category === 'coffee' ? LocalCafeRoundedIcon : place.category === 'food' ? RestaurantRoundedIcon : WeekendRoundedIcon
        const meters = distance(place, origin)
        const url = place.website ?? (place.latitude !== null && place.longitude !== null ? `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}` : `https://yandex.ru/maps/?text=${encodeURIComponent(place.address + ' ' + place.name)}`)
        return <Paper key={place.id} variant="outlined" sx={{ p: 3, borderColor: selectedId === place.id ? 'primary.main' : 'divider' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#fff2e3', color: '#a35b1b', display: 'flex' }}><Icon /></Box><Box><Typography fontWeight={800}>{place.name}</Typography><Typography variant="body2" color="text.secondary">{categories[place.category]}</Typography></Box></Stack>
            <Chip size="small" label={place.status === 'partner' ? 'Партнёр QuestCity' : 'Место для остановки'} sx={{ alignSelf: 'flex-start', bgcolor: place.status === 'partner' ? '#e7f5ef' : '#f1edfa' }} />
            <Typography variant="body2" color="text.secondary">{place.address}</Typography>
            {place.description && <Typography variant="body2">{place.description}</Typography>}
            {meters !== null && <Typography variant="caption" color="text.secondary">{meters < 1000 ? `${Math.round(meters / 10) * 10} м` : `${(meters / 1000).toFixed(1)} км`} по прямой от {origin ? 'точки маршрута' : 'старта'}</Typography>}
            {place.status === 'partner' && place.offer && <Box sx={{ p: 1.5, bgcolor: '#e7f5ef', borderRadius: '8px' }}><Typography variant="body2" fontWeight={700}>{place.offer}</Typography></Box>}
            <Stack direction="row" flexWrap="wrap" gap={1}>{place.latitude !== null && <Button size="small" onClick={() => onSelect?.(place.id)}>На карте</Button>}<Button size="small" component="a" href={url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon fontSize="small" />}>Карточка места</Button></Stack>
          </Stack>
        </Paper>
      })}
    </Box>
    {places.some((place) => place.status === 'candidate') && <Typography variant="caption" color="text.secondary">Места для остановки пока не являются подтверждёнными партнёрами QuestCity. Часы работы и меню уточняйте у заведения.</Typography>}
  </Stack>
}
