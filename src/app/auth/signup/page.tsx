'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { sendOtpAction } from '@/actions/auth/sendOtpAction'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digitsOnly)
  }

  const validateForm = (): string | null => {
    if (!name || name.trim().length < 2) {
      return 'Please enter your full name (minimum 2 characters).'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.'
    }
    const phoneRegex = /^[6-9]\d{9}$/
    if (!phone || !phoneRegex.test(phone.trim())) {
      return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    const validationError = validateForm()
    if (validationError) {
      setErrorMsg(validationError)
      return
    }

    setIsLoading(true)

    // Call the new Server Action
    const result = await sendOtpAction({
      fullName: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    })
    
    setIsLoading(false)

    if (!result.success) {
      setErrorMsg(result.error)
    } else {
      // Redirect to /verify-otp passing parameters in URL search query
      router.push(
        `/verify-otp?flow=signup&email=${encodeURIComponent(email.trim())}&fullName=${encodeURIComponent(name.trim())}&phone=${encodeURIComponent(phone.trim())}`
      )
    }
  }

  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-rose-950 to-rose-950 opacity-60" />

      <div className="relative z-10 w-full max-w-md bg-amber-50 dark:bg-[#211318]/96 dark:border-[#B88A44]/30 rounded-2xl p-8 shadow-2xl border border-amber-500/30 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-amber-300 font-serif font-bold text-2xl flex items-center justify-center mx-auto border border-amber-500 shadow-md">
            S
          </div>
          <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#FFF4DC]">
            Join Shreengar
          </h1>
          <p className="text-xs text-rose-900/70 dark:text-[#D7C0B5] max-w-xs mx-auto">
            Create an account for early sale access & reward points
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ananya Sharma"
            required
            autoFocus
          />
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ananya@example.com"
            required
          />
          <Input
            label="Mobile Number"
            type="tel"
            name="phone"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="9876543210"
            autoComplete="tel"
            required
          />

          <Button type="submit" variant="primary" className="w-full py-3" isLoading={isLoading}>
            Send OTP
          </Button>
        </form>

        <div className="pt-4 border-t border-rose-900/10 text-center text-xs text-rose-950">
          <span>Already registered? </span>
          <Link href="/auth/login" className="font-bold text-amber-800 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
