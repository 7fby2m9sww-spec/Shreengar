'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface ShreengarLogoProps {
  className?: string
  href?: string | null
  alt?: string
  title?: string
  variant?: 'auto' | 'light' | 'dark'
}

export const ShreengarLogo: React.FC<ShreengarLogoProps> = ({
  className = '',
  href = '/',
  alt = 'Shreengar',
  title = 'Shreengar',
  variant = 'auto',
}) => {
  const [useFallbackLockup, setUseFallbackLockup] = useState(false)

  const renderImages = () => {
    if (useFallbackLockup) {
      if (variant === 'dark') {
        return (
          <img
            src="/branding/shreengar-header-lockup-dark-v3.png"
            alt={alt}
            className="h-[32px] sm:h-[38px] md:h-[44px] w-auto object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
        )
      }
      if (variant === 'light') {
        return (
          <img
            src="/branding/shreengar-header-lockup-light-v3.png"
            alt={alt}
            className="h-[32px] sm:h-[38px] md:h-[44px] w-auto object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
        )
      }
      return (
        <>
          <img
            src="/branding/shreengar-header-lockup-light-v3.png"
            alt={alt}
            className="h-[32px] sm:h-[38px] md:h-[44px] w-auto object-contain block dark:hidden shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
          <img
            src="/branding/shreengar-header-lockup-dark-v3.png"
            alt={alt}
            className="h-[32px] sm:h-[38px] md:h-[44px] w-auto object-contain hidden dark:block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
        </>
      )
    }

    if (variant === 'dark') {
      return (
        <>
          <img
            src="/branding/shreengar-framed-s-emblem-light.png"
            alt=""
            aria-hidden="true"
            onError={() => setUseFallbackLockup(true)}
            className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] md:w-[44px] md:h-[44px] object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
          <img
            src="/branding/shreengar-wordmark-light.png"
            alt={alt}
            onError={() => setUseFallbackLockup(true)}
            className="h-[22px] sm:h-[27px] md:h-[32px] w-auto object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
        </>
      )
    }

    if (variant === 'light') {
      return (
        <>
          <img
            src="/branding/shreengar-framed-s-emblem-dark-maroon.png"
            alt=""
            aria-hidden="true"
            onError={() => setUseFallbackLockup(true)}
            className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] md:w-[44px] md:h-[44px] object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
          <img
            src="/branding/shreengar-wordmark-header-dark.png"
            alt={alt}
            onError={() => setUseFallbackLockup(true)}
            className="h-[22px] sm:h-[27px] md:h-[32px] w-auto object-contain block shrink-0"
            style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
          />
        </>
      )
    }

    // Default 'auto': Responsive Theme-adaptive rendering
    return (
      <>
        {/* Light theme logo assets */}
        <img
          src="/branding/shreengar-framed-s-emblem-dark-maroon.png"
          alt=""
          aria-hidden="true"
          onError={() => setUseFallbackLockup(true)}
          className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] md:w-[44px] md:h-[44px] object-contain block dark:hidden shrink-0"
          style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
        />
        <img
          src="/branding/shreengar-wordmark-header-dark.png"
          alt={alt}
          onError={() => setUseFallbackLockup(true)}
          className="h-[22px] sm:h-[27px] md:h-[32px] w-auto object-contain block dark:hidden shrink-0"
          style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
        />

        {/* Dark theme logo assets (Champagne Antique Gold) */}
        <img
          src="/branding/shreengar-framed-s-emblem-light.png"
          alt=""
          aria-hidden="true"
          onError={() => setUseFallbackLockup(true)}
          className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] md:w-[44px] md:h-[44px] object-contain hidden dark:block shrink-0"
          style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
        />
        <img
          src="/branding/shreengar-wordmark-light.png"
          alt={alt}
          onError={() => setUseFallbackLockup(true)}
          className="h-[22px] sm:h-[27px] md:h-[32px] w-auto object-contain hidden dark:block shrink-0"
          style={{ objectFit: 'contain', filter: 'none', mixBlendMode: 'normal', opacity: 1 }}
        />
      </>
    )
  }

  const content = (
    <div className={`inline-flex items-center justify-start gap-[8px] sm:gap-[10px] md:gap-[12px] shrink-0 select-none h-[32px] sm:h-[38px] md:h-[44px] ${className}`}>
      {renderImages()}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Shreengar homepage"
        className="inline-flex items-center justify-start shrink-0 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      >
        {content}
      </Link>
    )
  }

  return content
}

