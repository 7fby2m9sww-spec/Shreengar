'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
    secondary: 'bg-surface-muted text-foreground border border-border hover:bg-surface-elevated dark:text-foreground',
    outline: 'border border-border text-foreground bg-transparent hover:bg-surface-muted dark:text-foreground',
    ghost: 'text-foreground hover:bg-surface-muted dark:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm dark:text-destructive-foreground',
    gold: 'bg-accent text-primary hover:opacity-90 font-semibold shadow-md hover:shadow-lg dark:text-primary',
    icon: 'text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-full dark:text-muted-foreground',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-8 py-3.5 text-base min-h-[52px]',
    icon: 'p-2',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
