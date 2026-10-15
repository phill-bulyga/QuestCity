import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <Stack direction={{ mobile: 'column', tablet: 'row' }} justifyContent="space-between" alignItems={{ mobile: 'flex-start', tablet: 'center' }} gap={3}>
    <Box maxWidth={740}>
      <Typography color="primary.main" fontSize={12} fontWeight={800} letterSpacing={1.5} mb={1.5}>{eyebrow}</Typography>
      <Typography component="h1" variant="h1">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 650, fontSize: { mobile: 16, tablet: 18 } }}>{description}</Typography>
    </Box>
    {action}
  </Stack>
}
