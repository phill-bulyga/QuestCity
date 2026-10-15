import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded'
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import PublishRoundedIcon from '@mui/icons-material/PublishRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  FormControlLabel,
  Container,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'

import { GuideEditor } from '../features/adventure/GuideEditor'
import type { TaskHint } from '../api/client'
import type { GeneratedCheckpoint } from '../features/generation/brief'
import { ApiError, type TaskType, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AiField } from '../components/AiField'
import { PageIntro } from '../components/PageIntro'
import { PageState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'

export function QuestBuilderPage() {
  const { questId = '' } = useParams()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const formHeading = useRef<HTMLHeadingElement>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null)
  const [suggestionReviewed, setSuggestionReviewed] = useState(false)
  const [latitude, setLatitude] = useState<number | string>('')
  const [longitude, setLongitude] = useState<number | string>('')
  const [radius, setRadius] = useState(50)
  const [taskType, setTaskType] = useState<TaskType>('text')
  const [prompt, setPrompt] = useState('')
  const [hints, setHints] = useState<TaskHint[]>([])
  const [taskImageUrl, setTaskImageUrl] = useState<string | null>(null)
  const [taskImageCaption, setTaskImageCaption] = useState('')
  const [options, setOptions] = useState('')
  const [answer, setAnswer] = useState('')
  const [routeClue, setRouteClue] = useState('')
  const [travelFacts, setTravelFacts] = useState('')
  const [revealTitle, setRevealTitle] = useState('Знаете ли вы?')
  const [revealText, setRevealText] = useState('')
  const [revealImageUrl, setRevealImageUrl] = useState<string | null>(null)
  const [revealAudioUrl, setRevealAudioUrl] = useState<string | null>(null)
  const [revealMediaCaption, setRevealMediaCaption] = useState('')
  const [revealSourceUrl, setRevealSourceUrl] = useState<string | null>(null)
  const [mediaUploading, setMediaUploading] = useState<'image' | 'audio' | 'task-image' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const choiceOptions = options.split('\n').map((item) => item.trim()).filter(Boolean)

  const questQuery = useQuery({
    queryKey: ['quest-edit', questId],
    queryFn: () => api.getQuestForEditing(token!, questId),
    enabled: Boolean(token && questId),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      api.addCheckpoint(token!, questId, {
        title,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
        activation_radius_m: radius,
        task_type: taskType,
        task_prompt: prompt,
        answer_options: ['single_choice', 'ordering', 'photo'].includes(taskType) ? choiceOptions : [],
        correct_order: taskType === 'ordering' ? choiceOptions : [],
        hints, task_image_url: taskType === 'photo' ? taskImageUrl : null,
        task_image_caption: taskType === 'photo' ? taskImageCaption : '',
        correct_answer: taskType === 'ordering' ? '' : answer,
        points: 100,
        max_attempts: 3,
        route_clue: routeClue,
        travel_facts: travelFacts.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
          const [factTitle, ...factText] = line.split('|')
          return { title: factTitle.trim(), text: factText.join('|').trim() }
        }),
        reveal_title: revealTitle,
        reveal_text: revealText,
        reveal_image_url: revealImageUrl,
        reveal_audio_url: revealAudioUrl,
        reveal_media_caption: revealMediaCaption,
        reveal_source_url: revealSourceUrl,
      }, selectedSuggestion ?? undefined),
    onSuccess: async () => {
      setSelectedSuggestion(null)
      setSuggestionReviewed(false)
      setTitle('')
      setDescription('')
      setPrompt('')
      setHints([])
      setTaskImageUrl(null)
      setTaskImageCaption('')
      setOptions('')
      setAnswer('')
      setRouteClue('')
      setTravelFacts('')
      setRevealTitle('Знаете ли вы?')
      setRevealText('')
      setRevealImageUrl(null)
      setRevealAudioUrl(null)
      setRevealMediaCaption('')
      setRevealSourceUrl(null)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['quest-edit', questId] })
    },
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : 'Не удалось добавить точку'),
  })

  const publishMutation = useMutation({
    mutationFn: () => api.publishQuest(token!, questId),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['quest-edit', questId] })
      await queryClient.invalidateQueries({ queryKey: ['quests'] })
    },
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : 'Не удалось опубликовать квест'),
  })

  useEffect(() => {
    if (selectedSuggestion !== null) formHeading.current?.focus()
  }, [selectedSuggestion])

  function chooseSuggestion(point: GeneratedCheckpoint, index: number) {
    setSelectedSuggestion(index)
    setSuggestionReviewed(false)
    setTitle(point.title)
    setDescription(point.description)
    setLatitude('')
    setLongitude('')
    setRadius(50)
    setTaskType(point.task_type)
    setPrompt(point.task_prompt)
    setHints(point.hints ?? [])
    setTaskImageUrl(null)
    setTaskImageCaption('')
    setOptions((point.task_type === 'ordering' ? point.correct_order ?? point.answer_options : point.answer_options).join('\n'))
    setAnswer(point.correct_answer)
    setRouteClue(point.route_clue)
    setTravelFacts(point.travel_facts.map((fact) => `${fact.title.replace(/[\r\n|]/g, ' ')} | ${fact.text.replace(/[\r\n]/g, ' ')}`).join('\n'))
    setRevealTitle(point.reveal_title)
    setRevealText(point.reveal_text)
    setRevealSourceUrl(point.source_urls[0] ?? null)
    setRevealImageUrl(null)
    setRevealAudioUrl(null)
    setRevealMediaCaption('')
    setError(null)
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (selectedSuggestion !== null && !suggestionReviewed) return
    addMutation.mutate()
  }

  async function handleMediaUpload(file: File | undefined, kind: 'image' | 'audio' | 'task-image') {
    if (!file) return
    setError(null)
    setMediaUploading(kind)
    try {
      const result = await api.uploadMedia(token!, file)
      if (kind === 'task-image') setTaskImageUrl(result.url)
      else if (kind === 'image') setRevealImageUrl(result.url)
      else setRevealAudioUrl(result.url)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить файл')
    } finally {
      setMediaUploading(null)
    }
  }

  if (questQuery.isLoading) {
    return <PageState title="Конструктор" loading />
  }
  if (!questQuery.data) {
    return <PageState title="Конструктор недоступен" message="Не удалось загрузить квест. Попробуйте открыть его снова из каталога." />
  }
  const quest = questQuery.data
  const generatedPlan = quest.generation_plan
  const confirmedIndices = generatedPlan?.confirmed_indices ?? []
  const selectedPoint = selectedSuggestion === null ? null : generatedPlan?.checkpoints[selectedSuggestion]
  const aiContext = {
    quest_title: quest.title, quest_city: quest.city, quest_description: quest.short_description,
    title, description, activation_radius_m: radius,
    task_type: taskType, task_prompt: prompt, answer_options: options, correct_answer: answer,
    route_clue: routeClue, travel_facts: travelFacts, reveal_title: revealTitle,
    reveal_text: revealText, reveal_media_caption: revealMediaCaption,
    reveal_source_url: revealSourceUrl, place_name: selectedPoint?.place_name ?? '',
    address_hint: selectedPoint?.address_hint ?? '', source_urls: selectedPoint?.source_urls.join('\n') ?? '',
  }
  const aiDisabled = addMutation.isPending || mediaUploading !== null
  const isDraft = quest.status === 'draft' || quest.status === 'rejected'

  return (
    <Box minHeight="100dvh">
      <PageHeader title="Конструктор" backTo="/quests" />
      <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 }, pb: 8 }}>
        <Stack spacing={3}>
          <PageIntro eyebrow="СТУДИЯ АВТОРА / 02" title={quest.title} description={`${quest.city} · ${quest.estimated_duration_minutes} минут. Добавляйте места и превращайте маршрут в историю.`} action={<Chip color={quest.status === 'published' ? 'success' : 'default'} label={{ draft: 'Черновик', rejected: 'Нужны правки', pending_review: 'На проверке', published: 'Опубликован', archived: 'Архив' }[quest.status]} />} />

          {generatedPlan && <Alert severity="info">Сценарий сгенерирован и сохранён в черновик. Проверьте задания и факты, укажите точные координаты предложенных мест и добавьте точки в маршрут.</Alert>}
          {generatedPlan && generatedPlan.review_notes.length > 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h3" mb={1}>Заметки к сценарию</Typography>{generatedPlan.review_notes.map((note, index) => <Typography key={index} variant="body2" color="text.secondary">{note}</Typography>)}</Paper>}
          {error && <Alert severity="error">{error}</Alert>}
          {quest.rejection_reason && <Alert severity="warning">Комментарий модератора: {quest.rejection_reason}</Alert>}
          {quest.status === 'pending_review' && <Alert severity="info">Квест ожидает проверки администратора.</Alert>}
          {quest.status === 'published' && (
            <Alert severity="success" action={<Button component={RouterLink} to={`/quests/${quest.id}`}>Открыть</Button>}>
              Квест опубликован и доступен в каталоге.
            </Alert>
          )}

          <GuideEditor questId={quest.id} guide={quest.guide} disabled={!isDraft} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: 'minmax(0, 1fr)', laptop: isDraft ? 'minmax(0, 1fr) minmax(0, 1.65fr)' : 'minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
          <Paper variant="outlined" sx={{ minWidth: 0, p: { mobile: 2, tablet: 4 }, position: { laptop: 'sticky' }, top: 104 }}>
            <Typography variant="h2" mb={1}>Маршрут</Typography>
            <Typography color="text.secondary" variant="body2" mb={3}>Точек: {quest.checkpoints.length}. Игрок пройдёт их по порядку.</Typography>
            {generatedPlan && <Stack spacing={1.5} mb={3}>
              <Typography variant="h3">Предложенные места</Typography>
              {generatedPlan.checkpoints.map((point, index) => <Paper key={index} variant="outlined" sx={{ p: 2, bgcolor: selectedSuggestion === index ? '#f1edfa' : 'background.paper' }}>
                <Typography fontWeight={700}>{index + 1}. {point.place_name}</Typography>
                <Typography color="text.secondary" variant="body2">{point.address_hint}</Typography>
                {confirmedIndices.includes(index) ? <Chip size="small" color="success" label="Добавлено в маршрут" sx={{ mt: 1 }} /> : isDraft && <Button size="small" onClick={() => chooseSuggestion(point, index)} sx={{ mt: 1 }}>Проверить и добавить</Button>}
              </Paper>)}
            </Stack>}
            <Stack spacing={1.5}>
              {quest.checkpoints.length === 0 && <Alert severity="info">Добавьте первую точку маршрута.</Alert>}
              {quest.checkpoints.map((checkpoint, index) => (
                <Card key={checkpoint.id} variant="outlined" sx={{ boxShadow: 'none' }}>
                  <CardContent>
                    <Stack direction="row" gap={2} alignItems="flex-start">
                      <Chip label={index + 1} color="primary" />
                      <Box>
                        <Typography fontWeight={700}>{checkpoint.title}</Typography>
                        <Typography color="text.secondary" variant="body2">{checkpoint.task_prompt}</Typography>
                        <Typography color="text.secondary" variant="caption">
                          {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)} · радиус {checkpoint.activation_radius_m} м
                        </Typography>
                        {(checkpoint.reveal_text || checkpoint.reveal_image_url || checkpoint.reveal_audio_url) && (
                          <Typography display="block" color="success.main" variant="caption" mt={0.5}>
                            ✓ Материал после ответа заполнен
                          </Typography>
                        )}
                        {checkpoint.route_clue && <Typography display="block" variant="caption">Подсказка: {checkpoint.route_clue}</Typography>}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>

          {isDraft && (
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
              <Stack component="form" spacing={2.5} onSubmit={handleAdd}>
                <Box><Typography component="h2" variant="h2" ref={formHeading} tabIndex={-1} sx={{ scrollMarginTop: 110 }}>{selectedPoint ? 'Проверьте предложенную точку' : 'Новая точка'}</Typography><Typography color="text.secondary" mt={0.5}>Место, задание и маленькая история — одна остановка маршрута.</Typography></Box>
                {selectedPoint && <Alert severity="info"><Typography fontWeight={700}>{selectedPoint.place_name}</Typography><Typography variant="body2">{selectedPoint.address_hint}</Typography>{selectedPoint.verification_notes.map((note, index) => <Typography key={index} variant="body2">{note}</Typography>)}<Typography variant="body2">Введите координаты реального места. Они не генерируются моделью.</Typography></Alert>}
                <Stack component="fieldset" spacing={2.5} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                <Typography component="legend" variant="h3" sx={{ mb: 2 }}>01 / Место</Typography>
                <AiField field="title" label="Название места" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setTitle(String(value))}><TextField label="Название места" required value={title} onChange={(event) => setTitle(event.target.value)} /></AiField>
                <AiField field="description" label="Описание для игрока" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setDescription(String(value))}><TextField label="Описание для игрока" multiline minRows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></AiField>
                <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={2}>
                  <AiField field="latitude" label="Широта" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setLatitude(Number(value))}><TextField label="Широта" type="number" required value={latitude} onChange={(event) => setLatitude(event.target.value === '' ? '' : Number(event.target.value))} inputProps={{ step: 0.000001, min: -90, max: 90 }} /></AiField>
                  <AiField field="longitude" label="Долгота" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setLongitude(Number(value))}><TextField label="Долгота" type="number" required value={longitude} onChange={(event) => setLongitude(event.target.value === '' ? '' : Number(event.target.value))} inputProps={{ step: 0.000001, min: -180, max: 180 }} /></AiField>
                </Stack>
                <AiField field="activation_radius_m" label="Радиус активации, м" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRadius(Number(value))}><TextField label="Радиус активации, м" type="number" value={radius} onChange={(event) => setRadius(Number(event.target.value))} inputProps={{ min: 10, max: 500 }} /></AiField>
                </Stack>
                <Divider />
                <Stack component="fieldset" spacing={2.5} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                <Typography component="legend" variant="h3" sx={{ mb: 2 }}>02 / Задание</Typography>
                <AiField field="task_type" label="Тип задания" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => { setTaskType(String(value) as TaskType); setAnswer('') }}><FormControl fullWidth>
                  <InputLabel id="task-type-label">Тип задания</InputLabel>
                  <Select labelId="task-type-label" label="Тип задания" value={taskType} onChange={(event) => { setTaskType(event.target.value as TaskType); setAnswer('') }}>
                    <MenuItem value="text">Текстовый ответ</MenuItem>
                    <MenuItem value="single_choice">Один вариант</MenuItem>
                    <MenuItem value="ordering">Восстановить порядок</MenuItem>
                    <MenuItem value="photo">Фотозагадка</MenuItem>
                  </Select>
                </FormControl></AiField>
                <AiField field="task_prompt" label="Вопрос" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setPrompt(String(value))}><TextField label="Вопрос" required multiline minRows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} /></AiField>
                {['single_choice', 'ordering', 'photo'].includes(taskType) && (
                  <AiField field="answer_options" label="Варианты ответа" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => { setOptions(String(value)); setAnswer('') }}><TextField label={taskType === 'ordering' ? 'Элементы в правильном порядке' : 'Варианты ответа'} required={taskType !== 'photo'} multiline minRows={3} helperText={taskType === 'ordering' ? 'По одному элементу в строке, от 2 до 10. Игрок увидит их перемешанными.' : 'По одному варианту в строке. Для фотозагадки можно оставить пустым и использовать текстовый ответ.'} value={options} onChange={(event) => { setOptions(event.target.value); setAnswer('') }} /></AiField>
                )}
                {taskType === 'ordering' ? <Alert severity="info">Порядок строк выше — правильный ответ. Во время игры элементы будут перемешаны.</Alert> : taskType === 'single_choice' || (taskType === 'photo' && choiceOptions.length > 0) ? (
                  <AiField field="correct_answer" label="Правильный вариант" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setAnswer(String(value))}><FormControl fullWidth required disabled={choiceOptions.length < 2}>
                    <InputLabel id="correct-answer-label">Правильный вариант</InputLabel>
                    <Select labelId="correct-answer-label" label="Правильный вариант" value={answer} onChange={(event) => setAnswer(event.target.value)}>
                      {choiceOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </Select>
                  </FormControl></AiField>
                ) : (
                  <AiField field="correct_answer" label="Правильный ответ" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setAnswer(String(value))}><TextField label="Правильный ответ" required value={answer} onChange={(event) => setAnswer(event.target.value)} /></AiField>
                )}
                {taskType === 'photo' && <Stack spacing={2}>
                  <Button component="label" variant="outlined" startIcon={<ImageRoundedIcon />} disabled={mediaUploading !== null}>{mediaUploading === 'task-image' ? 'Загружаем…' : 'Загрузить фото для загадки'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { void handleMediaUpload(event.target.files?.[0], 'task-image'); event.target.value = '' }} /></Button>
                  {taskImageUrl && <Box component="img" src={taskImageUrl} alt={taskImageCaption || 'Фото для задания'} sx={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: '10px' }} />}
                  <AiField field="task_image_caption" label="Описание фотографии" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setTaskImageCaption(String(value))}><TextField label="Описание фотографии" value={taskImageCaption} helperText="Описание для доступности. Не указывайте здесь ответ на загадку." inputProps={{ maxLength: 500 }} onChange={(event) => setTaskImageCaption(event.target.value)} /></AiField>
                </Stack>}
                <Typography variant="h3">Помощь за баллы</Typography>
                <Typography variant="body2" color="text.secondary">До трёх подсказок. Каждая уменьшит награду этой точки; общая стоимость — не больше 100 баллов.</Typography>
                {hints.map((hint, index) => <Stack key={index} spacing={1.5} sx={{ p: 2, bgcolor: '#f1edfa', borderRadius: '10px' }}>
                  <AiField field="hint_text" label={`Подсказка ${index + 1}`} scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setHints((current) => current.map((item, i) => i === index ? { ...item, text: String(value) } : item))}><TextField label={`Подсказка ${index + 1}`} required multiline minRows={2} value={hint.text} inputProps={{ minLength: 3, maxLength: 1000 }} onChange={(event) => setHints((current) => current.map((item, i) => i === index ? { ...item, text: event.target.value } : item))} /></AiField>
                  <AiField field="hint_cost" label="Стоимость в баллах" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setHints((current) => current.map((item, i) => i === index ? { ...item, cost: Number(value) } : item))}><TextField label="Стоимость в баллах" type="number" required value={hint.cost} inputProps={{ min: 0, max: 100, step: 1 }} onChange={(event) => setHints((current) => current.map((item, i) => i === index ? { ...item, cost: Number(event.target.value) } : item))} /></AiField>
                  <Button color="inherit" onClick={() => setHints((current) => current.filter((_, i) => i !== index))}>Убрать подсказку</Button>
                </Stack>)}
                <Button variant="outlined" disabled={hints.length >= 3} onClick={() => setHints((current) => [...current, { text: '', cost: 20 }])}>Добавить подсказку</Button>
                </Stack>
                <Divider />
                <Stack component="fieldset" spacing={2.5} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                <Typography component="legend" variant="h3" sx={{ mb: 2 }}>03 / По дороге</Typography>
                <AiField field="route_clue" label="Загадка или ориентир для игрока" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRouteClue(String(value))}><TextField
                  label="Загадка или ориентир для игрока"
                  multiline minRows={2}
                  helperText="Например: ищите место, где каменные ступени ведут к морю. Точное место будет отмечено на карте."
                  value={routeClue} onChange={(event) => setRouteClue(event.target.value)}
                /></AiField>
                <AiField field="travel_facts" label="Факты по дороге" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setTravelFacts(String(value))}><TextField
                  label="Факты по дороге"
                  multiline minRows={3}
                  helperText="Один факт в строке: Заголовок | Короткий текст. До 6 фактов."
                  value={travelFacts} onChange={(event) => setTravelFacts(event.target.value)}
                /></AiField>
                </Stack>
                <Divider />
                <Stack component="fieldset" spacing={2.5} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                <Typography component="legend" variant="h3" sx={{ mb: 2 }}>04 / История после ответа</Typography>
                <Typography color="text.secondary" variant="body2">
                  Игрок увидит эту карточку после правильного ответа или завершения попыток.
                </Typography>
                <AiField field="reveal_title" label="Заголовок карточки" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRevealTitle(String(value))}><TextField
                  label="Заголовок карточки"
                  value={revealTitle}
                  onChange={(event) => setRevealTitle(event.target.value)}
                /></AiField>
                <AiField field="reveal_text" label="Текст, факт или сюжетное продолжение" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRevealText(String(value))}><TextField
                  label="Текст, факт или сюжетное продолжение"
                  multiline
                  minRows={4}
                  value={revealText}
                  onChange={(event) => setRevealText(event.target.value)}
                /></AiField>
                <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={1.5}>
                  <Button component="label" variant="outlined" startIcon={<ImageRoundedIcon />} disabled={mediaUploading !== null}>
                    {mediaUploading === 'image' ? 'Загружаем…' : revealImageUrl ? 'Заменить фото' : 'Прикрепить фото'}
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void handleMediaUpload(event.target.files?.[0], 'image')} />
                  </Button>
                  <Button component="label" variant="outlined" startIcon={<AudiotrackRoundedIcon />} disabled={mediaUploading !== null}>
                    {mediaUploading === 'audio' ? 'Загружаем…' : revealAudioUrl ? 'Заменить аудио' : 'Прикрепить аудио'}
                    <input hidden type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" onChange={(event) => void handleMediaUpload(event.target.files?.[0], 'audio')} />
                  </Button>
                </Stack>
                {revealImageUrl && (
                  <Box component="img" src={revealImageUrl} alt="Предпросмотр" sx={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: '10px' }} />
                )}
                {revealAudioUrl && <Box component="audio" controls src={revealAudioUrl} sx={{ width: '100%' }} />}
                <AiField field="reveal_media_caption" label="Подпись к медиа" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRevealMediaCaption(String(value))}><TextField
                  label="Подпись к медиа"
                  placeholder="Например: Таганрог на открытке 1907 года"
                  value={revealMediaCaption}
                  onChange={(event) => setRevealMediaCaption(event.target.value)}
                /></AiField>
                <AiField field="reveal_source_url" label="Ссылка на источник" scope="checkpoint" context={aiContext} disabled={aiDisabled} onApply={(value) => setRevealSourceUrl(String(value) || null)}><TextField
                  label="Ссылка на источник"
                  type="url"
                  value={revealSourceUrl ?? ''}
                  onChange={(event) => setRevealSourceUrl(event.target.value || null)}
                /></AiField>
                </Stack>
                <Divider />
                {selectedPoint && <FormControlLabel control={<Checkbox required checked={suggestionReviewed} onChange={(event) => setSuggestionReviewed(event.target.checked)} />} label="Я проверил(а) место, координаты, факты и правильный ответ" />}
                <Button type="submit" variant="contained" startIcon={<AddLocationAltRoundedIcon />} disabled={addMutation.isPending || (selectedSuggestion !== null && !suggestionReviewed) || (taskType === 'single_choice' && (choiceOptions.length < 2 || !answer))}>
                  {addMutation.isPending ? 'Добавляем…' : 'Добавить точку'}
                </Button>
              </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f1edfa' }}>
              <Typography variant="h3" mb={1}>Готовы поделиться маршрутом?</Typography>
              <Typography color="text.secondary" variant="body2" mb={2}>Проверьте точки и отправьте квест модератору. После одобрения он появится в каталоге.</Typography>
              <Button fullWidth
                variant="contained"
                startIcon={<PublishRoundedIcon />}
                disabled={quest.checkpoints.length === 0 || publishMutation.isPending || Boolean(generatedPlan && generatedPlan.checkpoints.some((_, index) => !confirmedIndices.includes(index)))}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? 'Отправляем…' : 'Отправить на проверку'}
              </Button>
              </Paper>
            </Stack>
          )}
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
