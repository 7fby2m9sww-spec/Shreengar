'use client'

import React, { useState, useEffect } from 'react'

export interface OtpTimerProps {
  durationSeconds?: number
  onExpire?: () => void
  autoStart?: boolean
  className?: string
}

export const OtpTimer: React.FC<OtpTimerProps> = ({
  durationSeconds = 60,
  onExpire,
  autoStart = true,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [prevDuration, setPrevDuration] = useState(durationSeconds)

  if (durationSeconds !== prevDuration) {
    setPrevDuration(durationSeconds)
    setTimeLeft(durationSeconds)
  }

  useEffect(() => {
    if (!autoStart || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoStart, timeLeft, onExpire])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <span className={`inline-flex items-center text-xs font-medium ${timeLeft === 0 ? 'text-rose-900/40' : 'text-amber-800'} ${className}`}>
      {formatTime(timeLeft)}
    </span>
  )
}
