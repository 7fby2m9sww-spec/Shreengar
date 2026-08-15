'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSessionAction } from '@/actions/auth/getSessionAction'
import { logoutAction } from '@/actions/auth/logoutAction'
import { Profile } from '@/lib/auth/getSession'
import { ApplicationSession } from '@/lib/auth/resolveApplicationSession'
import { usePathname } from 'next/navigation'

interface AuthContextType {
  session: ApplicationSession
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode; initialSession: ApplicationSession }> = ({
  children,
  initialSession,
}) => {
  const [session, setSession] = useState<ApplicationSession>(initialSession)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  const refreshSession = async () => {
    try {
      const resolved = await getSessionAction()
      setSession(resolved)
    } catch (err) {
      console.error('Failed to refresh auth session:', err)
      setSession({ type: 'anonymous' })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await logoutAction()
      setSession({ type: 'anonymous' })
      localStorage.removeItem('shreengar_cart')
      localStorage.removeItem('shreengar_wishlist')
      localStorage.removeItem('shreengar_applied_coupon')
      window.location.href = '/'
    } catch (err) {
      console.error('Logout failed:', err)
      setIsLoading(false)
    }
  }

  // Sync session on route change
  useEffect(() => {
    refreshSession()
  }, [pathname])

  const profile: Profile | null = session.type === 'customer' ? {
    id: session.customerId,
    email: session.email,
    full_name: session.fullName,
    gender: session.gender,
    phone: session.phone,
    avatar_url: session.avatar_url
  } : null;

  const isAuthenticated = session.type === 'customer'

  return (
    <AuthContext.Provider value={{ session, profile, isAuthenticated, isLoading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
