import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { Link as RouterLink } from 'react-router-dom'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import { Alert, Box, Button, Container, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AiField } from '../components/AiField'
import { PageIntro } from '../components/PageIntro'
import { PageHeader } from '../components/PageHeader'

export function QuestCreatePage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Санкт-Петербург')
  const [duration, setDuration] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const aiContext = { title, short_description: description, city, estimated_duration_minutes: duration }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const quest = await api.createQuest(token!, {
        title,
        short_description: description,
        city,
        estimated_duration_minutes: duration,
      })
      navigate(`/quests/${quest.id}/edit`, { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось создать квест')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box minHeight="100dvh">
      <PageHeader title="Новый квест" backTo="/quests" />
      <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 }, pb: { mobile: 6, tablet: 8 } }}>
        <Stack spacing={4}>
          <PageIntro eyebrow="СТУДИЯ АВТОРА / 01" title="Начните свою историю" description="Задайте название и настроение маршрута. Соберите маршрут вручную или начните с генератора." />
          <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 }, bgcolor: '#f1edfa' }}>
            <Stack direction={{ mobile: 'column', tablet: 'row' }} alignItems={{ tablet: 'center' }} justifyContent="space-between" gap={3}>
              <Stack direction="row" gap={2} alignItems="flex-start">
                <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
                <Box><Typography variant="h2" mb={1}>Пусть идея станет квестом</Typography><Typography color="text.secondary">Заполните короткую анкету — она станет основой маршрута, истории и заданий.</Typography></Box>
              </Stack>
              <Button component={RouterLink} to="/quests/new/generate" variant="contained" startIcon={<AutoAwesomeRoundedIcon />} sx={{ flexShrink: 0 }}>Сгенерировать квест</Button>
            </Stack>
          </Paper>
          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', laptop: 'minmax(0, 1.65fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
            <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
              <Stack component="form" spacing={3} onSubmit={handleSubmit}>
                <Box><Typography variant="h2" mb={0.5}>О квесте</Typography><Typography color="text.secondary">Эту информацию игроки увидят в каталоге.</Typography></Box>
                {error && <Alert severity="error">{error}</Alert>}
                <AiField field="title" label="Название квеста" scope="quest" context={aiContext} disabled={isSubmitting} onApply={(value) => setTitle(String(value))}><TextField label="Название квеста" placeholder="Например: тайны старого города" required value={title} onChange={(event) => setTitle(event.target.value)} /></AiField>
                <AiField field="short_description" label="Краткое описание" scope="quest" context={aiContext} disabled={isSubmitting} onApply={(value) => setDescription(String(value))}><TextField label="Краткое описание" placeholder="Что ждёт игроков и почему стоит отправиться в путь?" multiline minRows={4} inputProps={{ maxLength: 300 }} helperText={`${description.length} / 300 символов`} value={description} onChange={(event) => setDescription(event.target.value)} /></AiField>
                <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={2}>
                  <AiField field="city" label="Город" scope="quest" context={aiContext} disabled={isSubmitting} onApply={(value) => setCity(String(value))}><TextField label="Город" required value={city} onChange={(event) => setCity(event.target.value)} /></AiField>
                  <AiField field="estimated_duration_minutes" label="Длительность, минут" scope="quest" context={aiContext} disabled={isSubmitting} onApply={(value) => setDuration(Number(value))}><TextField label="Длительность, минут" type="number" required inputProps={{ min: 10, max: 1440 }} helperText="Примерное время прогулки" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></AiField>
                </Stack>
                <Divider />
                <Stack direction={{ mobile: 'column', tablet: 'row' }} alignItems={{ tablet: 'center' }} gap={2} justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Сначала создадим черновик.</Typography>
                  <Button type="submit" variant="contained" endIcon={<ArrowForwardRoundedIcon />} disabled={isSubmitting}>{isSubmitting ? 'Создаём…' : 'Продолжить к точкам'}</Button>
                </Stack>
              </Stack>
            </Paper>
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f1edfa' }}>
                <Typography fontSize={12} fontWeight={800} letterSpacing={1} color="primary.main" mb={3}>ОТ ИДЕИ ДО ПРОГУЛКИ</Typography>
                <Stack spacing={3}>
                  {[['01', 'Расскажите об идее', 'Название, описание и город'], ['02', 'Соберите маршрут', 'Места, задания и истории по дороге'], ['03', 'Отправьте на проверку', 'После одобрения квест появится в каталоге']].map(([number, heading, text], index) => <Stack key={number} direction="row" gap={2}>
                    <Box sx={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: index === 0 ? 'primary.main' : 'white', color: index === 0 ? 'white' : 'text.secondary', fontWeight: 800 }}>{number}</Box>
                    <Box><Typography fontWeight={700}>{heading}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>
                  </Stack>)}
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 3, overflowWrap: 'anywhere' }}>
                <Stack direction="row" alignItems="center" gap={1} mb={2}><RouteRoundedIcon color="primary" /><Typography variant="h3">Ваша идея уже обретает форму</Typography></Stack>
                <Typography variant="h2" mb={1}>{title || 'Название вашей истории'}</Typography>
                <Typography color="text.secondary" mb={2}>{description || 'Добавьте пару предложений, чтобы заинтересовать будущих игроков.'}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}><Chip size="small" label={city || 'Ваш город'} /><Chip size="small" label={`${duration || 0} мин`} /><Chip size="small" label="Черновик" variant="outlined" /></Stack>
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
