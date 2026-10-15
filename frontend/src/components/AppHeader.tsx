import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import { AppBar, Box, Button, Container, Divider, Drawer, IconButton, Stack, Toolbar } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { Brand } from './Brand'

export function AppHeader() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const links = [
    { to: '/quests', label: 'Квесты', active: pathname.startsWith('/quests') && !pathname.startsWith('/quests/new') },
    { to: '/demo', label: 'Демо-маршрут', active: pathname === '/demo' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Проверка квестов', active: pathname === '/admin' }] : []),
  ]

  return <>
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)' }}>
      <Container maxWidth="desktop">
        <Toolbar disableGutters sx={{ minHeight: { mobile: 72, tablet: 80 }, gap: 2 }}>
          <Box component={RouterLink} to="/" aria-label="QuestCity — на главную" sx={{ color: 'inherit', textDecoration: 'none', flexShrink: 0 }}><Brand /></Box>
          <Stack component="nav" aria-label="Основная навигация" direction="row" gap={0.5} sx={{ ml: 'auto', display: { mobile: 'none', laptop: 'flex' } }}>
            {links.map(({ to, label, active }) => <Button key={to} component={RouterLink} to={to} color={active ? 'primary' : 'inherit'} aria-current={active ? 'page' : undefined} sx={{ bgcolor: active ? '#f0e9ff' : undefined }}>{label}</Button>)}
          </Stack>
          <Box sx={{ flex: 1, display: { laptop: 'none' } }} />
          <Button component={RouterLink} to={user ? '/quests/new' : '/login'} variant="contained" startIcon={user ? <AddRoundedIcon /> : undefined} sx={{ display: { mobile: 'none', tablet: 'inline-flex' }, whiteSpace: 'nowrap' }}>{user ? 'Создать квест' : 'Войти'}</Button>
          {user && <IconButton aria-label="Выйти из аккаунта" onClick={() => void logout()} sx={{ display: { mobile: 'none', laptop: 'inline-flex' } }}><LogoutRoundedIcon /></IconButton>}
          <IconButton aria-label="Открыть меню" aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(true)} sx={{ display: { laptop: 'none' } }}><MenuRoundedIcon /></IconButton>
        </Toolbar>
      </Container>
    </AppBar>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: 'min(340px, 100vw)', p: { mobile: 2, tablet: 3 } } } }}>
      <Stack id="app-navigation" component="nav" aria-label="Мобильная навигация" spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}><Brand /><IconButton aria-label="Закрыть меню" onClick={() => setOpen(false)}><CloseRoundedIcon /></IconButton></Stack>
        <Button component={RouterLink} to="/" color="inherit" onClick={() => setOpen(false)} sx={{ justifyContent: 'flex-start' }}>Главная</Button>
        {links.map(({ to, label, active }) => <Button key={to} component={RouterLink} to={to} variant={active ? 'outlined' : 'text'} onClick={() => setOpen(false)} sx={{ justifyContent: 'flex-start' }}>{label}</Button>)}
        <Divider sx={{ my: 2 }} />
        <Button component={RouterLink} to={user ? '/quests/new' : '/login'} variant="contained" onClick={() => setOpen(false)}>{user ? 'Создать квест' : 'Войти'}</Button>
        {user && <Button startIcon={<LogoutRoundedIcon />} onClick={() => { setOpen(false); void logout() }}>Выйти</Button>}
      </Stack>
    </Drawer>
  </>
}
