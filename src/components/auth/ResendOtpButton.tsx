'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

export interface ResendOtpButtonProps {
  onResend: () => Promise<void> | void
  cooldownSeconds?: number
  disabled?: boolean
  className?: string
}

export const ResendOtpButton: React.FC<ResendOtpButtonProps> = ({
  onResend,
  cooldownSeconds = 60,
  disabled = false,
  className = '',
}) => {
  const [cooldown, setCooldown] = useState(cooldownSeconds)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setInterval(() => {
      setCooldown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldown])

  const handleClick = async () => {
    if (cooldown > 0 || isLoading || disabled) return
    setIsLoading(true)
    try {
      await onResend()
      setCooldown(cooldownSeconds)
    } finally {
      setIsLoading(false)
    }
  }

  const isButtonDisabled = cooldown > 0 || isLoading || disabled

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isButtonDisabled}
      className={`inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-800 dark:text-[#F7EFD9] hover:text-amber-950 dark:hover:text-[#A47434] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Sending OTP...</span>
        </>
      ) : cooldown > 0 ? (
        <>
          <span>Resend Code in</span>
          <span className="font-mono text-amber-900 font-bold">{cooldown}s</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Resend OTP Code</span>
        </>
      )}
    </button>
  )
}
