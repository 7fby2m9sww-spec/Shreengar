'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { forgotPasswordAction } from '@/services/auth'
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('email', email)

    const result = await forgotPasswordAction(formData)
    setIsLoading(false)

    if (result?.error) {
      setErrorMsg(result.error)
    } else {
      setIsSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-rose-950 to-rose-950 opacity-60" />

      <div className="relative z-10 w-full max-w-md bg-amber-50 rounded-2xl p-8 shadow-2xl border border-amber-500/30 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <ShreengarLogo href="/" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-rose-950">Password Recovery</h1>
          <p className="text-xs text-rose-900/70">Enter your registered email address to receive a password reset link</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-base text-emerald-950">Reset Email Sent!</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              We have sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center text-xs font-bold text-rose-950 hover:underline pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. ananya@example.com"
              required
            />

            <Button type="submit" variant="primary" className="w-full py-3" isLoading={isLoading}>
              Send Reset Instructions
            </Button>
          </form>
        )}

        <div className="pt-4 border-t border-rose-900/10 text-center text-xs text-rose-950">
          <Link href="/auth/login" className="font-bold text-amber-800 hover:underline flex items-center justify-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
