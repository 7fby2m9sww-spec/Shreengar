'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, Sparkles, ArrowRight, Lock } from 'lucide-react'
import { setupFirstAdminAction } from '@/services/auth'
import { createClient } from '@/lib/supabase/client'

export default function AdminSetupPage() {
  const [hasExistingAdmins, setHasExistingAdmins] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdmins() {
      try {
        const supabase = createClient()
        const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true })
        setHasExistingAdmins(!!(count && count > 0))
      } catch {
        setHasExistingAdmins(false)
      }
    }
    checkAdmins()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    const formData = new FormData(e.currentTarget)
    const res = await setupFirstAdminAction(formData)

    if (res?.error) {
      setErrorMsg(res.error)
      setIsSubmitting(false)
    }
  }

  if (hasExistingAdmins === null) {
    return (
      <div className="min-h-screen bg-rose-950 flex items-center justify-center p-6 text-amber-100 font-serif text-sm">
        Verifying system initialization state...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-amber-300 mx-auto flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-800">
            Shreengar Security Engine
          </span>
          <h1 className="font-serif text-2xl font-bold text-rose-950">Initial Super Admin Setup</h1>
        </div>

        {hasExistingAdmins ? (
          <div className="p-5 bg-rose-900/5 rounded-xl border border-rose-900/10 text-center space-y-3">
            <Lock className="w-8 h-8 text-rose-900 mx-auto" />
            <h3 className="font-serif font-bold text-sm text-rose-950">Initialization Locked</h3>
            <p className="text-xs text-rose-950/70 leading-relaxed">
              Super Admin setup has already been completed for this platform.
              Subsequent staff accounts must be created by logged-in Super Admins inside the Admin Panel directory.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-rose-950 text-amber-100 font-serif font-bold text-xs rounded-xl hover:bg-rose-900"
            >
              <span>Login to Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-rose-950/70 text-center leading-relaxed">
              No admin accounts exist yet. Create the first <strong>Super Admin</strong> credentials to unlock system administration.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg font-medium flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">Full Name</label>
              <input
                name="fullName"
                type="text"
                required
                placeholder="Master Super Admin"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">Admin Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@shreengar.com"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">Master Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creating Super Admin...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Initialize Super Admin Account</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
