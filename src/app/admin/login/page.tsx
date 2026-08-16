'use client'

import React, { useState } from 'react'
import { adminLoginAction } from '@/services/auth'
import { ShieldCheck, ShieldAlert, KeyRound, Mail } from 'lucide-react'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    const res = await adminLoginAction(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <ShreengarLogo href="/" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-800">
            Shreengar Security Engine
          </span>
          <h1 className="font-serif text-2xl font-bold text-rose-950">Administrative Staff Login</h1>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">Staff Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-rose-950/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@shreengar.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80">Staff Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-rose-950/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
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
            {isLoading ? <span>Authenticating Admin Credentials...</span> : <span>Sign In to Executive Dashboard</span>}
          </button>
        </form>
      </div>
    </div>
  )
}
