'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheck, LogOut, Sun, Moon, Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@teispace/next-themes'

export default function SettingsPage() {
  const { showToast } = useToast()
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      showToast('Settings Saved', 'Your account preferences have been successfully updated.', 'success')
    }, 800)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">Manage your preferences, security, and active sessions.</p>
      </div>

      <div className="space-y-10">
        {/* Appearance Settings */}
        <section className="pb-10 border-b border-border/50">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Appearance</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Customize the look and feel of your Shreengar storefront experience.
          </p>

          {mounted ? (
            <div className="inline-flex items-center bg-surface-muted p-1 rounded-xl border border-border shadow-sm w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  theme === 'light'
                    ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-accent' : ''}`} />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  theme === 'dark'
                    ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-accent' : ''}`} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  theme === 'system'
                    ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className={`w-4 h-4 ${theme === 'system' ? 'text-accent' : ''}`} />
                <span>System</span>
              </button>
            </div>
          ) : (
            <div className="h-[44px] w-full sm:w-[300px] bg-surface-muted animate-pulse rounded-xl" />
          )}
        </section>

        {/* Security Status */}
        <section className="pb-10 border-b border-border/50">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Security</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Review your account security and verification status.
          </p>

          <div className="bg-surface-elevated p-5 rounded-xl border border-border flex items-start space-x-4">
            <div className="p-2 bg-success/10 rounded-full shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Verified Account Active</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
                Your account is protected by our secure passwordless login system. All sessions are cryptographically verified using custom authorization tokens.
              </p>
            </div>
          </div>
        </section>

        {/* Active Session */}
        <section className="pb-10 border-b border-border/50">
          <div className="flex items-center space-x-3 mb-4">
            <LogOut className="w-5 h-5 text-accent" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Active Session</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm text-foreground">Current Browser Session</p>
              <p className="text-xs text-muted-foreground mt-1">
                You are currently signed in. Log out to clear cache and preferences.
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="secondary"
              className="px-5 py-2.5 space-x-2 shrink-0 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </section>

        {/* Save Controls */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            variant="primary"
            className="px-8 py-2.5 text-sm font-bold font-serif shadow-sm w-full sm:w-auto"
            isLoading={isLoading}
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  )
}
