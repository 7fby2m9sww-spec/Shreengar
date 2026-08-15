'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Inbox, Search, Filter, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

export { AdminPageHeader } from './layout/AdminPageHeader'
export { AdminBreadcrumbs } from './layout/AdminBreadcrumbs'

// ========================================================
// 2. ADMIN STATS / METRIC CARD
// ========================================================
interface MetricCardProps {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon: LucideIcon
  subtitle?: string
  badge?: string
  accentColor?: 'maroon' | 'gold' | 'emerald' | 'amber'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  trendLabel = 'vs last month',
  icon: Icon,
  subtitle,
  badge,
  accentColor = 'maroon',
  className,
}) => {
  const isPositive = trend !== undefined && trend >= 0

  const accentStyles = {
    maroon: 'bg-[#5C0B26]/10 text-[#5C0B26] border-[#5C0B26]/20',
    gold: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30',
    amber: 'bg-amber-600/10 text-amber-900 border-amber-600/30',
  }

  return (
    <div className={cn(
      'bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#5D3944] shadow-sm hover:shadow-md hover:border-[#5C0B26]/20 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden',
      className
    )}>
      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5C0B26] via-[#8C3A57] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#7A6B70]">
          {title}
        </span>
        <div className={cn('p-3 rounded-xl border transition-transform group-hover:scale-110', accentStyles[accentColor])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-serif font-bold text-[#2B1A1F] dark:text-[#FFF4DC] tracking-tight">{value}</h3>
          {badge && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FAF8F5] dark:bg-[#211318] text-[#8C3A57] dark:text-[#FFF4DC] border border-[#5C0B26]/10 dark:border-[#5D3944] rounded-full">
              {badge}
            </span>
          )}
        </div>

        {trend !== undefined && (
          <div className="flex items-center space-x-1.5 text-xs">
            {isPositive ? (
              <span className="inline-flex items-center text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                +{trend}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
                {trend}%
              </span>
            )}
            <span className="text-[#7A6B70]">{trendLabel}</span>
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-[#7A6B70] dark:text-[#D7C0B5] font-sans">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// ========================================================
// 3. STATUS BADGE
// ========================================================
interface StatusBadgeProps {
  status: string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const normalized = (status || '').toLowerCase().trim()

  const map: Record<string, { label: string; style: string }> = {
    // Orders
    pending: { label: 'Pending', style: 'bg-amber-100/80 text-amber-900 border-amber-300' },
    processing: { label: 'Processing', style: 'bg-blue-100/80 text-blue-900 border-blue-300' },
    packed: { label: 'Packed', style: 'bg-purple-100/80 text-purple-900 border-purple-300' },
    shipped: { label: 'Shipped', style: 'bg-indigo-100/80 text-indigo-900 border-indigo-300' },
    delivered: { label: 'Delivered', style: 'bg-emerald-100/80 text-emerald-900 border-emerald-300' },
    cancelled: { label: 'Cancelled', style: 'bg-rose-100/80 text-rose-900 border-rose-300' },
    refunded: { label: 'Refunded', style: 'bg-gray-100/80 text-gray-800 border-gray-300' },

    // Stock & Inventory
    in_stock: { label: 'In Stock', style: 'bg-emerald-100/80 text-emerald-900 border-emerald-300' },
    low_stock: { label: 'Low Stock', style: 'bg-amber-100/80 text-amber-900 border-amber-300' },
    out_of_stock: { label: 'Out of Stock', style: 'bg-rose-100/80 text-rose-900 border-rose-300' },

    // Reviews & Content
    approved: { label: 'Approved', style: 'bg-emerald-100/80 text-emerald-900 border-emerald-300' },
    rejected: { label: 'Rejected', style: 'bg-rose-100/80 text-rose-900 border-rose-300' },

    // General Status
    active: { label: 'Active', style: 'bg-emerald-100/80 text-emerald-900 border-emerald-300' },
    inactive: { label: 'Inactive', style: 'bg-gray-100/80 text-gray-700 border-gray-300' },
    true: { label: 'Active', style: 'bg-emerald-100/80 text-emerald-900 border-emerald-300' },
    false: { label: 'Inactive', style: 'bg-gray-100/80 text-gray-700 border-gray-300' },
  }

  const badgeConfig = map[normalized] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    style: 'bg-gray-100 text-gray-800 border-gray-300',
  }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border', badgeConfig.style, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {badgeConfig.label}
    </span>
  )
}

// ========================================================
// 4. EMPTY STATE CARD
// ========================================================
interface EmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  secondaryAction,
  className,
}) => {
  return (
      <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 dark:border-[#5D3944] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-amber-100/50 border border-[#5C0B26]/10 flex items-center justify-center shadow-inner text-[#5C0B26] dark:bg-[#5C0B26] dark:border-[#B88A44]/30 dark:text-[#FFF4DC]">
          <Icon className="w-8 h-8 opacity-80" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="font-serif text-xl font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">{title}</h3>
          <p className="text-xs text-[#7A6B70] dark:text-[#FAF8F5] leading-relaxed">{description}</p>
        </div>

        {(action || secondaryAction) && (
          <div className="pt-2 flex items-center space-x-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
  )
}

// ========================================================
// 5. SHIMMER SKELETON LOADERS
// ========================================================
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 dark:border-[#5D3944] p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-rose-950/10 rounded-lg w-1/4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-amber-500/10 rounded-xl w-full" />
        ))}
      </div>
    </div>
  )
}

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 dark:border-[#5D3944] p-6 space-y-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-rose-950/10 rounded w-1/3" />
        <div className="w-8 h-8 bg-amber-500/10 rounded-xl" />
      </div>
      <div className="h-8 bg-rose-950/10 rounded w-1/2" />
      <div className="h-3 bg-amber-500/10 rounded w-2/3" />
    </div>
  )
}

// ========================================================
// 6. SEARCH & FILTER BAR
// ========================================================
interface SearchAndFilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  actions,
  className,
}) => {
  return (
    <div className={cn('bg-white dark:bg-[#211318] p-4 rounded-2xl border border-[#5C0B26]/10 dark:border-[#5D3944] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3', className)}>
      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6B70] dark:text-[#B89AA3]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] dark:placeholder:text-[#FFF4DC] border border-rose-900/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900 transition-colors"
          />
        </div>

        {/* Filter slots */}
        {filters}
      </div>

      {/* Action buttons slot */}
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  )
}
