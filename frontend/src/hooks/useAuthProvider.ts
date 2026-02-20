import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'
import { User } from '../types'
import { AuthContextValue } from './useAuth'

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setIsLoading(false); return }
    apiClient.get<User>('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken') })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      '/auth/login', { email, password }
    )
    localStorage.setItem('accessToken', res.data.accessToken)
    localStorage.setItem('refreshToken', res.data.refreshToken)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) apiClient.post('/auth/logout', { refreshToken }).catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  return { user, isLoading, login, logout, isAuthenticated: !!user }
}
