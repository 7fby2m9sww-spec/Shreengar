'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { resetPasswordAction } from '@/services/auth'
import { Lock, CheckCircle2 } from 'lucide-react'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('password', password)

    const result = await resetPasswordAction(formData)
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
          <h1 className="font-serif text-2xl font-bold text-rose-950">Set New Password</h1>
          <p className="text-xs text-rose-900/70">Create a secure new password for your Shreengar account</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-base text-emerald-950">Password Reset Complete!</h4>
            <p className="text-xs text-emerald-800">Your password has been updated successfully.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center text-xs font-bold text-rose-950 hover:underline pt-2"
            >
              Sign In to Account &rarr;
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

            <Button type="submit" variant="primary" className="w-full py-3" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
