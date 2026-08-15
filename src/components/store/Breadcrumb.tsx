'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  linkClassName?: string
  activeClassName?: string
  iconClassName?: string
  separatorClassName?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = '',
  linkClassName = '',
  activeClassName = '',
  iconClassName = '',
  separatorClassName = '',
}) => {
  return (
    <nav className={`flex items-center text-xs text-muted-foreground py-3 font-medium ${className}`}>
      <Link href="/" className={`hover:text-foreground flex items-center transition-colors ${linkClassName}`}>
        <Home className={`w-3.5 h-3.5 mr-1 text-amber-700 ${iconClassName}`} />
        Home
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className={`w-3.5 h-3.5 mx-2 text-rose-900/40 ${separatorClassName}`} />
          {item.href ? (
            <Link href={item.href} className={`hover:text-foreground transition-colors ${linkClassName}`}>
              {item.label}
            </Link>
          ) : (
            <span className={`text-foreground font-semibold ${activeClassName}`}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
