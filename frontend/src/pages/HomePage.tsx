import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded'
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import { Box, Button, Chip, Container, Divider, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { Brand } from '../components/Brand'
import { AppHeader } from '../components/AppHeader'

const anchorLinks = [
  ['#how-it-works', 'Как это работает'],
  ['#demo', 'Демо-квест'],
  ['#features', 'Возможности'],
]
const containerSx = { maxWidth: '1280px', px: { mobile: 2.5, tablet: 4 } }
const footerLinkSx = { color: '#ded6ed', justifyContent: 'flex-start', px: 0, minHeight: 44, '&:hover': { color: 'white', bgcolor: 'transparent' } }

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <Stack spacing={1.5} maxWidth={650}>
    <Typography color="primary.main" fontWeight={800} letterSpacing={1.5} textTransform="uppercase" fontSize={12}>{eyebrow}</Typography>
    <Typography component="h2" sx={{ fontSize: { mobile: 32, tablet: 42 }, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.035em' }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ fontSize: { mobile: 16, tablet: 18 }, lineHeight: 1.65 }}>{description}</Typography>
  </Stack>
}

function JourneyPreview() {
  return <Box aria-label="Пример игрового экрана: подсказка, карта и факт" sx={{ width: '100%', maxWidth: 420, mx: 'auto', p: 2, borderRadius: '10px', bgcolor: '#201637', boxShadow: '0 30px 65px rgba(21,11,55,.3)', transform: { tablet: 'rotate(4deg)' } }}>
    <Box sx={{ bgcolor: '#fbfaff', borderRadius: '8px', overflow: 'hidden', color: '#211934' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: '1px solid #eee9f7' }}>
        <Typography fontWeight={800}>Таганрог: город историй</Typography><RouteRoundedIcon sx={{ color: '#702dff' }} />
      </Stack>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" mb={1}><Typography fontSize={13} fontWeight={700}>Точка 2 из 4</Typography><Typography fontSize={13} fontWeight={700}>100 баллов</Typography></Stack>
        <Box sx={{ height: 7, borderRadius: 4, bgcolor: '#eee8fc', mb: 2.5 }}><Box sx={{ width: '38%', height: '100%', borderRadius: 4, bgcolor: '#7440f7' }} /></Box>
        <Typography color="primary.main" fontWeight={800} fontSize={13}>КУДА ДАЛЬШЕ?</Typography>
        <Typography fontWeight={800} sx={{ fontSize: 22, lineHeight: 1.2, mt: 0.7, mb: 2 }}>Найдите каменный спуск из старого города к морю.</Typography>
        <Box sx={{ height: 178, position: 'relative', overflow: 'hidden', borderRadius: '8px', bgcolor: '#e6ebde', backgroundImage: 'linear-gradient(27deg, transparent 43%, #fff 44%, #fff 48%, transparent 49%), linear-gradient(122deg, transparent 43%, #fff 44%, #fff 49%, transparent 50%)', backgroundSize: '115px 110px, 135px 120px' }}>
          <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', bgcolor: '#b9dce6' }} />
          <Box sx={{ position: 'absolute', left: '46%', top: '30%', width: 54, height: 54, borderRadius: '50%', bgcolor: '#7233ee', color: 'white', display: 'grid', placeItems: 'center', boxShadow: '0 8px 20px #5a2cb455' }}><PlaceRoundedIcon sx={{ fontSize: 30 }} /></Box>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, p: 1.5, borderRadius: '8px', bgcolor: '#eaf4fa' }}>
          <LightbulbRoundedIcon sx={{ color: '#2985ad' }} /><Box><Typography fontSize={13} fontWeight={800}>Факт по дороге</Typography><Typography fontSize={12} color="text.secondary">У лестницы есть второе имя…</Typography></Box>
        </Stack>
      </Box>
    </Box>
  </Box>
}

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <Stack spacing={2} sx={{ p: 3, bgcolor: 'white', border: '1px solid #eee9f7', borderRadius: '10px', flex: 1 }}>
    <Box sx={{ width: 48, height: 48, borderRadius: '10px', bgcolor: '#f0e9ff', color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box>
    <Typography variant="h3" sx={{ fontSize: 20 }}>{title}</Typography><Typography color="text.secondary" lineHeight={1.6}>{children}</Typography>
  </Stack>
}

export function HomePage() {
  const { user, logout } = useAuth()
  const demoDestination = '/demo'

  return <Box minHeight="100dvh" bgcolor="#faf9fd">
    <AppHeader />

    <Box component="main">
      <Box sx={{ color: 'white', background: 'radial-gradient(circle at 75% 25%, #6a39ba 0, transparent 38%), linear-gradient(125deg, #22143f, #392069 58%, #4e278a)' }}>
        <Container maxWidth={false} sx={{ ...containerSx, py: { mobile: 7, tablet: 10 } }}>
          <Stack direction={{ mobile: 'column', laptop: 'row' }} alignItems="center" spacing={{ mobile: 7, laptop: 6 }}>
            <Stack spacing={3} flex={1} alignItems="flex-start">
              <Typography component="span" sx={{ px: 1.5, py: 0.8, maxWidth: '100%', borderRadius: 99, color: 'white', bgcolor: 'rgba(255,255,255,.14)', fontSize: 11, fontWeight: 800, letterSpacing: 0.6 }}>ГОРОДСКИЕ КВЕСТЫ В ТВОЁМ ТЕЛЕФОНЕ</Typography>
              <Typography component="h1" sx={{ fontSize: { mobile: 42, tablet: 58, laptop: 64 }, lineHeight: 1.04, fontWeight: 850, letterSpacing: '-0.055em' }}>Город — это история. <Box component="span" sx={{ color: '#cbb4ff' }}>Открой её в игре.</Box></Typography>
              <Typography sx={{ color: '#e4d9f9', fontSize: { mobile: 17, tablet: 20 }, lineHeight: 1.6, maxWidth: 550 }}>Следуй за подсказками, находи места на карте, открывай факты по дороге и отвечай на вопросы. Каждая точка ведёт к следующей главе.</Typography>
              <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={1.5} width={{ mobile: '100%', tablet: 'auto' }}>
                <Button component={RouterLink} to={demoDestination} size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ bgcolor: 'white', color: '#412078', '&:hover': { bgcolor: '#eee5ff' } }}>Попробовать демо-квест</Button>
                <Button component="a" href="#how-it-works" size="large" variant="outlined" sx={{ color: 'white', borderColor: '#a988df', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,.08)' } }}>Как это работает</Button>
              </Stack>
              <Typography sx={{ color: '#d7c8ef', fontSize: 14 }}>Без установки приложения · С телефона · Демо без GPS</Typography>
            </Stack>
            <Box flex={0.85} width="100%"><JourneyPreview /></Box>
          </Stack>
        </Container>
      </Box>

      <Box component="section" id="how-it-works" sx={{ scrollMarginTop: 112, py: { mobile: 8, tablet: 11 } }}>
        <Container maxWidth={false} sx={containerSx}>
          <SectionTitle eyebrow="Просто начать" title="Прогулка превращается в приключение" description="Квест не отправляет вас от метки к метке молча: между остановками разворачивается небольшая история." />
          <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={2} mt={4}>
            {[
              [<ExploreRoundedIcon />, '01', 'Получите подсказку', 'История намекает, куда идти дальше, а точное место отмечено на карте.'],
              [<LightbulbRoundedIcon />, '02', 'Исследуйте по пути', 'Открывайте короткие факты по дороге и замечайте городские детали.'],
              [<CheckCircleRoundedIcon />, '03', 'Ответьте на точке', 'Выберите ответ, узнайте историю места и переходите к следующей главе.'],
            ].map(([icon, number, title, text]) => <Stack key={String(number)} spacing={2} sx={{ flex: 1, p: 3, bgcolor: 'white', border: '1px solid #eee9f7', borderRadius: '10px' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between"><Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: '#eee6ff', color: 'primary.main' }}>{icon}</Box><Typography color="#c9b6ea" fontWeight={900} fontSize={28}>{number}</Typography></Stack>
              <Typography variant="h3" sx={{ fontSize: 20 }}>{title}</Typography><Typography color="text.secondary" lineHeight={1.6}>{text}</Typography>
            </Stack>)}
          </Stack>
        </Container>
      </Box>

      <Box component="section" id="demo" sx={{ scrollMarginTop: 112, py: { mobile: 8, tablet: 11 }, bgcolor: '#f1edfa' }}>
        <Container maxWidth={false} sx={containerSx}>
          <Stack direction={{ mobile: 'column', tablet: 'row' }} alignItems="center" spacing={5}>
            <Stack spacing={2.5} flex={1} alignItems="flex-start">
              <SectionTitle eyebrow="Демо-маршрут" title="Таганрог: от Петра I до Чехова" description="Четыре остановки в историческом центре, вопросы с вариантами ответа, факты по дороге и финальная учебная награда." />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><Chip icon={<PlaceRoundedIcon />} label="Таганрог" /><Chip icon={<RouteRoundedIcon />} label="4 точки" /><Chip icon={<MapRoundedIcon />} label="Без GPS для демо" /></Stack>
              <Button component={RouterLink} to={demoDestination} variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />}>Открыть маршрут</Button>
            </Stack>
            <Box sx={{ flex: 0.8, width: '100%', p: { mobile: 3, tablet: 4 }, borderRadius: '10px', bgcolor: 'white', boxShadow: '0 20px 50px rgba(54,28,101,.1)' }}>
              <Stack spacing={2.5}>
                <Typography color="primary.main" fontWeight={800} fontSize={13} letterSpacing={1}>ПРИМЕР ИГРОВОГО ПУТИ</Typography>
                {['Подсказка к месту', 'Факт по дороге', 'Вопрос на точке', 'Новая глава'].map((label, index) => <Stack key={label} direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: index === 3 ? '#6930df' : '#eee8fa', color: index === 3 ? 'white' : 'primary.main', fontWeight: 800 }}>{String(index + 1).padStart(2, '0')}</Box>
                  <Typography fontWeight={700}>{label}</Typography>{index < 3 && <ArrowForwardRoundedIcon sx={{ ml: 'auto !important', color: '#a995c8' }} />}
                </Stack>)}
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Box component="section" id="features" sx={{ scrollMarginTop: 112, py: { mobile: 8, tablet: 11 } }}>
        <Container maxWidth={false} sx={containerSx}>
          <SectionTitle eyebrow="Для игроков и авторов" title="Не просто карта с точками" description="QuestCity объединяет маршрут, задания и контент в один понятный сценарий, который можно проходить с телефона." />
          <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={2} mt={4}>
            <Feature icon={<AutoStoriesRoundedIcon />} title="Истории мест">После ответа игрок видит карточку с текстом, фотографией или аудио — если автор добавил эти материалы.</Feature>
            <Feature icon={<RouteRoundedIcon />} title="Свои маршруты">Автор создаёт точки, вопросы, подсказки и дорожные факты. Перед публикацией сценарий проверяет администратор.</Feature>
            <Feature icon={<CardGiftcardRoundedIcon />} title="Награда в финале">В квест можно добавить приз от партнёра с условиями получения и промокодом. В демо используется учебный код.</Feature>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ pb: { mobile: 8, tablet: 11 } }}><Container maxWidth={false} sx={containerSx}>
        <Stack alignItems={{ mobile: 'flex-start', tablet: 'center' }} textAlign={{ mobile: 'left', tablet: 'center' }} spacing={2.5} sx={{ p: { mobile: 4, tablet: 6 }, borderRadius: '10px', bgcolor: '#2b194c', color: 'white' }}>
          <Typography component="h2" sx={{ fontSize: { mobile: 29, tablet: 38 }, fontWeight: 800, lineHeight: 1.15 }}>Готовы взглянуть на город по-новому?</Typography>
          <Typography sx={{ color: '#d9cdee', maxWidth: 600 }}>Начните с демонстрационного маршрута или создайте свою историю для других игроков.</Typography>
          <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing={1.5} width={{ mobile: '100%', tablet: 'auto' }}>
            <Button component={RouterLink} to={demoDestination} variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Пройти демо-квест</Button>
            <Button component={RouterLink} to={user ? '/quests/new' : '/register'} variant="outlined" sx={{ color: 'white', borderColor: '#9e87c3' }}>Создать квест</Button>
          </Stack>
        </Stack>
      </Container></Box>
    </Box>

    <Box component="footer" sx={{ bgcolor: '#211733', color: 'white', pt: { mobile: 6, tablet: 7 }, pb: 3 }}>
      <Container maxWidth={false} sx={containerSx}>
        <Stack direction={{ mobile: 'column', laptop: 'row' }} justifyContent="space-between" spacing={{ mobile: 4, laptop: 6 }}>
          <Stack spacing={2} sx={{ maxWidth: 340 }}>
            <Box component={RouterLink} to="/" sx={{ color: 'white', textDecoration: 'none', width: 'fit-content' }} aria-label="QuestCity — на главную"><Brand /></Box>
            <Typography sx={{ color: '#ded6ed', lineHeight: 1.6 }}>Городские маршруты, подсказки и истории мест — в одном квесте на вашем телефоне.</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { mobile: 'minmax(0, 1fr)', tablet: 'repeat(3, minmax(0, 1fr))' }, gap: { mobile: 3, tablet: 4 }, minWidth: 0 }}>
            <Stack component="nav" aria-label="Разделы в футере" alignItems="flex-start">
              <Typography fontWeight={800} mb={1}>О проекте</Typography>
              {anchorLinks.map(([href, label]) => <Button key={href} component="a" href={href} sx={footerLinkSx}>{label}</Button>)}
            </Stack>
            <Stack component="nav" aria-label="Ссылки на квесты" alignItems="flex-start">
              <Typography fontWeight={800} mb={1}>Квесты</Typography>
              <Button component={RouterLink} to="/demo" sx={footerLinkSx}>Маршрут по Таганрогу</Button>
              <Button component={RouterLink} to="/quests" sx={footerLinkSx}>Каталог квестов</Button>
              <Button component={RouterLink} to={user ? '/quests/new' : '/register'} sx={footerLinkSx}>Создать квест</Button>
            </Stack>
            <Stack component="nav" aria-label="Аккаунт" alignItems="flex-start">
              <Typography fontWeight={800} mb={1}>Аккаунт</Typography>
              {user ? <>
                {user.role === 'admin' && <Button component={RouterLink} to="/admin" sx={footerLinkSx}>Администрирование</Button>}
                <Button onClick={() => void logout()} sx={footerLinkSx}>Выйти</Button>
              </> : <>
                <Button component={RouterLink} to="/login" sx={footerLinkSx}>Войти</Button>
                <Button component={RouterLink} to="/register" sx={footerLinkSx}>Регистрация</Button>
              </>}
            </Stack>
          </Box>
        </Stack>
        <Divider sx={{ borderColor: 'rgba(255,255,255,.17)', my: 4 }} />
        <Stack direction={{ mobile: 'column', tablet: 'row' }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" sx={{ color: '#bfb4d0' }}>© {new Date().getFullYear()} QuestCity. Все права защищены.</Typography>
          <Typography variant="body2" sx={{ color: '#bfb4d0' }}>Демонстрационный учебный проект · Промокоды в демо не действуют в реальных заведениях.</Typography>
        </Stack>
      </Container>
    </Box>
  </Box>
}
