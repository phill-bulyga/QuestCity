import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { Alert, Box, Button, Checkbox, Chip, Container, Divider, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AiField } from '../components/AiField'
import { PageHeader } from '../components/PageHeader'
import { PageIntro } from '../components/PageIntro'
import { type GenerationBrief, labels, readBrief } from '../features/generation/brief'

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Stack component="fieldset" spacing={2.5} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
    <Typography component="legend" variant="h2" sx={{ mb: 1 }}>{title}</Typography>
    <Typography color="text.secondary" variant="body2">{description}</Typography>
    {children}
  </Stack>
}

export function QuestGeneratePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, token } = useAuth()
  const status = useQuery({
    queryKey: ['generation-status', user?.id],
    queryFn: () => api.generationStatus(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  })
  const storageKey = `questcity:generation-brief:v1:${user!.id}`
  const feedback = useRef<HTMLDivElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const [brief, setBrief] = useState(() => readBrief(storageKey))
  const [review, setReview] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(brief))
      setStorageAvailable(true)
    } catch {
      setStorageAvailable(false)
    }
  }, [brief, storageKey])

  useEffect(() => {
    if (review) reviewHeading.current?.focus()
  }, [review])

  useEffect(() => {
    if (error || prepared) feedback.current?.focus()
  }, [error, prepared])

  function update<K extends keyof GenerationBrief>(key: K, value: GenerationBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }))
    setPrepared(false)
    setError(null)
  }

  function handleReview(event: FormEvent) {
    event.preventDefault()
    const normalized = {
      ...brief,
      city: brief.city.trim(), idea: brief.idea.trim(), area: brief.area.trim(),
      preferred_places: [...new Set(brief.preferred_places.map((place) => place.trim()).filter(Boolean))],
      excluded_places: [...new Set(brief.excluded_places.map((place) => place.trim()).filter(Boolean))],
    }
    if (normalized.city.length < 2 || normalized.idea.length < 10) {
      setError('Укажите город и опишите идею минимум в 10 символах.')
      return
    }
    for (const places of [normalized.preferred_places, normalized.excluded_places]) {
      if (places.length > 12 || places.some((place) => place.length < 2 || place.length > 200)) {
        setError('В каждом списке можно указать до 12 мест, от 2 до 200 символов в строке.')
        return
      }
    }
    const excluded = new Set(normalized.excluded_places.map((place) => place.toLocaleLowerCase('ru')))
    if (normalized.preferred_places.some((place) => excluded.has(place.toLocaleLowerCase('ru')))) {
      setError('Одно и то же место нельзя одновременно включить и исключить. Проверьте списки мест.')
      return
    }
    setBrief(normalized)
    setError(null)
    setReview(true)
  }

  async function handleGenerate() {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await api.prepareGeneration(token!, brief)
      setBrief(result.brief)
      if (result.status === 'awaiting_provider') {
        setPrepared(true)
        await status.refetch()
        return
      }
      const generated = await api.generateQuest(token!, result.brief)
      await queryClient.invalidateQueries({ queryKey: ['quests'] })
      navigate(`/quests/${generated.quest_id}/edit`)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось сгенерировать квест. Ваши ответы остались на этой странице.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const aiContext = { ...brief, preferred_places: brief.preferred_places.join('\n'), excluded_places: brief.excluded_places.join('\n') }

  function select<K extends keyof typeof labels>(field: K, label: string) {
    return <AiField field={field} label={label} scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update(field, String(value) as GenerationBrief[K])}><TextField select label={label} value={brief[field]} onChange={(event) => update(field, event.target.value as GenerationBrief[K])}>
      {Object.entries(labels[field]).map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
    </TextField></AiField>
  }

  const summary = [
    ['Город и район', [brief.city, brief.area].filter(Boolean).join(' · ')],
    ['Тема', labels.theme[brief.theme]], ['Идея', brief.idea],
    ['Для кого', labels.audience[brief.audience]],
    ['Маршрут', `${brief.duration_minutes} минут · точек: ${brief.checkpoint_count}`],
    ['Сложность и настроение', `${labels.difficulty[brief.difficulty]} · ${labels.tone[brief.tone]}`],
    ['Задания', labels.task_format[brief.task_format]],
    ['Проводник', labels.guide_style[brief.guide_style]],
    ['Обязательные места', brief.preferred_places.join(', ') || 'На выбор генератора'],
    ['Исключить из маршрута', brief.excluded_places.join(', ') || 'Не указано'],
    ['Условия прогулки', [brief.outdoor_only ? 'Только на улице, без платного входа' : 'Можно предложить места внутри зданий', brief.step_free ? 'Маршрут без ступеней: доступность нужно подтвердить' : 'Без дополнительных требований к доступности'].join('. ')],
    ...(brief.wishes ? [['Пожелания', brief.wishes]] : []),
    ...(brief.source_notes ? [['Материалы автора', brief.source_notes]] : []),
  ]

  return <Box minHeight="100dvh">
    <PageHeader title="Генератор квестов" backTo="/quests/new" />
    <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 }, pb: 8 }}>
      <Stack spacing={4}>
        <PageIntro eyebrow="СТУДИЯ АВТОРА / ГЕНЕРАТОР" title={review ? 'Проверим вашу идею' : 'Какое приключение создадим?'} description={review ? 'Проверьте ответы: на их основе генератор создаст сценарий и задания.' : 'Расскажите о городе, игроках и настроении прогулки. Эти ответы станут основой вашего квеста.'} />
        {status.isLoading ? <Alert severity="info">Проверяем доступность генератора…</Alert> : status.isError ? <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void status.refetch()}>Повторить</Button>}>Не удалось проверить подключение. Анкету можно заполнить и сохранить.</Alert> : status.data?.available ? <Alert severity="info">Генератор готов. Создание сценария может занять до нескольких минут. Результат сохранится как черновик для проверки.</Alert> : <Alert severity="info">Для генерации нужно добавить ключ LLM в настройки сервера. Пока можно заполнить и сохранить анкету.</Alert>}
        {isSubmitting && <Alert severity="info" role="status">Создаём историю, задания и подсказки. Дождитесь результата на этой странице.</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', laptop: 'minmax(0, 1.65fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
          <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
            <Stack spacing={3}>
              {error && <Alert severity="error" role="alert" ref={feedback} tabIndex={-1} sx={{ scrollMarginTop: 110 }}>{error}</Alert>}
              {prepared && <Alert severity="success" icon={<CheckRoundedIcon />} ref={feedback} tabIndex={-1} sx={{ scrollMarginTop: 110 }}>Анкета готова. На сервере ещё не задан ключ LLM, поэтому квест пока не сгенерирован.</Alert>}
              {!review ? <Stack component="form" spacing={4} onSubmit={handleReview}>
                <Section title="01 / Место и идея" description="Где пройдёт прогулка и о чём будет ваша история?">
                  <Stack direction={{ mobile: 'column', tablet: 'row' }} gap={2}>
                    <AiField field="city" label="Город" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('city', String(value))}><TextField label="Город" required value={brief.city} inputProps={{ minLength: 2, maxLength: 100 }} onChange={(event) => update('city', event.target.value)} /></AiField>
                    <AiField field="area" label="Район или место старта" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('area', String(value))}><TextField label="Район или место старта" value={brief.area} inputProps={{ maxLength: 300 }} placeholder="Исторический центр, площадь…" onChange={(event) => update('area', event.target.value)} /></AiField>
                  </Stack>
                  {select('theme', 'Тема квеста')}
                  <AiField field="idea" label="Идея квеста" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('idea', String(value))}><TextField label="Идея квеста" required multiline minRows={3} value={brief.idea} inputProps={{ minLength: 10, maxLength: 2000 }} helperText="Например: познакомить игроков с морской историей города через загадки и старые здания." onChange={(event) => update('idea', event.target.value)} /></AiField>
                </Section>
                <Divider />
                <Section title="02 / Игроки и формат" description="Подберём глубину истории и задания под вашу аудиторию.">
                  {select('audience', 'Для кого квест')}
                  <Stack direction={{ mobile: 'column', tablet: 'row' }} gap={2}>
                    <AiField field="duration_minutes" label="Длительность, минут" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('duration_minutes', Number(value))}><TextField label="Длительность, минут" type="number" required value={brief.duration_minutes} inputProps={{ min: 10, max: 240, step: 1 }} helperText="От 10 до 240 минут" onChange={(event) => update('duration_minutes', Number(event.target.value))} /></AiField>
                    <AiField field="checkpoint_count" label="Количество точек" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('checkpoint_count', Number(value))}><TextField label="Количество точек" type="number" required value={brief.checkpoint_count} inputProps={{ min: 2, max: 12, step: 1 }} helperText="От 2 до 12 остановок" onChange={(event) => update('checkpoint_count', Number(event.target.value))} /></AiField>
                  </Stack>
                  <Stack direction={{ mobile: 'column', tablet: 'row' }} gap={2}>{select('difficulty', 'Сложность заданий')}{select('tone', 'Настроение истории')}</Stack>
                  {select('task_format', 'Формат ответов')}
                  {select('guide_style', 'Персонаж-проводник')}
                </Section>
                <Divider />
                <Section title="03 / Маршрут и ограничения" description="Укажите важные места и условия, которые нужно учесть.">
                  <AiField field="preferred_places" label="Места, которые нужно включить" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('preferred_places', String(value).split('\n'))}><TextField label="Места, которые нужно включить" multiline minRows={3} value={brief.preferred_places.join('\n')} helperText="Необязательно. По одному месту в строке, до 12 мест." onChange={(event) => update('preferred_places', event.target.value.split('\n'))} /></AiField>
                  <AiField field="excluded_places" label="Места, которые нужно исключить" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('excluded_places', String(value).split('\n'))}><TextField label="Места, которые нужно исключить" multiline minRows={2} value={brief.excluded_places.join('\n')} helperText="Например: удалённые районы или закрытые территории." onChange={(event) => update('excluded_places', event.target.value.split('\n'))} /></AiField>
                  <Stack>
                    <AiField field="outdoor_only" label="Только на улице, без платного входа" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('outdoor_only', Boolean(value))}><FormControlLabel control={<Checkbox checked={brief.outdoor_only} onChange={(event) => update('outdoor_only', event.target.checked)} />} label="Только на улице, без платного входа" /></AiField>
                    <AiField field="step_free" label="Нужен маршрут без ступеней" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('step_free', Boolean(value))}><FormControlLabel control={<Checkbox checked={brief.step_free} onChange={(event) => update('step_free', event.target.checked)} />} label="Нужен маршрут без ступеней" /></AiField>
                  </Stack>
                </Section>
                <Divider />
                <Section title="04 / Детали вашей истории" description="Дополнительные материалы помогут сделать квест ближе к вашей задумке.">
                  <AiField field="wishes" label="Особые пожелания" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('wishes', String(value))}><TextField label="Особые пожелания" multiline minRows={3} value={brief.wishes} inputProps={{ maxLength: 2000 }} helperText="Например: возраст детей, прогулка с коляской, финал у набережной, без сложных загадок." onChange={(event) => update('wishes', event.target.value)} /></AiField>
                  <AiField field="source_notes" label="Факты и источники" scope="brief" context={aiContext} disabled={isSubmitting} onApply={(value) => update('source_notes', String(value))}><TextField label="Факты и источники" multiline minRows={4} value={brief.source_notes} inputProps={{ maxLength: 6000 }} helperText="Необязательно. Добавьте известные вам факты, заметки и ссылки на материалы о местах." onChange={(event) => update('source_notes', event.target.value)} /></AiField>
                </Section>
                <Button type="submit" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Проверить анкету</Button>
              </Stack> : <>
                <Typography component="h2" variant="h2" ref={reviewHeading} tabIndex={-1} sx={{ scrollMarginTop: 110 }}>Задание для генератора</Typography>
                <Box component="dl" sx={{ m: 0 }}>
                  {summary.map(([title, value]) => <Box key={title} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider', overflowWrap: 'anywhere' }}>
                    <Typography component="dt" variant="body2" color="text.secondary" mb={0.5}>{title}</Typography>
                    <Typography component="dd" sx={{ m: 0, whiteSpace: 'pre-line' }}>{value}</Typography>
                  </Box>)}
                </Box>
                <Stack direction={{ mobile: 'column', tablet: 'row' }} gap={2}>
                  <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} disabled={isSubmitting} onClick={() => { setReview(false); setPrepared(false); setError(null) }}>Изменить ответы</Button>
                  <Button variant="contained" startIcon={<AutoAwesomeRoundedIcon />} disabled={isSubmitting || status.isLoading} onClick={() => void handleGenerate()}>{isSubmitting ? 'Генерируем квест…' : 'Сгенерировать квест'}</Button>
                </Stack>
              </>}
            </Stack>
          </Paper>
          <Stack spacing={3} sx={{ position: { laptop: 'sticky' }, top: 104 }}>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f1edfa' }}>
              <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 32, mb: 2 }} />
              <Typography variant="h2" mb={1}>От идеи к готовой истории</Typography>
              <Typography color="text.secondary" mb={3}>Генератор предложит название, сюжет, места, задания, подсказки и факты по дороге.</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}><Chip size="small" label={`Точек: ${brief.checkpoint_count}`} /><Chip size="small" label={`${brief.duration_minutes} мин`} /><Chip size="small" label={labels.audience[brief.audience]} /></Stack>
              <Divider sx={{ my: 3 }} />
              <Typography fontWeight={700} mb={1}>Вы управляете результатом</Typography>
              <Typography color="text.secondary" variant="body2">После генерации сможете проверить места и факты, изменить задания и продолжить работу в конструкторе.</Typography>
            </Paper>
            <Typography variant="body2" color={storageAvailable ? 'text.secondary' : 'warning.main'} role="status">{storageAvailable ? 'Ответы сохраняются в этом браузере для вашего аккаунта. На другом устройстве они будут недоступны.' : 'Браузер не смог сохранить ответы. Не закрывайте страницу, чтобы не потерять анкету.'}</Typography>
            <Button component={RouterLink} to="/quests/new" color="inherit" startIcon={<ArrowBackRoundedIcon />}>Создать квест вручную</Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  </Box>
}
