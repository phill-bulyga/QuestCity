import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import { Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PageHeader } from './PageHeader'

export function PageState({ title, loading = false, message, backTo = '/quests' }: { title: string; loading?: boolean; message?: string; backTo?: string }) {
  return <Box minHeight="100dvh">
    <PageHeader title={title} backTo={backTo} />
    <Container maxWidth="tablet" sx={{ py: { mobile: 7, tablet: 12 } }}>
      <Stack alignItems="center" textAlign="center" spacing={2.5}>
        {loading ? <CircularProgress aria-label="Загрузка" /> : <ExploreRoundedIcon sx={{ fontSize: 56, color: 'primary.main' }} />}
        <Typography component="h1" variant="h2">{loading ? 'Загружаем…' : title}</Typography>
        {message && <Typography color="text.secondary">{message}</Typography>}
        {!loading && <Button component={RouterLink} to={backTo} variant="contained">{backTo === '/' ? 'На главную' : 'К квестам'}</Button>}
      </Stack>
    </Container>
  </Box>
}
