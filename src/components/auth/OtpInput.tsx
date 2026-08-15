'use client'

import React, { useRef, useState, useEffect } from 'react'

export interface OtpInputProps {
  length?: number
  value?: string
  onChange?: (otp: string) => void
  onComplete?: (otp: string) => void
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value: externalValue,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  className = '',
}) => {
  const [digits, setDigits] = useState<string[]>(() => {
    if (externalValue) {
      return externalValue.slice(0, length).split('').concat(Array(Math.max(0, length - externalValue.length)).fill(''))
    }
    return Array(length).fill('')
  })
  const [prevExternalValue, setPrevExternalValue] = useState<string | undefined>(externalValue)

  if (externalValue !== prevExternalValue) {
    setPrevExternalValue(externalValue)
    const newDigits = externalValue
      ? externalValue.slice(0, length).split('').concat(Array(Math.max(0, length - externalValue.length)).fill(''))
      : Array(length).fill('')
    setDigits(newDigits)
  }

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  const updateDigits = (newDigits: string[]) => {
    setDigits(newDigits)
    const fullOtp = newDigits.join('')
    onChange?.(fullOtp)
    if (fullOtp.length === length && newDigits.every(d => d !== '')) {
      onComplete?.(fullOtp)
    }
  }

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return

    // Extract last entered character if multiple typed
    const char = val.slice(-1)
    if (!/^\d$/.test(char)) return

    const newDigits = [...digits]
    newDigits[index] = char
    updateDigits(newDigits)

    // Move to next input box if available
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current box digit
        const newDigits = [...digits]
        newDigits[index] = ''
        updateDigits(newDigits)
      } else if (index > 0) {
        // Move to previous box and clear
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        updateDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pastedData) return

    const newDigits = Array(length).fill('')
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i]
    }

    updateDigits(newDigits)

    const nextFocusIndex = Math.min(pastedData.length, length - 1)
    if (inputRefs.current[nextFocusIndex]) {
      inputRefs.current[nextFocusIndex]?.focus()
    }
  }

  return (
    <div className={`flex items-center justify-center space-x-2 sm:space-x-3 ${className}`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={el => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={e => handleChange(index, e)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl text-foreground dark:text-[#FFF4D6] bg-rose-50/50 dark:bg-[#140C10] border border-border dark:border-[#5D3944] rounded-xl focus:border-amber-700 dark:focus:border-[#D0A45C] focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-[#D0A45C]/25 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#555] dark:placeholder:text-[#AAA]"
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  )
}
