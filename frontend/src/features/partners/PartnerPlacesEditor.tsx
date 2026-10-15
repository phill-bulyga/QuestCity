import AddRoundedIcon from '@mui/icons-material/AddRounded'
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded'
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ApiError, api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { PartnerPlace } from './types'

export function PartnerPlacesEditor({ questId }: { questId: string }) {
  const { token } = useAuth()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-partners', questId], queryFn: () => api.getPartners(token!, questId) })
  const [places, setPlaces] = useState<PartnerPlace[]>([])
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (query.data) setPlaces(query.data) }, [query.data])
  const save = useMutation({ mutationFn: () => api.savePartners(token!, questId, places), onSuccess: async () => {
    setSaved(true)
    await client.invalidateQueries({ queryKey: ['admin-partners', questId] })
    await client.invalidateQueries({ queryKey: ['quest', questId] })
    await client.invalidateQueries({ queryKey: ['game'] })
  } })
  function update(id: string, changes: Partial<PartnerPlace>) {
    setSaved(false)
    setPlaces((current) => current.map((place) => place.id === id ? { ...place, ...changes } : place))
  }
  return <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
    <Stack component="form" spacing={3} onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
      <Box><Stack direction="row" gap={1} alignItems="center"><LocalCafeRoundedIcon color="primary" /><Typography variant="h2">Места для остановки и партнёры</Typography></Stack><Typography color="text.secondary" mt={1}>Места появятся на карте этого квеста. Подтверждённое партнёрство отмечается отдельно от обычной остановки.</Typography></Box>
      {query.isError && <Alert severity="error">Не удалось загрузить места.</Alert>}
      {save.error && <Alert severity="error">{save.error instanceof ApiError ? save.error.message : 'Не удалось сохранить места'}</Alert>}
      {saved && <Alert severity="success">Места сохранены и доступны на карте квеста.</Alert>}
      {places.map((place, index) => <Stack key={place.id} spacing={2} sx={{ p: 2.5, bgcolor: '#faf9fd', border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
        <Typography variant="h3">Остановка {index + 1}</Typography>
        <TextField label="Название места" required value={place.name} inputProps={{ minLength: 2, maxLength: 160 }} onChange={(event) => update(place.id, { name: event.target.value })} />
        <TextField select label="Тип места" value={place.category} onChange={(event) => update(place.id, { category: event.target.value as PartnerPlace['category'] })}><MenuItem value="coffee">Кофе</MenuItem><MenuItem value="food">Поесть</MenuItem><MenuItem value="rest">Отдохнуть</MenuItem></TextField>
        <TextField label="Адрес" required value={place.address} inputProps={{ minLength: 3, maxLength: 300 }} onChange={(event) => update(place.id, { address: event.target.value })} />
        <Stack direction={{ mobile: 'column', tablet: 'row' }} gap={2}>
          <TextField label="Широта" type="number" value={place.latitude ?? ''} inputProps={{ min: -90, max: 90, step: 'any' }} onChange={(event) => update(place.id, { latitude: event.target.value === '' ? null : Number(event.target.value) })} />
          <TextField label="Долгота" type="number" value={place.longitude ?? ''} inputProps={{ min: -180, max: 180, step: 'any' }} onChange={(event) => update(place.id, { longitude: event.target.value === '' ? null : Number(event.target.value) })} />
        </Stack>
        <Typography variant="caption" color="text.secondary">Для отметки на карте нужны обе координаты. Без них останется адресная карточка.</Typography>
        <TextField label="Короткое описание" multiline minRows={2} value={place.description} inputProps={{ maxLength: 1000 }} onChange={(event) => update(place.id, { description: event.target.value })} />
        <TextField label="Сайт или карточка на карте" type="url" value={place.website ?? ''} inputProps={{ maxLength: 1000 }} onChange={(event) => update(place.id, { website: event.target.value || null })} />
        <FormControlLabel label="Партнёрство с QuestCity подтверждено" control={<Checkbox checked={place.status === 'partner'} onChange={(event) => update(place.id, { status: event.target.checked ? 'partner' : 'candidate', offer: event.target.checked ? place.offer : '' })} />} />
        {place.status === 'partner' && <TextField label="Предложение партнёра" helperText="Только согласованное с заведением предложение" value={place.offer} inputProps={{ maxLength: 500 }} onChange={(event) => update(place.id, { offer: event.target.value })} />}
        <FormControlLabel label="Показывать место игрокам" control={<Checkbox checked={place.is_active} onChange={(event) => update(place.id, { is_active: event.target.checked })} />} />
        <Button color="inherit" onClick={() => { setPlaces((current) => current.filter((item) => item.id !== place.id)); setSaved(false) }}>Убрать из списка</Button>
      </Stack>)}
      <Button variant="outlined" startIcon={<AddRoundedIcon />} disabled={places.length >= 30 || save.isPending || query.isLoading || query.isError} onClick={() => { setSaved(false); setPlaces((current) => [...current, { id: crypto.randomUUID(), name: '', category: 'coffee', address: '', latitude: null, longitude: null, description: '', status: 'candidate', offer: '', website: null, is_active: true }]) }}>Добавить место</Button>
      <Divider />
      <Button type="submit" variant="contained" disabled={save.isPending || query.isLoading || query.isError}>{save.isPending ? 'Сохраняем…' : 'Сохранить места'}</Button>
    </Stack>
  </Paper>
}
