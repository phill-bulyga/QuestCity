import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { AdventureMap } from '../features/map/AdventureMap'
import { PlacesAlongRoute } from '../features/partners/PlacesAlongRoute'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import StarsRoundedIcon from '@mui/icons-material/StarsRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'

import {
  ApiError,
  type AnswerResponse,
  type ArrivalResponse,
  type CheckpointReveal,
  api,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { GuideCard } from '../features/adventure/GuideCard'

export function GamePage() {
  const { sessionId = '' } = useParams()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [placeCategory, setPlaceCategory] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [revealPoints, setRevealPoints] = useState(0)
  const [isLocating, setIsLocating] = useState(false)
  const [answer, setAnswer] = useState('')
  const [ordered, setOrdered] = useState<{ checkpointId: string; items: string[] } | null>(null)
  const [hintConfirm, setHintConfirm] = useState<{ checkpointId: string; index: number; cost: number } | null>(null)
  const [message, setMessage] = useState<{ severity: 'success' | 'warning' | 'info'; text: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reveal, setReveal] = useState<CheckpointReveal | null>(null)

  const query = useQuery({
    queryKey: ['game', sessionId],
    queryFn: () => api.getGame(token!, sessionId),
    enabled: Boolean(token && sessionId),
  })

  function updateSession(result: ArrivalResponse | AnswerResponse) {
    queryClient.setQueryData(['game', sessionId], result.session)
  }

  const unlockMutation = useMutation({
    mutationFn: () => api.unlockWithoutLocation(token!, sessionId),
    onSuccess: (result) => {
      updateSession(result)
      setActionError(null)
      setMessage({ severity: 'success', text: 'Точка открыта. Можно отвечать на вопрос.' })
    },
    onError: (reason) => setActionError(reason instanceof ApiError ? reason.message : 'Не удалось открыть задание'),
  })

  const factMutation = useMutation({
    mutationFn: () => api.nextTravelFact(token!, sessionId),
    onSuccess: (nextSession) => queryClient.setQueryData(['game', sessionId], nextSession),
    onError: (reason) => setActionError(reason instanceof ApiError ? reason.message : 'Не удалось открыть факт'),
  })

  const answerMutation = useMutation({
    mutationFn: () => {
      const point = query.data!.current_checkpoint!
      return api.submitAnswer(token!, sessionId, point.task_type === 'ordering' ? ordered?.checkpointId === point.id ? ordered.items : point.answer_options : answer)
    },
    onSuccess: (result) => {
      updateSession(result)
      setAnswer('')
      if (result.reveal) setOrdered(null)
      if (result.reveal) { setReveal(result.reveal); setRevealPoints(result.points_awarded) }
      if (result.is_correct) {
        setMessage({ severity: 'success', text: `Верно! Начислено ${result.points_awarded} баллов.` })
      } else if (result.correct_answer) {
        setMessage({ severity: 'warning', text: `Попытки закончились. Правильный ответ: ${result.correct_answer}` })
      } else {
        setMessage({ severity: 'warning', text: `Неверно. Осталось попыток: ${result.attempts_remaining}.` })
      }
    },
  })

  const hintMutation = useMutation({
    mutationFn: (hint: { checkpointId: string; index: number }) => api.openHint(token!, sessionId, hint.checkpointId, hint.index),
    onSuccess: (next) => { queryClient.setQueryData(['game', sessionId], next); setHintConfirm(null); setActionError(null) },
    onError: (reason) => { setHintConfirm(null); setActionError(reason instanceof ApiError ? reason.message : 'Не удалось открыть подсказку') },
  })

  const arrivalMutation = useMutation({
    mutationFn: (position: { latitude: number; longitude: number; accuracy_m: number }) => api.confirmArrival(token!, sessionId, position),
    onSuccess: (result) => { updateSession(result); setActionError(result.arrived ? null : `До точки ещё ${Math.round(result.distance_m)} м по прямой. Подойдите ближе.`) },
    onError: () => setActionError('Не удалось подтвердить прибытие. Попробуйте ещё раз.'),
  })

  function confirmLocation() {
    if (!navigator.geolocation) { setActionError('Геолокация недоступна в этом браузере.'); return }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition((position) => {
      setIsLocating(false)
      arrivalMutation.mutate({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_m: position.coords.accuracy })
    }, () => { setIsLocating(false); setActionError('Не удалось получить местоположение. Разрешите доступ к геолокации и попробуйте снова.') }, { enableHighAccuracy: true, timeout: 15000 })
  }

  function handleAnswer(event: FormEvent) {
    event.preventDefault()
    if (query.data?.current_checkpoint?.task_type === 'ordering' || answer.trim()) answerMutation.mutate()
  }

  if (query.isLoading) return <PageState title="Игра" loading />
  if (!query.data) return <PageState title="Игра недоступна" message="Не удалось открыть игровую сессию. Выберите маршрут в каталоге." />
  const session = query.data
  const checkpoint = session.current_checkpoint
  const progress = session.checkpoint_count ? (session.current_checkpoint_index / session.checkpoint_count) * 100 : 0

  if (session.status === 'completed') {
    return (
      <>
        <RevealDialog reveal={reveal} points={revealPoints} onClose={() => setReveal(null)} />
        <Box minHeight="100dvh">
          <PageHeader title="Квест завершён" backTo="/quests" />
          <Container component="main" maxWidth="tablet" sx={{ py: { mobile: 4, tablet: 7 } }}>
            <Stack alignItems="center" textAlign="center" spacing={2.5} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: { mobile: 2, tablet: 4 } }}>
              <CheckCircleRoundedIcon color="success" sx={{ fontSize: 80 }} />
              <Typography component="h1" variant="h1">Город стал чуть ближе</Typography>
              <Typography color="text.secondary">Вы завершили «{session.quest_title}» и открыли {session.checkpoint_count} глав.</Typography>
              <GuideCard guide={session.guide} message={session.guide?.completion} />
              <Stack direction="row" alignItems="center" gap={1}>
                <StarsRoundedIcon color="warning" />
                <Typography variant="h2">{session.score} баллов</Typography>
              </Stack>
              {session.reward ? (
                <Card variant="outlined" sx={{ width: '100%', textAlign: 'left' }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="h3">Ваш приз</Typography>
                      <Typography>{session.reward.offer}</Typography>
                      <Typography fontWeight={700}>{session.reward.partner_name}</Typography>
                      {session.reward.venue_address && <Typography>{session.reward.venue_address}</Typography>}
                      <Typography variant="h2" color="primary" sx={{ userSelect: 'all' }}>{session.reward.promo_code}</Typography>
                      <Typography variant="body2">{session.reward.redemption_instructions}</Typography>
                      {session.reward.is_demo && <Alert severity="warning">Учебный промокод для демонстрации. Не действует в реальном заведении.</Alert>}
                    </Stack>
                  </CardContent>
                </Card>
              ) : session.reward_min_score !== null ? (
                <Alert severity="info">Для приза нужно набрать {session.reward_min_score} баллов.</Alert>
              ) : null}
              <Journal entries={session.journal ?? []} />
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
              <Button component={RouterLink} to="/quests" variant="contained" fullWidth>Вернуться к квестам</Button>
            </Stack>
          </Container>
        </Box>
      </>
    )
  }

  return <>
    <Dialog open={Boolean(hintConfirm)} onClose={() => { if (!hintMutation.isPending) setHintConfirm(null) }} fullWidth maxWidth="tablet">
      <DialogContent><Typography variant="h2" mb={2}>Открыть подсказку?</Typography><Typography>Награда этой точки уменьшится на {hintConfirm?.cost ?? 0} баллов. Уже заработанные баллы сохранятся. Подсказка останется доступной после перезагрузки.</Typography></DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}><Button disabled={hintMutation.isPending} onClick={() => setHintConfirm(null)}>Продолжить самостоятельно</Button><Button variant="contained" disabled={hintMutation.isPending || answerMutation.isPending} onClick={() => { if (hintConfirm) hintMutation.mutate(hintConfirm) }}>{hintMutation.isPending ? 'Открываем…' : `Открыть за ${hintConfirm?.cost ?? 0} баллов`}</Button></DialogActions>
    </Dialog>
    <RevealDialog reveal={reveal} points={revealPoints} onClose={() => setReveal(null)} />
    <Box minHeight="100dvh" pb={7}>
      <PageHeader title={session.quest_title} backTo="/quests" />
      <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 4 } }}>
        <Stack spacing={3}>
          <Box sx={{ color: 'white', bgcolor: '#2b194c', borderRadius: '10px', p: { mobile: 2, tablet: 4 } }}>
            <Stack direction={{ mobile: 'column', tablet: 'row' }} justifyContent="space-between" alignItems={{ tablet: 'center' }} gap={2}>
              <Box><Typography color="#cbb4ff" fontSize={12} fontWeight={800} letterSpacing={1.5} mb={1}>ВАША ГОРОДСКАЯ ЭКСПЕДИЦИЯ</Typography><Typography component="h1" variant="h2">{session.quest_title}</Typography></Box>
              <Chip icon={<StarsRoundedIcon />} label={`${session.score}${session.max_score ? ` / ${session.max_score}` : ''} баллов`} sx={{ color: 'white', bgcolor: '#ffffff20', '& .MuiChip-icon': { color: '#ffc87d' } }} />
            </Stack>
            <Stack direction="row" justifyContent="space-between" mt={3} mb={1}><Typography variant="body2">Глава {session.current_checkpoint_index + 1} из {session.checkpoint_count}</Typography><Typography variant="body2" color="#d8c8ee">Пройдено {session.current_checkpoint_index}</Typography></Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 5, bgcolor: '#ffffff22', '& .MuiLinearProgress-bar': { bgcolor: '#cbb4ff' } }} />
          </Box>
          <GuideCard guide={session.guide} message={session.current_checkpoint_index === 0 && !checkpoint?.is_unlocked ? session.guide?.introduction : checkpoint?.is_unlocked ? 'Мы на месте! Внимательно посмотрите на детали и попробуйте решить задание. Если понадобится помощь, подсказки рядом.' : `Следующая глава ждёт нас впереди. ${checkpoint?.route_clue || 'Найдите следующий ориентир на карте.'}`} />
          {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
          {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
          {answerMutation.error && <Alert severity="error">{answerMutation.error instanceof ApiError ? answerMutation.error.message : 'Не удалось проверить ответ'}</Alert>}
          {checkpoint && <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', laptop: 'minmax(0, 1.1fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
                <Stack direction="row" gap={1} flexWrap="wrap" mb={3}>
                  <Chip size="small" label="1. Найдите место" color={!checkpoint.is_unlocked ? 'primary' : 'default'} />
                  <Chip size="small" label="2. Решите загадку" color={checkpoint.is_unlocked ? 'primary' : 'default'} />
                  <Chip size="small" label="3. Откройте историю" variant="outlined" />
                </Stack>
                {!checkpoint.is_unlocked ? <Stack spacing={2.5}>
                  <Typography color="primary.main" fontSize={12} fontWeight={800} letterSpacing={1.5}>СЛЕДУЮЩИЙ ОРИЕНТИР</Typography>
                  <Typography component="h2" variant="h2" sx={{ fontSize: { mobile: 25, tablet: 30 } }}>{checkpoint.route_clue || 'Найдите следующую точку на карте'}</Typography>
                  <Typography color="text.secondary">Оглядитесь по пути: городские детали иногда рассказывают больше, чем кажется.</Typography>
                  <Button variant="contained" startIcon={<PlaceRoundedIcon />} disabled={unlockMutation.isPending || isLocating || arrivalMutation.isPending} onClick={() => session.demo_mode ? unlockMutation.mutate() : confirmLocation()}>{unlockMutation.isPending || isLocating || arrivalMutation.isPending ? 'Открываем главу…' : 'Я у точки — открыть задание'}</Button>
                  {session.demo_mode && <Typography variant="caption" color="text.secondary">Демо-режим: точку можно открыть без GPS.</Typography>}
                </Stack> : <Stack component="form" spacing={2.5} onSubmit={handleAnswer}>
                  <Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" label={`До ${checkpoint.points ?? 0} баллов`} icon={<StarsRoundedIcon />} /><Chip size="small" label={`Попыток осталось: ${checkpoint.attempts_remaining}`} /></Stack>
                  <Box><Typography color="primary.main" fontSize={12} fontWeight={800} letterSpacing={1.5} mb={1}>{checkpoint.title}</Typography><Typography color="text.secondary">{checkpoint.description}</Typography></Box>
                  <Typography component="h2" variant="h2" sx={{ fontSize: { mobile: 25, tablet: 30 } }}>{checkpoint.task_prompt}</Typography>
                  {checkpoint.task_type === 'photo' && checkpoint.task_image_url && <Box component="figure" sx={{ m: 0 }}><Box component="img" src={checkpoint.task_image_url} alt={checkpoint.task_image_caption || 'Изображение к фотозагадке'} sx={{ width: '100%', maxHeight: 440, objectFit: 'contain', bgcolor: '#f1edfa', borderRadius: '10px' }} />{checkpoint.task_image_caption && <Typography component="figcaption" variant="body2" color="text.secondary" mt={1}>{checkpoint.task_image_caption}</Typography>}</Box>}
                  {checkpoint.task_type === 'ordering' ? <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">Восстановите порядок. Перемещайте элементы кнопками ↑ и ↓.</Typography>
                    {(ordered?.checkpointId === checkpoint.id ? ordered.items : checkpoint.answer_options).map((item, index, items) => <Paper key={item} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={800} color="primary.main">{index + 1}</Typography><Typography sx={{ flex: 1 }}>{item}</Typography><Stack><Button aria-label={`Поднять: ${item}`} disabled={index === 0 || answerMutation.isPending || hintMutation.isPending} sx={{ minWidth: 44, px: 1 }} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setOrdered({ checkpointId: checkpoint.id, items: next }) }}>↑</Button><Button aria-label={`Опустить: ${item}`} disabled={index === items.length - 1 || answerMutation.isPending || hintMutation.isPending} sx={{ minWidth: 44, px: 1 }} onClick={() => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setOrdered({ checkpointId: checkpoint.id, items: next }) }}>↓</Button></Stack></Stack></Paper>)}
                  </Stack> : checkpoint.task_type === 'single_choice' || (checkpoint.task_type === 'photo' && checkpoint.answer_options.length > 0) ? <RadioGroup aria-label="Варианты ответа" sx={{ gap: 1.5, '& .MuiFormControlLabel-root': { m: 0, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px', '&:has(.Mui-checked)': { bgcolor: '#f1edfa', borderColor: 'primary.main' } } }} value={answer} onChange={(event) => setAnswer(event.target.value)}>
                    {checkpoint.answer_options.map((option, index) => <FormControlLabel key={option} value={option} control={<Radio />} label={<Stack direction="row" gap={1.5} alignItems="center"><Typography color="text.secondary" fontWeight={800}>{String.fromCharCode(65 + index)}</Typography><Typography>{option}</Typography></Stack>} />)}
                  </RadioGroup> : <TextField label="Ваш ответ" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" />}
                  <Button type="submit" variant="contained" disabled={(checkpoint.task_type !== 'ordering' && !answer.trim()) || answerMutation.isPending || hintMutation.isPending}>{answerMutation.isPending ? 'Проверяем ответ…' : 'Проверить мою версию'}</Button>
                  {checkpoint.hint_count > 0 && <Stack spacing={1.5}>
                    <Typography variant="h3">Помощь проводника</Typography>
                    {(checkpoint.hints ?? []).map((hint, index) => <Alert key={index} severity="info"><Typography variant="body2" fontWeight={700}>Подсказка {index + 1} · −{hint.cost} баллов</Typography>{hint.text}</Alert>)}
                    {checkpoint.hint_penalty > 0 && <Typography variant="body2" color="text.secondary">Подсказки уменьшили награду на {checkpoint.hint_penalty} баллов. За верный ответ получите {checkpoint.points}.</Typography>}
                    {checkpoint.next_hint_cost !== null && <Button variant="outlined" startIcon={<LightbulbRoundedIcon />} disabled={answerMutation.isPending || hintMutation.isPending} onClick={() => setHintConfirm({ checkpointId: checkpoint.id, index: checkpoint.hints.length, cost: checkpoint.next_hint_cost! })}>Открыть подсказку · −{checkpoint.next_hint_cost} баллов</Button>}
                  </Stack>}
                  <Typography variant="body2" color="text.secondary">Если не получится, попробуйте снова. После задания вас ждёт новая часть истории.</Typography>
                </Stack>}
              </Paper>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={2}><LightbulbRoundedIcon color="primary" /><Typography component="h2" variant="h2" sx={{ flex: 1 }}>Открытия по дороге</Typography><Chip size="small" label={`${checkpoint.travel_fact_index} / ${checkpoint.travel_fact_count}`} /></Stack>
                <Stack spacing={2}>
                  {checkpoint.travel_facts.map((fact, index) => <Box key={index} sx={{ p: 2, bgcolor: '#f1edfa', borderRadius: '10px' }}><Typography fontWeight={700} mb={0.5}>{fact.title}</Typography><Typography variant="body2">{fact.text}</Typography></Box>)}
                  {checkpoint.travel_fact_count === 0 && <Typography color="text.secondary">На этой главе главным открытием станет само место.</Typography>}
                  {!checkpoint.is_unlocked && checkpoint.travel_fact_index < checkpoint.travel_fact_count && <Button variant="outlined" startIcon={<LightbulbRoundedIcon />} disabled={factMutation.isPending} onClick={() => factMutation.mutate()}>{factMutation.isPending ? 'Открываем…' : 'Открыть следующее открытие'}</Button>}
                  {checkpoint.is_unlocked && checkpoint.travel_fact_index === 0 && checkpoint.travel_fact_count > 0 && <Typography color="text.secondary" variant="body2">Дорожные факты открываются до прибытия на точку. Сейчас вас ждёт задание.</Typography>}
                </Stack>
              </Paper>
            </Stack>
            <Paper variant="outlined" sx={{ p: { mobile: 2.5, tablet: 3 }, position: { laptop: 'sticky' }, top: 104 }}>
              <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="space-between" alignItems="center" mb={2}><Typography component="h2" variant="h2">Ваш ориентир</Typography><Chip size="small" icon={<ScheduleRoundedIcon />} label="В своём темпе" /></Stack>
              <AdventureMap location={checkpoint} pointNumber={session.current_checkpoint_index + 1} partners={(session.partner_places ?? []).filter((place) => placeCategory === 'all' || place.category === placeCategory)} selectedId={selectedPlace} onSelect={setSelectedPlace} />
              <Button component="a" href={`https://www.openstreetmap.org/?mlat=${checkpoint.latitude}&mlon=${checkpoint.longitude}#map=17/${checkpoint.latitude}/${checkpoint.longitude}`} target="_blank" rel="noreferrer" startIcon={<ExploreRoundedIcon />} fullWidth sx={{ mt: 2 }}>Открыть точку в карте</Button>
            </Paper>
          </Box>}
          <Journal entries={session.journal ?? []} />
          <PlacesAlongRoute onCategoryChange={(value) => { setPlaceCategory(value); setSelectedPlace(null) }} places={session.partner_places ?? []} origin={checkpoint} selectedId={selectedPlace} onSelect={setSelectedPlace} />
        </Stack>
      </Container>
    </Box>
  </>
}

function Journal({ entries }: { entries: (CheckpointReveal & { chapter: number; checkpoint_title: string })[] }) {
  return <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 3 }, width: '100%', textAlign: 'left' }}>
    <Stack direction="row" alignItems="center" gap={1} mb={1}><AutoStoriesRoundedIcon color="primary" /><Typography component="h2" variant="h2">Дневник открытий</Typography><Chip size="small" label={entries.length} /></Stack>
    <Typography color="text.secondary" variant="body2" mb={2}>Истории пройденных мест остаются с вами. К ним можно вернуться после прогулки.</Typography>
    {!entries.length && <Stack direction="row" alignItems="center" gap={1} sx={{ color: 'text.secondary', py: 1 }}><LockRoundedIcon fontSize="small" /><Typography variant="body2">Первая запись откроется после задания.</Typography></Stack>}
    {entries.map((entry) => <Accordion key={entry.chapter} disableGutters elevation={0} sx={{ borderTop: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
      <AccordionSummary sx={{ px: { mobile: 0, tablet: 2 } }} expandIcon={<ExpandMoreRoundedIcon />}><Typography fontWeight={700}>{String(entry.chapter).padStart(2, '0')} · {entry.title || entry.checkpoint_title}</Typography></AccordionSummary>
      <AccordionDetails sx={{ px: { mobile: 0, tablet: 2 } }}>{entry.image_url && <Box component="img" src={entry.image_url} alt={entry.media_caption || entry.title} sx={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: '10px', mb: 2 }} />}<Typography sx={{ whiteSpace: 'pre-line' }}>{entry.text || 'Эта глава маршрута уже пройдена.'}</Typography>{entry.audio_url && <Box component="audio" controls src={entry.audio_url} sx={{ width: '100%', mt: 2 }} />}</AccordionDetails>
    </Accordion>)}
  </Paper>
}

function RevealDialog({ reveal, points, onClose }: { reveal: CheckpointReveal | null; points: number; onClose: () => void }) {
  return (
    <Dialog open={Boolean(reveal)} onClose={onClose} fullWidth maxWidth="tablet">
      {reveal && (
        <>
          {reveal.image_url && (
            <Box
              component="img"
              src={reveal.image_url}
              alt={reveal.media_caption || reveal.title}
              sx={{ width: '100%', maxHeight: 360, objectFit: 'cover' }}
            />
          )}
          <DialogContent>
            <Stack spacing={2}>
              <Box>
                <Chip icon={<CheckCircleRoundedIcon />} label={points > 0 ? `Верно! +${points} баллов` : 'Новая глава открыта'} color={points > 0 ? 'success' : 'primary'} sx={{ mb: 2 }} />
                <Typography color="primary" fontWeight={700} mb={0.5}>ЕЩЁ ОДНА ИСТОРИЯ ГОРОДА</Typography>
                <Typography variant="h2">{reveal.title || 'Вы открыли новую главу'}</Typography>
              </Box>
              <Typography sx={{ whiteSpace: 'pre-line' }}>{reveal.text || 'Следующая часть приключения уже ждёт вас.'}</Typography>
              {reveal.media_caption && (
                <Typography variant="caption" color="text.secondary">{reveal.media_caption}</Typography>
              )}
              {reveal.audio_url && (
                <Box component="audio" controls src={reveal.audio_url} sx={{ width: '100%' }} />
              )}
              {reveal.source_url && (
                <Button
                  component="a"
                  href={reveal.source_url}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  startIcon={<OpenInNewRoundedIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Источник материала
                </Button>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button variant="contained" fullWidth onClick={onClose}>Продолжить маршрут</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
