'use client'


import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminResetPasswordAction } from '@/services/auth'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, ShieldAlert, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function AdminResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    function verifyTokenPresence() {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const tok = urlParams.get('token')
        if (tok) {
          setToken(tok)
          setIsRecovery(true)
          // Securely remove the token from the browser URL history
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          setIsRecovery(false)
        }
      } catch {
        setIsRecovery(false)
      }
      setIsVerifying(false)
    }
    verifyTokenPresence()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    // Password Complexity Validation
    const uppercase = /[A-Z]/
    const lowercase = /[a-z]/
    const number = /[0-9]/
    const special = /[!@#$%^&*(),.?":{}|<>]/

    if (
      password.length < 8 ||
      !uppercase.test(password) ||
      !lowercase.test(password) ||
      !number.test(password) ||
      !special.test(password)
    ) {
      setErrorMsg('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (!token) {
      setErrorMsg('Invalid or missing password reset token.')
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)
    formData.append('token', token)

    const res = await adminResetPasswordAction(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    } else if (res?.success) {
      setSuccessMsg('Your administrative password has been reset successfully.')
      setIsLoading(false)
      setPassword('')
      setConfirmPassword('')
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 text-center text-xs text-rose-950/60 font-serif">
          Verifying administrative recovery session credentials...
        </div>
      </div>
    )
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-lg border border-red-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-red-800">
            Security Alert
          </span>
          <h1 className="font-serif text-2xl font-bold text-rose-950">Reset Session Invalid</h1>
          <p className="text-xs text-rose-950/70 leading-relaxed max-w-xs mx-auto">
            This password reset link is invalid or has expired.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/forgot-password"
              className="px-6 py-2.5 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg transition-all inline-block"
            >
              Go to Recovery Page
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-amber-300 mx-auto flex items-center justify-center shadow-lg border border-amber-500/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-800">
            Shreengar Security Engine
          </span>
          <h1 className="font-serif text-2xl font-bold text-rose-950">Reset Staff Password</h1>
          <p className="text-xs text-rose-950/60 leading-relaxed max-w-xs mx-auto">
            Choose a secure, strong password for your administrator dashboard access.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl font-medium space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="leading-relaxed font-semibold">{successMsg}</p>
            <div className="pt-2">
              <Link
                href="/admin/login"
                className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg transition-all inline-block"
              >
                Go to Admin Login
              </Link>
            </div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-rose-950/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-rose-950/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Updating credentials in database...</span>
              ) : (
                <span>Update Administrative Password</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/admin/login"
                className="text-xs text-rose-950/70 hover:text-rose-950 font-bold underline inline-flex items-center space-x-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Admin Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
