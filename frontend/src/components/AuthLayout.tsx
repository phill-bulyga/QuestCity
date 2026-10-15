import { Box, Container, Paper, Stack, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'

import { AppHeader } from './AppHeader'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  subtitle: string
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <Box minHeight="100dvh">
      <AppHeader />
      <Container component="main" maxWidth="tablet" sx={{ py: { mobile: 4, tablet: 8 } }}>
        <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 5 } }}>
          <Stack spacing={4}>
            <Box>
              <Typography fontSize={12} fontWeight={800} letterSpacing={1.5} color="primary.main" mb={2}>ВАША ИСТОРИЯ В QUESTCITY</Typography>
              <Typography component="h1" variant="h1" mb={1.5}>{title}</Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </Box>
            {children}
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
