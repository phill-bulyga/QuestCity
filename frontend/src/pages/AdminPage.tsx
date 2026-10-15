import { Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, Container, Paper, FormControlLabel, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'

import { ApiError, type QuestReward, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PartnerPlacesEditor } from '../features/partners/PartnerPlacesEditor'
import { PageIntro } from '../components/PageIntro'
import { PageState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'

const emptyReward: QuestReward = {
  partner_name: '', venue_address: '', offer: '', promo_code: '',
  redemption_instructions: '', min_score: 0, is_active: true, is_demo: true,
}

export function AdminPage() {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [reward, setReward] = useState<QuestReward>(emptyReward)
  const [notice, setNotice] = useState('')

  const queue = useQuery({
    queryKey: ['admin-review'], queryFn: () => api.listReviewQueue(token!),
    enabled: Boolean(token && user?.role === 'admin'),
  })
  const published = useQuery({
    queryKey: ['quests'], queryFn: () => api.listQuests(token!), enabled: Boolean(token),
  })
  const quest = useQuery({
    queryKey: ['admin-quest', selectedId], queryFn: () => api.getQuestForReview(token!, selectedId),
    enabled: Boolean(token && selectedId),
  })
  const rewardQuery = useQuery({
    queryKey: ['admin-reward', selectedId], queryFn: () => api.getReward(token!, selectedId),
    enabled: Boolean(token && selectedId),
  })
  useEffect(() => {
    if (rewardQuery.isSuccess) setReward(rewardQuery.data ?? emptyReward)
  }, [rewardQuery.isSuccess, rewardQuery.data, selectedId])

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-review'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-quest', selectedId] }),
      queryClient.invalidateQueries({ queryKey: ['quests'] }),
    ])
  }

  const approve = useMutation({
    mutationFn: () => api.approveQuest(token!, selectedId),
    onSuccess: async () => { setNotice('Квест опубликован.'); await refresh() },
  })
  const reject = useMutation({
    mutationFn: () => api.rejectQuest(token!, selectedId, rejectReason),
    onSuccess: async () => { setNotice('Квест возвращён автору.'); setRejectReason(''); await refresh() },
  })
  const save = useMutation({
    mutationFn: () => api.saveReward(token!, selectedId, reward),
    onSuccess: async () => {
      setNotice('Награда сохранена.')
      await queryClient.invalidateQueries({ queryKey: ['admin-reward', selectedId] })
    },
  })

  function updateReward<K extends keyof QuestReward>(key: K, value: QuestReward[K]) {
    setReward((current) => ({ ...current, [key]: value }))
  }

  function saveReward(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  if (user?.role !== 'admin') return <PageState title="Раздел недоступен" message="Проверка квестов доступна администратору." />

  const pending = queue.data ?? []
  const others = (published.data ?? []).filter((item) => !pending.some((entry) => entry.id === item.id))
  const actionError = approve.error || reject.error || save.error

  return (
    <Box minHeight="100dvh" pb={5}>
      <PageHeader title="Администрирование" backTo="/" />
      <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 } }}>
        <Stack spacing={3}>
          <PageIntro eyebrow="ПРОВЕРКА И ПУБЛИКАЦИЯ" title="Истории, готовые к старту" description="Проверьте задания, подсказки и материалы, чтобы каждая прогулка стала хорошим приключением." />
          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', laptop: 'minmax(0, 1fr) minmax(0, 1.65fr)' }, gap: 3, alignItems: 'start' }}>
          <Paper variant="outlined" sx={{ p: 3 }}><Stack spacing={2}>
          <Typography variant="h2">Очередь проверки</Typography>
          {queue.isLoading && <CircularProgress />}
          {queue.isError && <Alert severity="error">Не удалось загрузить очередь проверки.</Alert>}
          {!queue.isLoading && !queue.isError && pending.length === 0 && <Alert severity="info">Квестов на проверке нет.</Alert>}
          {pending.map((item) => (
            <Button key={item.id} variant={selectedId === item.id ? 'contained' : 'outlined'} onClick={() => setSelectedId(item.id)}>
              {item.title} · {item.checkpoint_count} точек
            </Button>
          ))}
          <Typography variant="h3">Опубликованные квесты и призы</Typography>
          {others.map((item) => (
            <Button key={item.id} variant={selectedId === item.id ? 'contained' : 'outlined'} onClick={() => setSelectedId(item.id)}>
              {item.title}
            </Button>
          ))}
          </Stack></Paper>
          <Stack spacing={3}>
          {!selectedId && <Paper variant="outlined" sx={{ p: { mobile: 3, tablet: 5 } }}><Typography variant="h2" mb={1}>Выберите квест</Typography><Typography color="text.secondary">Откройте маршрут из списка, чтобы проверить его содержимое или настроить награду.</Typography></Paper>}
          {quest.isLoading && <CircularProgress aria-label="Загрузка квеста" />}
          {quest.isError && <Alert severity="error">Не удалось загрузить выбранный квест.</Alert>}
          {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
          {actionError && <Alert severity="error">{actionError instanceof ApiError ? actionError.message : 'Не удалось сохранить изменения'}</Alert>}

          {quest.data && (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h2">{quest.data.title}</Typography>
                  <Typography>{quest.data.short_description}</Typography>
                  {quest.data.checkpoints.map((checkpoint) => (
                    <Box key={checkpoint.id} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                      <Typography fontWeight={700}>{checkpoint.position + 1}. {checkpoint.title}</Typography>
                      <Typography variant="body2">Подсказка: {checkpoint.route_clue || '—'}</Typography>
                      <Typography variant="body2">Вопрос: {checkpoint.task_prompt}</Typography>
                      <Typography variant="body2">Ответ: {checkpoint.task_type === 'ordering' ? checkpoint.correct_order.join(' → ') : checkpoint.correct_answer}</Typography>
                      {checkpoint.hints.map((hint, index) => <Typography key={`hint-${index}`} variant="body2">Подсказка {index + 1} · {hint.cost} баллов: {hint.text}</Typography>)}
                      {checkpoint.task_image_url && <Box component="img" src={checkpoint.task_image_url} alt={checkpoint.task_image_caption || 'Фото задания'} sx={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} />}
                      <Typography variant="body2">Карточка: {checkpoint.reveal_title} — {checkpoint.reveal_text}</Typography>
                      {checkpoint.travel_facts.map((fact, index) => (
                        <Typography key={index} variant="body2">По дороге: {fact.title} — {fact.text}</Typography>
                      ))}
                    </Box>
                  ))}
                  {quest.data.status === 'pending_review' && (
                    <Stack spacing={1.5}>
                      <Button variant="contained" disabled={approve.isPending} onClick={() => approve.mutate()}>Одобрить и опубликовать</Button>
                      <TextField label="Причина возврата автору" multiline minRows={2} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                      <Button color="warning" variant="outlined" disabled={rejectReason.trim().length < 5 || reject.isPending} onClick={() => reject.mutate()}>Вернуть на доработку</Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {quest.data && (
            <Card variant="outlined">
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={saveReward}>
                  <Typography variant="h2">Финальная награда</Typography>
                  <TextField label="Заведение или партнёр" required value={reward.partner_name} onChange={(event) => updateReward('partner_name', event.target.value)} />
                  <TextField label="Адрес заведения" value={reward.venue_address} onChange={(event) => updateReward('venue_address', event.target.value)} />
                  <TextField label="Что получает игрок" required value={reward.offer} onChange={(event) => updateReward('offer', event.target.value)} />
                  <TextField label="Промокод" required value={reward.promo_code} onChange={(event) => updateReward('promo_code', event.target.value)} />
                  <TextField label="Как получить приз" multiline minRows={2} value={reward.redemption_instructions} onChange={(event) => updateReward('redemption_instructions', event.target.value)} />
                  <TextField label="Минимум баллов" type="number" inputProps={{ min: 0 }} value={reward.min_score} onChange={(event) => updateReward('min_score', Number(event.target.value))} />
                  <FormControlLabel control={<Checkbox checked={reward.is_active} onChange={(event) => updateReward('is_active', event.target.checked)} />} label="Награда активна" />
                  <FormControlLabel control={<Checkbox checked={reward.is_demo} onChange={(event) => updateReward('is_demo', event.target.checked)} />} label="Учебный промокод" />
                  <Button type="submit" variant="contained" disabled={save.isPending}>Сохранить награду</Button>
                </Stack>
              </CardContent>
            </Card>
          )}
          {quest.data && <PartnerPlacesEditor key={quest.data.id} questId={quest.data.id} />}
          </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
