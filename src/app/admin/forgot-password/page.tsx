'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { adminForgotPasswordAction } from '@/services/auth'
import { ShieldCheck, ShieldAlert, Mail, ArrowLeft, Send } from 'lucide-react'

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData()
    formData.append('email', email)

    const res = await adminForgotPasswordAction(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    } else if (res?.success) {
      setSuccessMsg(res.message || 'Recovery email dispatched successfully.')
      setIsLoading(false)
      setEmail('')
    }
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
          <h1 className="font-serif text-2xl font-bold text-rose-950">Recover Staff Credentials</h1>
          <p className="text-xs text-rose-950/60 leading-relaxed max-w-xs mx-auto">
            Provide your administrative email address to verify your account authorization and receive credentials reset links.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl font-medium space-y-2">
            <p className="leading-relaxed">{successMsg}</p>
            <div className="pt-2">
              <Link
                href="/admin/login"
                className="text-rose-950 hover:text-rose-900 font-bold underline inline-flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to login page</span>
              </Link>
            </div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-rose-950/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@shreengar.com"
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
                <span>Verifying Account credentials...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Send Recovery Password Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/admin/login"
                className="text-xs text-rose-950/70 hover:text-rose-950 font-bold underline inline-flex items-center space-x-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Admin Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
