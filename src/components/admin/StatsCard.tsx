import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon: LucideIcon
  className?: string
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  trend,
  trendLabel = 'vs last month',
  icon: Icon,
  className,
}) => {
  const isPositive = trend !== undefined && trend >= 0

  return (
    <div className={cn('bg-white p-5 rounded-xl border border-rose-900/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-950/60">{title}</span>
        <div className="p-2.5 rounded-lg bg-rose-950/5 text-rose-950">
          <Icon className="w-5 h-5 text-amber-700" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-serif font-bold text-rose-950">{value}</h3>
        {trend !== undefined && (
          <div className="mt-2 flex items-center space-x-1 text-xs">
            {isPositive ? (
              <span className="flex items-center text-emerald-700 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{trend}%
              </span>
            ) : (
              <span className="flex items-center text-rose-700 font-semibold">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {trend}%
              </span>
            )}
            <span className="text-rose-950/50">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
