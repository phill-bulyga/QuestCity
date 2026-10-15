import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import StarsRoundedIcon from '@mui/icons-material/StarsRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded'
import { Alert, Box, Button, Container, Paper, Chip, Stack, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'

import { ApiError, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { AdventureMap } from '../features/map/AdventureMap'
import { GuideCard } from '../features/adventure/GuideCard'
import { PlacesAlongRoute } from '../features/partners/PlacesAlongRoute'

export function QuestDetailPage() {
  const { questId = '' } = useParams()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [placeCategory, setPlaceCategory] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const query = useQuery({ queryKey: ['quest', questId], queryFn: () => api.getQuest(token!, questId), enabled: Boolean(token && questId) })
  const start = useMutation({ mutationFn: () => api.startGame(token!, questId), onSuccess: (session) => navigate(`/play/${session.id}`) })
  if (query.isLoading) return <PageState title="Квест" loading />
  if (!query.data) return <PageState title="Квест недоступен" message="Не удалось открыть маршрут. Вернитесь в каталог и попробуйте ещё раз." />
  const quest = query.data
  const ready = quest.status === 'published' && quest.checkpoints.length > 0
  const places = quest.partner_places ?? []

  return <Box minHeight="100dvh" pb={8}>
    <PageHeader title={quest.title} backTo="/quests" />
    <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 } }}>
      <Stack spacing={4}>
        <Box sx={{ position: 'relative', overflow: 'hidden', color: 'white', p: { mobile: 2, tablet: 5 }, borderRadius: '10px', background: 'radial-gradient(circle at 90% 10%, #7550b4, transparent 42%), #2b194c' }}>
          <RouteRoundedIcon sx={{ position: 'absolute', right: -15, bottom: -30, fontSize: 210, opacity: 0.08 }} />
          <Stack spacing={2} sx={{ position: 'relative', maxWidth: 800 }}>
            <Typography fontSize={12} fontWeight={800} letterSpacing={1.5} color="#d8c5ff">{quest.city.toLocaleUpperCase('ru')} / ГОРОДСКОЕ ПРИКЛЮЧЕНИЕ</Typography>
            <Typography component="h1" sx={{ fontSize: { mobile: 34, tablet: 48 }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.035em' }}>{quest.title}</Typography>
            <Typography sx={{ color: '#e2d8f0', fontSize: 18 }}>{quest.short_description || 'Следуйте за подсказками и раскройте свою историю города.'}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}><Chip icon={<ScheduleRoundedIcon />} label={`${quest.estimated_duration_minutes} мин`} sx={{ bgcolor: '#ffffff22', color: 'white', '& .MuiChip-icon': { color: '#d8c5ff' } }} /><Chip icon={<RouteRoundedIcon />} label={`Глав: ${quest.checkpoints.length}`} sx={{ bgcolor: '#ffffff22', color: 'white', '& .MuiChip-icon': { color: '#d8c5ff' } }} /></Stack>
          </Stack>
        </Box>
        <GuideCard guide={quest.guide} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', laptop: 'minmax(0, 1.5fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { mobile: 2.5, tablet: 3 } }}>
              <Typography component="h2" variant="h2" mb={1}>Здесь начинается ваша история</Typography>
              <Typography color="text.secondary" mb={3}>На карте — начало прогулки и места для остановки. Следующие точки откроются по ходу игры.</Typography>
              <AdventureMap location={quest.start_location} partners={places.filter((place) => placeCategory === 'all' || place.category === placeCategory)} selectedId={selectedPlace} onSelect={setSelectedPlace} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h2" mb={2}>Каждая остановка — новая глава</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" aria-label="Главы маршрута">{quest.checkpoints.map((point, index) => <Box key={point.id} sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: index === 0 ? 'primary.main' : '#f1edfa', color: index === 0 ? 'white' : 'primary.main', fontWeight: 800 }}>{String(index + 1).padStart(2, '0')}</Box>)}</Stack>
              <Typography variant="body2" color="text.secondary" mt={2}>Получите ориентир, найдите место и ответьте на вопрос. История продолжится даже если ответ не получится с первого раза.</Typography>
            </Paper>
          </Stack>
          <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 }, position: { laptop: 'sticky' }, top: 104 }}>
            <Stack spacing={3}>
              <Typography variant="h2">Отправимся в путь?</Typography>
              <Stack spacing={2}>{[[<LightbulbRoundedIcon />, 'Замечайте детали', 'Подсказки и факты помогут увидеть город по-новому.'], [<StarsRoundedIcon />, 'Собирайте открытия', `Решайте задания и набирайте баллы${quest.max_score ? ` — до ${quest.max_score} за маршрут` : ''}.`], [<LocalCafeRoundedIcon />, 'Гуляйте в своём темпе', 'Можно остановиться на кофе и продолжить с той же главы.']].map(([icon, title, text], index) => <Stack key={index} direction="row" gap={1.5}><Box sx={{ color: 'primary.main', mt: .5 }}>{icon}</Box><Box><Typography fontWeight={700}>{title}</Typography><Typography color="text.secondary" variant="body2">{text}</Typography></Box></Stack>)}</Stack>
              {quest.demo_mode && <Alert severity="info">Демо-прогулка: GPS не нужен. Вопрос открывается кнопкой «Я у точки».</Alert>}
              {!ready && <Alert severity="info">Маршрут ещё готовится к публикации.</Alert>}
              {start.error && <Alert severity="error">{start.error instanceof ApiError ? start.error.message : 'Не удалось начать квест'}</Alert>}
              <Button fullWidth variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={!ready || start.isPending} onClick={() => start.mutate()}>{start.isPending ? 'Начинаем приключение…' : 'Начать приключение'}</Button>
              {!ready && quest.author_id === user?.id && <Button component={RouterLink} to={`/quests/${quest.id}/edit`}>Продолжить в конструкторе</Button>}
              <Typography variant="caption" textAlign="center" color="text.secondary">Ответы и прогресс сохраняются после каждого действия.</Typography>
            </Stack>
          </Paper>
        </Box>
        <PlacesAlongRoute onCategoryChange={(value) => { setPlaceCategory(value); setSelectedPlace(null) }} places={places} origin={quest.start_location} selectedId={selectedPlace} onSelect={setSelectedPlace} />
      </Stack>
    </Container>
  </Box>
}
