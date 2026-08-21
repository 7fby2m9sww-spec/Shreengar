'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AdminBreadcrumbs, BreadcrumbItem } from './AdminBreadcrumbs'

export interface AdminPageHeaderProps {
  title: string
  description?: string
  badgeText?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  secondaryActions?: React.ReactNode
  className?: string
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  badgeText,
  breadcrumbs,
  actions,
  secondaryActions,
  className,
}) => {
  return (
    <div className={cn('space-y-3 pb-6 border-b border-[#5C0B26]/10 dark:border-[#5D3944]', className)}>
      {/* Breadcrumbs Area */}
      <AdminBreadcrumbs customItems={breadcrumbs} />

      {/* Main Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2B1A1F] dark:text-[#FFF4DC]">
              {title}
            </h1>
            {badgeText && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5C0B26]/10 text-[#5C0B26] border border-[#5C0B26]/20 dark:bg-[#351821] dark:text-[#F0D7DD] dark:border-[#B88A44]/25">
                {badgeText}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#7A6B70] dark:text-[#D7C0B5]">
              {description}
            </p>
          )}
        </div>

        {/* Actions Cluster */}
        {(actions || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {secondaryActions}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
