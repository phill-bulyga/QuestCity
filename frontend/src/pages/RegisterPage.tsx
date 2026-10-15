import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import { type FormEvent, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AuthLayout } from '../components/AuthLayout'

export function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }
    setIsSubmitting(true)
    try {
      await register(displayName, email, password)
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/quests'
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось создать аккаунт.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Создайте аккаунт" subtitle="Один аккаунт подойдёт для прохождения и создания квестов.">
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Как вас зовут"
          autoComplete="name"
          required
          inputProps={{ minLength: 2, maxLength: 80 }}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Пароль"
          type="password"
          autoComplete="new-password"
          helperText="Минимум 8 символов"
          required
          inputProps={{ minLength: 8 }}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
        </Button>
        <Typography textAlign="center" color="text.secondary">
          Уже зарегистрированы?{' '}
          <Link component={RouterLink} to="/login" fontWeight={700}>
            Войти
          </Link>
        </Typography>
      </Stack>
    </AuthLayout>
  )
}
