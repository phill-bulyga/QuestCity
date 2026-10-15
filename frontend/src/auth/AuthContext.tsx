import { type PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { type User, api } from '../api/client'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login(email: string, password: string): Promise<void>
  register(displayName: string, email: string, password: string): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .refresh()
      .then((result) => {
        if (active) {
          setUser(result.user)
          setToken(result.access_token)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password })
    setUser(result.user)
    setToken(result.access_token)
  }, [])

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    const result = await api.register({ display_name: displayName, email, password })
    setUser(result.user)
    setToken(result.access_token)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      setToken(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// The hook intentionally lives with its provider so the authentication contract stays centralized.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
