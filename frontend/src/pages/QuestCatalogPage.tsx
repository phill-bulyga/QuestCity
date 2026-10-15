import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import WavesRoundedIcon from '@mui/icons-material/WavesRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { type QuestListItem, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageIntro } from '../components/PageIntro'
import { PageHeader } from '../components/PageHeader'

const statusLabels = {
  draft: 'Черновик',
  pending_review: 'На проверке',
  published: 'Опубликован',
  rejected: 'Нужны правки',
  archived: 'Архив',
}

function QuestCover({ quest }: { quest: QuestListItem }) {
  const isCoastal = quest.city.toLocaleLowerCase('ru').includes('таганрог')
  const isPetersburg = quest.city.toLocaleLowerCase('ru').includes('петербург')
  const colors = isCoastal ? ['#0a4863', '#168d93'] : isPetersburg ? ['#343067', '#7560a6'] : ['#4a287e', '#8359c9']
  const CoverIcon = isCoastal ? WavesRoundedIcon : isPetersburg ? AccountBalanceRoundedIcon : ExploreRoundedIcon

  return <Box aria-hidden="true" sx={{ height: { mobile: 165, tablet: 170 }, position: 'relative', overflow: 'hidden', color: 'white', background: `linear-gradient(125deg, ${colors[0]}, ${colors[1]})` }}>
    <Box component="svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}>
      <path d="M-10 177 C 102 65, 189 194, 292 112 S 478 39, 651 99" fill="none" stroke="white" strokeWidth="3" strokeDasharray="7 12" opacity=".65" />
      <path d="M100 224 C 170 156, 270 198, 362 137 S 511 139, 650 8" fill="none" stroke="white" strokeWidth="18" opacity=".07" />
      <circle cx="172" cy="140" r="9" fill="white" />
      <circle cx="293" cy="112" r="8" fill="white" />
      <circle cx="431" cy="60" r="8" fill="white" />
    </Box>
    <Box sx={{ position: 'absolute', right: -35, bottom: -80, width: 245, height: 245, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)' }} />
    <Box sx={{ position: 'absolute', right: 30, bottom: 17, width: 76, height: 76, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', borderRadius: '50%', backdropFilter: 'blur(6px)' }}>
      <CoverIcon sx={{ fontSize: 37 }} />
    </Box>
    <Stack sx={{ position: 'absolute', inset: 0, p: 3 }} justifyContent="space-between" alignItems="flex-start">
      <Typography sx={{ px: 1.2, py: 0.55, borderRadius: '6px', bgcolor: 'rgba(255,255,255,.18)', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
        ГОРОДСКОЙ КВЕСТ
      </Typography>
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,.25)' }}>
        <PlaceRoundedIcon fontSize="small" /><Typography fontWeight={800} fontSize={18}>{quest.city}</Typography>
      </Stack>
    </Stack>
  </Box>
}

function QuestCard({ quest, mine }: { quest: QuestListItem; mine: boolean }) {
  const target = mine ? `/quests/${quest.id}/edit` : `/quests/${quest.id}`
  return <Card variant="outlined" sx={{ overflow: 'hidden', height: '100%', borderColor: '#e9e4f2', boxShadow: '0 12px 30px rgba(37,22,76,.055)', transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 18px 42px rgba(37,22,76,.13)' } }}>
    <CardActionArea component={RouterLink} to={target} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <QuestCover quest={quest} />
      <Stack spacing={2} sx={{ p: { mobile: 2.5, tablet: 3 }, flex: 1, width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography color="primary.main" fontWeight={800} fontSize={12} letterSpacing={1} textTransform="uppercase">
            {quest.title === 'Таганрог: от Петра I до Чехова' ? 'Маршрут с историей' : 'Городской маршрут'}
          </Typography>
          {mine && <Chip size="small" label={statusLabels[quest.status]} color={quest.status === 'published' ? 'success' : quest.status === 'rejected' ? 'warning' : 'default'} />}
        </Stack>
        <Typography component="h2" sx={{ fontSize: { mobile: 21, tablet: 22 }, lineHeight: 1.2, fontWeight: 800 }}>{quest.title}</Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.55, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {quest.short_description || 'Описание маршрута пока не добавлено.'}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" icon={<ScheduleRoundedIcon />} label={`${quest.estimated_duration_minutes} мин`} sx={{ bgcolor: '#f4f0fb' }} />
          <Chip size="small" icon={<RouteRoundedIcon />} label={`Точек: ${quest.checkpoint_count}`} sx={{ bgcolor: '#f4f0fb' }} />
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 1.5, borderTop: '1px solid #eee9f5', color: 'primary.main' }}>
          <Typography fontWeight={800}>{mine ? 'Открыть в конструкторе' : 'Смотреть квест'}</Typography>
          <ArrowForwardRoundedIcon />
        </Stack>
      </Stack>
    </CardActionArea>
  </Card>
}

export function QuestCatalogPage() {
  const { token } = useAuth()
  const [tab, setTab] = useState<'catalog' | 'mine'>('catalog')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('all')
  const query = useQuery({
    queryKey: ['quests', tab],
    queryFn: () => (tab === 'catalog' ? api.listQuests(token!) : api.listMyQuests(token!)),
    enabled: Boolean(token),
  })
  const quests = query.data ?? []
  const cities = [...new Set(quests.map((quest) => quest.city))].sort((a, b) => a.localeCompare(b, 'ru'))
  const needle = search.trim().toLocaleLowerCase('ru')
  const visibleQuests = quests.filter((quest) =>
    (city === 'all' || quest.city === city) &&
    (!needle || `${quest.title} ${quest.city} ${quest.short_description}`.toLocaleLowerCase('ru').includes(needle)),
  )

  return <Box minHeight="100dvh" bgcolor="#faf9fd">
    <PageHeader title="Квесты" />
    <Container component="main" maxWidth="desktop" sx={{ py: { mobile: 3, tablet: 5 }, pb: 8 }}>
      <Stack spacing={{ mobile: 3, tablet: 4 }}>
        <PageIntro eyebrow="ИССЛЕДУЙТЕ ГОРОД" title={tab === 'catalog' ? 'Истории рядом с вами' : 'Ваши истории города'} description={tab === 'catalog' ? 'Выберите маршрут, следуйте за подсказками и откройте знакомые места с новой стороны.' : 'От первой идеи до готового приключения — все ваши маршруты здесь.'} />

        <Stack direction={{ mobile: 'column', tablet: 'row' }} justifyContent="space-between" alignItems={{ mobile: 'stretch', tablet: 'center' }} gap={2}>
          <Tabs value={tab} onChange={(_, value) => { setTab(value); setCity('all'); setSearch('') }} aria-label="Разделы квестов" variant="fullWidth"
            sx={{ bgcolor: '#efebf7', p: 0.5, borderRadius: '10px', minHeight: 48, width: { mobile: '100%', tablet: 340 }, '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTab-root': { minHeight: 40, borderRadius: '8px', fontWeight: 800, textTransform: 'none' }, '& .Mui-selected': { bgcolor: 'white', boxShadow: '0 3px 9px rgba(53,31,88,.1)' } }}>
            <Tab value="catalog" label="Каталог" />
            <Tab value="mine" label="Мои квесты" />
          </Tabs>
          <Button component={RouterLink} to="/quests/new" variant={tab === 'mine' ? 'contained' : 'outlined'} startIcon={<AddRoundedIcon />}>Создать квест</Button>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ mobile: 'column', tablet: 'row' }} justifyContent="space-between" alignItems={{ mobile: 'stretch', tablet: 'center' }} gap={2}>
            <Box>
              <Typography component="h3" sx={{ fontSize: 24, fontWeight: 800 }}>{tab === 'catalog' ? 'Все маршруты' : 'Мои маршруты'}</Typography>
              <Typography color="text.secondary">{query.isLoading ? 'Загружаем маршруты…' : `Маршрутов: ${visibleQuests.length}`}</Typography>
            </Box>
            <TextField size="small" label="Поиск по названию или городу" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ maxWidth: { tablet: 360 }, bgcolor: 'white' }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} />
          </Stack>
          {cities.length > 1 && <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap aria-label="Фильтр по городам">
            <Chip label="Все города" clickable color={city === 'all' ? 'primary' : 'default'} variant={city === 'all' ? 'filled' : 'outlined'} onClick={() => setCity('all')} />
            {cities.map((item) => <Chip key={item} label={item} clickable color={city === item ? 'primary' : 'default'} variant={city === item ? 'filled' : 'outlined'} onClick={() => setCity(item)} />)}
          </Stack>}
        </Stack>

        {query.isLoading && <Box display="grid" sx={{ placeItems: 'center', py: 7 }}><CircularProgress aria-label="Загрузка квестов" /></Box>}
        {query.isError && <Alert severity="error">Не удалось загрузить квесты.</Alert>}
        {!query.isLoading && !query.isError && visibleQuests.length === 0 && <Box textAlign="center" sx={{ p: { mobile: 4, tablet: 7 }, border: '1px dashed #d9d0e8', borderRadius: '10px', bgcolor: 'white' }}>
          <LocationCityRoundedIcon sx={{ fontSize: 54, color: 'primary.light' }} />
          <Typography sx={{ fontSize: 22, fontWeight: 800, mt: 1 }}>{quests.length ? 'Ничего не найдено' : tab === 'catalog' ? 'Маршрутов пока нет' : 'Ваш первый квест ещё впереди'}</Typography>
          <Typography color="text.secondary" mt={1}>{quests.length ? 'Попробуйте другой город или измените запрос.' : tab === 'catalog' ? 'Новые городские истории скоро появятся здесь.' : 'Создайте свой маршрут и отправьте его на проверку.'}</Typography>
          {quests.length ? <Button onClick={() => { setSearch(''); setCity('all') }} sx={{ mt: 2 }}>Сбросить фильтры</Button> : tab === 'mine' ? <Button component={RouterLink} to="/quests/new" variant="contained" sx={{ mt: 2 }}>Создать квест</Button> : null}
        </Box>}
        {visibleQuests.length > 0 && <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: '1fr', tablet: 'repeat(2, minmax(0, 1fr))', desktop: 'repeat(3, minmax(0, 1fr))' }, gap: { mobile: 2, tablet: 3 } }}>
          {visibleQuests.map((quest) => <QuestCard key={quest.id} quest={quest} mine={tab === 'mine'} />)}
        </Box>}

        {tab === 'catalog' && <Stack direction={{ mobile: 'column', tablet: 'row' }} alignItems={{ mobile: 'flex-start', tablet: 'center' }} justifyContent="space-between" gap={2} sx={{ p: { mobile: 3, tablet: 4 }, bgcolor: '#eee9f8', borderRadius: '10px' }}>
          <Box><Typography sx={{ fontSize: 21, fontWeight: 800 }}>Знаете городские истории, о которых стоит рассказать?</Typography><Typography color="text.secondary" mt={0.5}>Соберите свой маршрут с подсказками, вопросами и фактами.</Typography></Box>
          <Button component={RouterLink} to="/quests/new" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ whiteSpace: 'nowrap' }}>Создать квест</Button>
        </Stack>}
      </Stack>
    </Container>
  </Box>
}
