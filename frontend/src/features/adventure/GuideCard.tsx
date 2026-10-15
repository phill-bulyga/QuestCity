import { Box, Paper, Stack, Typography } from '@mui/material'
import type { Guide } from '../../api/client'

export function GuideCard({ guide, message }: { guide?: Guide | null; message?: string }) {
  if (!guide) return null
  return <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 3 }, bgcolor: '#f1edfa', width: '100%', textAlign: 'left' }}>
    <Stack direction="row" gap={2} alignItems="flex-start">
      <Box aria-hidden="true" sx={{ width: 48, height: 48, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'white', fontSize: 28 }}>{({ captain: '⚓', historian: '📜', explorer: '🧭' })[guide.persona]}</Box>
      <Box sx={{ minWidth: 0 }}><Typography fontWeight={800}>{guide.name}</Typography><Typography variant="caption" color="primary.main">Ваш проводник · персонаж квеста</Typography><Typography mt={1} sx={{ whiteSpace: 'pre-line' }}>{message || guide.introduction}</Typography></Box>
    </Stack>
  </Paper>
}
