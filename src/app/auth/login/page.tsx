'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, KeyRound, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'
import { OtpInput, ResendOtpButton } from '@/components/auth'
import { checkLoginIdentifierAction } from '@/actions/auth/checkLoginIdentifierAction'
import { verifyAdminPasswordAction } from '@/actions/auth/verifyAdminPasswordAction'
import { verifyAdminOtpAction } from '@/actions/auth/verifyAdminOtpAction'
import { verifyOtpAction } from '@/actions/auth/verifyOtpAction'
import { adminResendOtpAction } from '@/services/auth'
import { useToast } from '@/context/ToastContext'

type LoginStep = 'identifier' | 'password' | 'otp' | 'admin_otp'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''
  const { showToast } = useToast()

  // Steps and routing states
  const [step, setStep] = useState<LoginStep>('identifier')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  
  // Form values
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otpToken, setOtpToken] = useState('')
  
  // Loading and alerts
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  // Phone input formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
  }

  // Handle Step 1: Identifier check
  const handleIdentifierSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    if (authMethod === 'email') {
      if (!email) {
        setErrorMsg('Please enter your email address.')
        setIsLoading(false)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim().toLowerCase())) {
        setErrorMsg('Please enter a valid email address.')
        setIsLoading(false)
        return
      }

      const res = await checkLoginIdentifierAction({ email: email.trim().toLowerCase() })
      setIsLoading(false)

      if (!res.success) {
        setErrorMsg(res.error)
      } else {
        if (res.type === 'admin') {
          setEmail(res.email)
          setStep('password')
        } else {
          setEmail(res.email)
          if (res.message) {
            setInfoMsg(res.message)
          }
          setStep('otp')
        }
      }
    } else {
      const phoneRegex = /^[6-9]\d{9}$/
      if (!phone || !phoneRegex.test(phone.trim())) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6-9.')
        setIsLoading(false)
        return
      }

      const res = await checkLoginIdentifierAction({ phone: phone.trim() })
      setIsLoading(false)

      if (!res.success) {
        setErrorMsg(res.error)
      } else {
        if (res.type === 'admin') {
          setEmail(res.email)
          setStep('password')
        } else {
          setEmail(res.email)
          if (res.message) {
            setInfoMsg(res.message)
          }
          setStep('otp')
        }
      }
    }
  }

  // Handle Step 2: Admin Password validation
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    if (!password) {
      setErrorMsg('Please enter your administrator password.')
      setIsLoading(false)
      return
    }

    const res = await verifyAdminPasswordAction({ email, password })
    setIsLoading(false)

    if (!res.success) {
      setErrorMsg(res.error)
    } else {
      setStep('admin_otp')
    }
  }

  // Handle Step 3 (Customer): OTP Verification
  const handleCustomerOtpVerify = async (e?: React.FormEvent<HTMLFormElement>, tokenToVerify?: string) => {
    e?.preventDefault()
    const token = tokenToVerify || otpToken

    if (!token || token.length < 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const res = await verifyOtpAction({
      fullName: '',
      email,
      phone,
      otp: token,
      flow: 'login',
    })
    setIsLoading(false)

    if (!res.success) {
      setErrorMsg(res.error)
    } else {
      showToast('Logged In Successfully', 'Welcome back to Shreengar!', 'success')
      router.replace(next || '/account')
    }
  }

  // Handle Step 3 (Admin): OTP Verification
  const handleAdminOtpVerify = async (e?: React.FormEvent<HTMLFormElement>, tokenToVerify?: string) => {
    e?.preventDefault()
    const token = tokenToVerify || otpToken

    if (!token || token.length < 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const res = await verifyAdminOtpAction({ email, otp: token })
    setIsLoading(false)

    if (!res.success) {
      setErrorMsg(res.error)
    } else {
      showToast('Dashboard Access Granted', 'Establishing secure administrative session...', 'success')
      router.replace('/admin')
    }
  }

  // Resend OTP for customer
  const handleCustomerResend = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    const res = await checkLoginIdentifierAction({ email, phone: phone || undefined })
    setIsLoading(false)
    if (!res.success) {
      setErrorMsg(res.error)
    } else {
      showToast('Code Resent', 'A new verification code has been sent.', 'success')
    }
  }

  // Resend OTP for admin
  const handleAdminResend = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    const formData = new FormData()
    formData.append('email', email)
    const res = await adminResendOtpAction(formData)
    setIsLoading(false)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      showToast('Code Resent', 'A new admin verification code has been sent.', 'success')
    }
  }

  // Back to identifier step
  const handleBack = () => {
    setErrorMsg(null)
    setInfoMsg(null)
    setPassword('')
    setOtpToken('')
    setStep('identifier')
  }

  // Mask email helper
  const maskedEmail = () => {
    const parts = email.split('@')
    if (parts.length < 2) return email
    const local = parts[0]
    return `${local.slice(0, 2)}*****@${parts[1]}`
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-rose-950 dark:bg-[radial-gradient(circle_at_top,rgba(164,116,52,0.12),transparent_35%),linear-gradient(135deg,#16090f_0%,#2b0b16_48%,#12090d_100%)] dark:text-[#F7EFD9] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-amber-50/50 to-amber-100/30 dark:from-amber-500/20 dark:via-rose-950 dark:to-rose-950 opacity-30 dark:opacity-60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-rose-900/10 shadow-xl dark:bg-[#211318]/95 dark:border-[#B88A44]/30 dark:backdrop-blur-xl dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] rounded-2xl p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <ShreengarLogo href="/" />
          </div>

          {step === 'identifier' && (
            <>
              <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#F7EFD9]">Sign in to Shreengar</h1>
              <p className="text-xs text-rose-900/70 dark:text-[#C8AAA9] max-w-xs mx-auto">
                Access your orders, wishlist, or administrator portal using one single portal
              </p>
            </>
          )}

          {step === 'password' && (
            <>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-800 dark:text-[#FFF4DC]">
                Shreengar Security Engine
              </span>
              <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#F7EFD9]">Administrator Sign In</h1>
              <p className="text-xs text-rose-900/70 dark:text-[#C8AAA9] max-w-xs mx-auto truncate">
                Staff Identity: {email}
              </p>
            </>
          )}

          {(step === 'otp' || step === 'admin_otp') && (
            <>
              <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#F7EFD9]">
                {step === 'admin_otp' ? 'Verify administrator access' : 'Verify your email'}
              </h1>
              <p className="text-xs text-rose-900/70 dark:text-[#C8AAA9] max-w-xs mx-auto">
                Enter the 6-digit verification code sent to {maskedEmail()}
              </p>
            </>
          )}
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs rounded-xl font-medium flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && !errorMsg && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs rounded-xl font-medium">
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Forms */}
        {step === 'identifier' && (
          <form onSubmit={handleIdentifierSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-rose-950 dark:text-[#F7EFD9]">Authentication Method</label>
              <div className="grid grid-cols-2 gap-2 bg-rose-900/5 dark:bg-[#2b0b16]/5 p-1 rounded-xl border border-rose-900/10 dark:border-[#2b0b16]/10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email')
                    setErrorMsg(null)
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-rose-950 text-amber-100 shadow-md dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35'
                      : 'text-rose-900/70 hover:text-rose-950 hover:bg-rose-900/5 dark:text-[#C8AAA9]'
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
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authMethod === 'phone'
                      ? 'bg-rose-950 text-amber-100 shadow-md dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35'
                      : 'text-rose-900/70 hover:text-rose-950 hover:bg-rose-900/5 dark:text-[#C8AAA9]'
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
                className="bg-white border-rose-900/20 text-rose-950 focus:border-rose-950 focus:ring-rose-950/20 dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#F8EFD8] dark:placeholder:text-[#8F747B] dark:focus:border-[#C79A52] dark:focus:ring-[#C79A52]/20"
              />
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
                className="bg-white border-rose-900/20 text-rose-950 focus:border-rose-950 focus:ring-rose-950/20 dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#F8EFD8] dark:placeholder:text-[#8F747B] dark:focus:border-[#C79A52] dark:focus:ring-[#C79A52]/20"
              />
            )}

            <Button type="submit" variant="primary" className="w-full py-3 bg-rose-950 text-amber-100 hover:bg-rose-900 border-none dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35 cursor-pointer" isLoading={isLoading}>
              Continue
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-950/80 dark:text-[#F7EFD9]/80">Staff Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-rose-950/40 dark:text-[#F7EFD9]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-rose-900/20 rounded-xl text-rose-950 focus:ring-2 focus:ring-rose-950 focus:outline-none dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#F8EFD8]"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3.5 bg-rose-950 hover:bg-rose-900 text-amber-100 font-serif font-bold text-xs rounded-xl shadow-lg border-none dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] cursor-pointer" isLoading={isLoading}>
              Sign In to Executive Dashboard
            </Button>

            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-1.5 text-xs text-rose-900/80 dark:text-[#C8AAA9] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Authentication Method</span>
            </button>
          </form>
        )}

        {(step === 'otp' || step === 'admin_otp') && (
          <form onSubmit={step === 'admin_otp' ? handleAdminOtpVerify : handleCustomerOtpVerify} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-center text-xs font-semibold text-rose-950 dark:text-[#F7EFD9] uppercase tracking-wider">
                Enter 6-Digit Code
              </label>

              <OtpInput
                length={6}
                value={otpToken}
                onChange={setOtpToken}
                onComplete={(token) => {
                  setOtpToken(token)
                  if (step === 'admin_otp') {
                    handleAdminOtpVerify(undefined, token)
                  } else {
                    handleCustomerOtpVerify(undefined, token)
                  }
                }}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35 cursor-pointer"
              isLoading={isLoading}
              disabled={otpToken.length < 6 || isLoading}
            >
              Verify & Sign In
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="inline-flex items-center space-x-1 font-semibold text-rose-900 dark:text-[#F7EFD9] hover:text-amber-800 dark:hover:text-[#A47434] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <ResendOtpButton
                onResend={step === 'admin_otp' ? handleAdminResend : handleCustomerResend}
                cooldownSeconds={60}
                disabled={isLoading}
              />
            </div>
          </form>
        )}

        {/* Footer */}
        {step === 'identifier' && (
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
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4">
        <div className="text-amber-100 font-serif">Loading login...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
