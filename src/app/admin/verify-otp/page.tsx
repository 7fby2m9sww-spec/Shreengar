'use client'

import React, { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { adminVerifyOtpAction, adminResendOtpAction } from '@/services/auth'
import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'
import { useActionState } from 'react'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'

function AdminVerifyOtpForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Resend OTP state
  const [resendResult, resendAction] = useActionState(async (_: any, formData: FormData) => await adminResendOtpAction(formData), null)
  const [resendTimer, setResendTimer] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  // Countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const id = setInterval(() => setResendTimer(t => Math.max(t - 1, 0)), 1000)
      return () => clearInterval(id)
    }
  }, [resendTimer])

  // React to server action result
  useEffect(() => {
    if (resendResult) {
      if (resendResult.error) {
        setResendMessage(resendResult.error)
      } else {
        setResendMessage('OTP resent successfully')
        setResendTimer(60)
      }
    }
  }, [resendResult])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('otp', otp)

    const res = await adminVerifyOtpAction(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    } else {
      // successful verification will trigger redirect server-side
    }
  }

  return (
    <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10 font-sans dark:bg-[#211318] dark:border-[#5D3944]">
      <div className="text-center space-y-2">
        <div className="flex justify-center pb-1">
          <ShreengarLogo href="/" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-800 dark:text-[#FFF4DC]">
          Shreengar Security Engine
        </span>
        <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#FFF4DC]">2FA OTP Verification</h1>
        <p className="text-xs text-rose-950/70 dark:text-[#D7C0B5]/70">
          We have sent a verification code to your administrative email.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80 dark:text-[#FFF4DC]/80">
            6-Digit Verification Code
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-rose-950/40 dark:text-[#FFF4DC]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              maxLength={6}
              pattern="\d{6}"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950 focus:outline-none tracking-widest text-center font-mono font-bold text-lg dark:bg-[#211318] dark:border-[#5D3944] dark:text-[#FFF4DC]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 dark:bg-[#211318] dark:hover:bg-[#211318]/90"
        >
          {isLoading ? <span>Verifying OTP Code...</span> : <span>Verify & Log In</span>}
        </button>
      </form>

      {/* Resend OTP Section */}
      <form action={resendAction} className="mt-4 flex items-center justify-center" aria-live="polite">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resendTimer > 0}
          aria-busy={resendTimer > 0}
          className="text-sm text-rose-800 underline dark:text-[#FFF4DC] dark:hover:text-[#E3BC75] dark:focus-visible:ring-[#D0A45C]/30"
        >
          {resendTimer > 0 ? `Resend code in 00:${String(resendTimer).padStart(2, '0')}` : 'Resend OTP'}
        </button>
      </form>
      {resendMessage && (
        <p className="mt-2 text-center text-xs text-rose-800 dark:text-[#FFF4DC] dark:bg-emerald-950/30 dark:border-emerald-700/40 dark:text-emerald-200 rounded py-1 px-2 border">
          {resendMessage}
        </p>
      )}
    </div>
  )
}

export default function AdminVerifyOtpPage() {
  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={
        <div className="max-w-md w-full bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-900/20 space-y-6 relative z-10 text-center text-rose-950 font-serif text-lg font-bold">
          Loading Shreengar Security Engine...
        </div>
      }>
        <AdminVerifyOtpForm />
      </Suspense>
    </div>
  )
}
