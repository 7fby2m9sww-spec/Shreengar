'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { sendLoginOtpAction } from '@/actions/auth/sendLoginOtpAction'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
  }

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    if (authMethod === 'email') {
      if (!email) {
        setErrorMsg('Please enter your email address.')
        setIsLoading(false)
        return
      }

      // Check email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim().toLowerCase())) {
        setErrorMsg('Please enter a valid email address.')
        setIsLoading(false)
        return
      }

      // Submit only email to sendLoginOtpAction Server Action
      const result = await sendLoginOtpAction({
        email: email.trim().toLowerCase(),
      })
      setIsLoading(false)

      if (!result.success) {
        setErrorMsg(result.error)
      } else {
        router.push(
          `/verify-otp?flow=login&email=${encodeURIComponent(result.email)}&fullName=${encodeURIComponent(result.fullName)}&phone=${encodeURIComponent(result.phone)}${next ? `&next=${encodeURIComponent(next)}` : ''}`
        )
      }
    } else {
      const phoneRegex = /^[6-9]\d{9}$/
      if (!phone || !phoneRegex.test(phone.trim())) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.')
        setIsLoading(false)
        return
      }

      // Submit only phone to sendLoginOtpAction Server Action
      const result = await sendLoginOtpAction({
        phone: phone.trim(),
      })
      setIsLoading(false)

      if (!result.success) {
        setErrorMsg(result.error)
      } else {
        router.push(
          `/verify-otp?flow=login&email=${encodeURIComponent(result.email)}&fullName=${encodeURIComponent(result.fullName)}&phone=${encodeURIComponent(result.phone)}${next ? `&next=${encodeURIComponent(next)}` : ''}`
        )
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-rose-950 dark:bg-[radial-gradient(circle_at_top,rgba(164,116,52,0.12),transparent_35%),linear-gradient(135deg,#16090f_0%,#2b0b16_48%,#12090d_100%)] dark:text-[#F7EFD9] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-amber-50/50 to-amber-100/30 dark:from-amber-500/20 dark:via-rose-950 dark:to-rose-950 opacity-30 dark:opacity-60" />

      <div className="relative z-10 w-full max-w-md bg-white border border-rose-900/10 shadow-xl dark:bg-[#211318]/95 dark:border-[#B88A44]/30 dark:backdrop-blur-xl dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] rounded-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-amber-100 font-serif font-bold text-2xl flex items-center justify-center mx-auto border border-amber-500 shadow-md">
            S
          </div>
          <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#F7EFD9]">
            Welcome Back
          </h1>
          <p className="text-xs text-rose-900/70 dark:text-[#C8AAA9] max-w-xs mx-auto">
            Sign in to access your Shreengar account & orders via Email or Mobile OTP
          </p>
        </div>

        {/* Banners */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSendOtp} className="space-y-4">
          {/* Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-rose-950 dark:text-[#F7EFD9]">Authentication Method</label>
            <div className="grid grid-cols-2 gap-2 bg-rose-900/5 dark:bg-[#2b0b16]/5 p-1 rounded-xl border border-rose-900/10 dark:border-[#2b0b16]/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email')
                  setErrorMsg(null)
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMethod === 'email'
                    ? 'bg-rose-950 text-amber-100 shadow-md dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35'
                    : 'text-rose-900/70 hover:text-rose-950 hover:bg-rose-900/5'
                }`}
              >
                Email Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone')
                  setErrorMsg(null)
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMethod === 'phone'
                    ? 'bg-rose-950 text-amber-100 shadow-md dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35'
                    : 'text-rose-900/70 hover:text-rose-950 hover:bg-rose-900/5'
                }`}
              >
                Mobile Number
              </button>
            </div>
          </div>

          {authMethod === 'email' ? (
            <Input
                label="Email Address"
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                required
                autoFocus
                className="bg-white border-rose-900/20 text-rose-950 focus:border-rose-950 focus:ring-rose-950/20 dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#F8EFD8] dark:placeholder:text-[#8F747B] dark:focus:border-[#C79A52] dark:focus:ring-[#C79A52]/20" />
          ) : (
            <Input
                label="Mobile Number"
                type="tel"
                name="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                autoComplete="tel"
                required
                autoFocus
                className="bg-white border-rose-900/20 text-rose-950 focus:border-rose-950 focus:ring-rose-950/20 dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#F8EFD8] dark:placeholder:text-[#8F747B] dark:focus:border-[#C79A52] dark:focus:ring-[#C79A52]/20" />
          )}

          <Button type="submit" variant="primary" className="w-full py-3 bg-rose-950 text-amber-100 hover:bg-rose-900 border-none dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35" isLoading={isLoading}>
            Send Verification Code
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-rose-900/10 dark:border-[#A47434]/20 text-center text-xs text-rose-950/60 dark:text-[#F7EFD9]/60 space-y-2">
          <div>
            <span>Don&apos;t have an account? </span>
            <Link href="/auth/signup" className="font-bold text-amber-800 dark:text-[#A47434] hover:underline">
              Create Account
            </Link>
          </div>
          <div className="text-[11px] text-rose-900/60 dark:text-[#A47434]/80 flex items-center justify-center space-x-1">
            <Mail className="w-3 h-3 text-rose-900/60 dark:text-[#A47434]/80" />
            <span>Passwordless OTP Security</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-amber-50 text-rose-950 dark:bg-[radial-gradient(circle_at_top,rgba(164,116,52,0.12),transparent_35%),linear-gradient(135deg,#16090f_0%,#2b0b16_48%,#12090d_100%)] dark:text-[#F7EFD9] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-amber-100 font-serif">Loading login...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
