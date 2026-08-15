'use client'

import React, { useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { 
  adminRequestChangePasswordAction, 
  adminConfirmChangePasswordAction 
} from '@/services/auth'
import { 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  Lock
} from 'lucide-react'

export default function AdminSecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Status states
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // OTP states
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  // Password Complexity derivation
  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasLowercase = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

  const handleRequestChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!isPasswordStrong) {
      setErrorMsg('New password does not meet complexity requirements.')
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.')
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('currentPassword', currentPassword)
    formData.append('newPassword', newPassword)
    formData.append('confirmPassword', confirmPassword)

    const res = await adminRequestChangePasswordAction(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    } else if (res?.otpRequired) {
      setIsLoading(false)
      setOtpError(null)
      setOtpCode('')
      setIsOtpModalOpen(true)
    }
  }

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsOtpSubmitting(true)
    setOtpError(null)

    const formData = new FormData()
    formData.append('currentPassword', currentPassword)
    formData.append('newPassword', newPassword)
    formData.append('confirmPassword', confirmPassword)
    formData.append('otp', otpCode)

    const res = await adminConfirmChangePasswordAction(formData)
    if (res?.error) {
      setOtpError(res.error)
      setIsOtpSubmitting(false)
    } else if (res?.success) {
      setIsOtpSubmitting(false)
      setIsOtpModalOpen(false)
      setSuccessMsg('Your security password has been changed successfully. Redirecting to login page...')
      
      // Clear fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Redirect user to login after short delay to establish new credentials session
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Security Settings"
        description="Update your executive staff credentials and manage login security."
        badgeText="Security"
      />

      <div className="max-w-2xl bg-white dark:bg-[#211318] border border-[#5C0B26]/10 dark:border-[#70424E] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#5C0B26]/10">
          <div className="w-10 h-10 rounded-full bg-[#5C0B26]/10 flex items-center justify-center text-[#5C0B26]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC]">Update Access Password</h3>
            <p className="text-xs text-[#7A6B70] dark:text-[#D7C0B5]">Ensure a strong password is used to protect administrative actions.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRequestChange} className="space-y-6">
          {/* Current Password Field */}
          <div className="relative">
            <Input
              label="Current Password"
              type={showCurrent ? 'text' : 'password'}
              name="currentPassword"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-[34px] text-rose-950/50 hover:text-rose-950 transition-colors"
              title={showCurrent ? 'Hide Password' : 'Show Password'}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* New Password Field */}
            <div className="relative">
              <Input
                label="New Password"
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-[34px] text-rose-950/50 hover:text-rose-950 transition-colors"
                title={showNew ? 'Hide Password' : 'Show Password'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <Input
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-[34px] text-rose-950/50 hover:text-rose-950 transition-colors"
                title={showConfirm ? 'Hide Password' : 'Show Password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Live Validation Rules Checklist Grid */}
          <div className="p-4 bg-amber-500/5 dark:bg-[#2A171E] border border-[#5C0B26]/10 dark:border-[#5D3944] rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950/80 dark:text-[#D7C0B5] mb-2">
              Password Strength Requirements
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                {hasMinLength ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-950/30 flex-shrink-0" />
                )}
                <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-[#7A6B70]'}>
                  Minimum 8 characters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasUppercase ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-950/30 flex-shrink-0" />
                )}
                <span className={hasUppercase ? 'text-emerald-700 font-medium' : 'text-[#7A6B70]'}>
                  One uppercase letter (A-Z)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasLowercase ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-950/30 flex-shrink-0" />
                )}
                <span className={hasLowercase ? 'text-emerald-700 font-medium' : 'text-[#7A6B70]'}>
                  One lowercase letter (a-z)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasNumber ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-950/30 flex-shrink-0" />
                )}
                <span className={hasNumber ? 'text-emerald-700 font-medium' : 'text-[#7A6B70]'}>
                  One number (0-9)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {hasSpecial ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-950/30 flex-shrink-0" />
                )}
                <span className={hasSpecial ? 'text-emerald-700 font-medium' : 'text-[#7A6B70]'}>
                  One special character (e.g. !@#$)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#5C0B26]/10 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border dark:border-[#D0A45C]/25 px-6"
            >
              {isLoading ? 'Processing change request...' : 'Save Password Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* OTP Authentication Modal */}
      <Modal isOpen={isOtpModalOpen} onClose={() => setIsOtpModalOpen(false)} title="Security Verification">
        <form onSubmit={handleConfirmOtp} className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#5C0B26]/10 text-[#5C0B26] mx-auto flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC]">Enter Verification Code</h4>
            <p className="text-xs text-[#7A6B70] dark:text-[#D7C0B5] leading-relaxed max-w-sm mx-auto">
              We have dispatched a one-time verification passcode (OTP) to your administrative email address. Please enter the passcode to authorize this credential rotation.
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          <Input
            label="One-Time Code"
            type="text"
            required
            maxLength={6}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value)}
            placeholder="e.g. 123456"
            className="text-center tracking-widest text-lg font-mono"
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsOtpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isOtpSubmitting} className="bg-[#5C0B26] hover:bg-[#8C3A57]">
              {isOtpSubmitting ? 'Authorizing rotation...' : 'Verify and Rotation Updates'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
