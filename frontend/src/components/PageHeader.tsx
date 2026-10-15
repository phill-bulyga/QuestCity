import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Button, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

import { AppHeader } from './AppHeader'

interface PageHeaderProps {
  title: string
  backTo?: string
}

export function PageHeader({ title, backTo = '/' }: PageHeaderProps) {
  return <>
    <AppHeader />
    <Container maxWidth="desktop">
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pt: 3, minWidth: 0 }}>
        <Button component={RouterLink} to={backTo} color="inherit" size="small" startIcon={<ArrowBackRoundedIcon />} sx={{ flexShrink: 0, minHeight: 44, px: 1 }}>{backTo === '/' ? 'Главная' : backTo === '/quests/new' ? 'Создание квеста' : 'Квесты'}</Button>
        <Typography color="text.secondary" aria-hidden="true">/</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{title}</Typography>
      </Stack>
    </Container>
  </>
}
