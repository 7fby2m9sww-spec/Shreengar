'use client'

import React from 'react'

export interface OtpCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  isLoading?: boolean
  className?: string
}

export const OtpCard: React.FC<OtpCardProps> = ({
  title,
  subtitle,
  children,
  isLoading = false,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-md bg-surface/90 backdrop-blur-md rounded-2xl shadow-xl border border-border p-6 sm:p-8 space-y-6 relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="w-8 h-8 border-3 border-amber-800 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground max-w-xs mx-auto">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}
