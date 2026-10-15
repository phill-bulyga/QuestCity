import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <Box minHeight="100dvh" display="grid" sx={{ placeItems: 'center' }}>
        <CircularProgress aria-label="Загрузка приложения" />
      </Box>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
