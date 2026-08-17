'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Coupon } from '@/types/database'
import { Sparkles, Tag, Copy, Check } from 'lucide-react'
import { formatINR } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'
import { getPublicActiveCouponsAction } from '@/actions/admin/couponActions'

export const CouponAnnouncementBar: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const { showToast } = useToast()

  const fetchActiveCoupons = async () => {
    try {
      const activeCoupons = await getPublicActiveCouponsAction()
      if (activeCoupons && activeCoupons.length > 0) {
        setCoupons(activeCoupons)
        return
      }

      // Fallback client-side fetch if action returns empty
      const supabase = createClient()
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (data) {
        const now = new Date()
        const validCoupons = (data as any[]).filter(c => {
          if (!c.is_active) return false

          const start = c.start_date || c.starts_at
          const end = c.end_date || c.expires_at

          if (start && new Date(start).getTime() > now.getTime()) return false
          if (end && new Date(end).getTime() < now.getTime()) return false

          const limit = c.usage_limit
          const used = c.used_count || 0
          if (limit !== null && limit !== undefined && used >= limit) return false

          return true
        })
        setCoupons(validCoupons as Coupon[])
      }
    } catch {
      setCoupons([])
    }
  }

  useEffect(() => {
    fetchActiveCoupons()

    const supabase = createClient()
    const channel = supabase
      .channel('storefront_coupons_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        () => {
          fetchActiveCoupons()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      showToast('Coupon Copied!', `Code "${code}" copied to clipboard!`, 'success')
      setTimeout(() => setCopiedCode(null), 2500)
    }
  }

  const renderContent = useMemo(() => {
    if (coupons.length === 0) {
      return (
        <div className="inline-flex items-center space-x-3 text-xs font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Welcome to SHREENGAR | Royal Ethnic Couture | Complimentary Express Shipping Nationwide</span>
        </div>
      )
    }

    return (
      <div className="inline-flex items-center space-x-6">
        {coupons.map((c, idx) => {
          const rawType = (c.type as string) || (c as any).discount_type || 'percentage'
          const isFixed = rawType === 'fixed_amount' || rawType === 'fixed'
          const discountStr = isFixed
            ? `Flat ${formatINR(c.value)} OFF`
            : `${c.value}% OFF`

          const minSpend = Number(c.min_spend || (c as any).minimum_order_amount || 0)
          const targetStr = (c.first_time_only || c.target_type === 'first_time_buyers')
            ? 'for First-Time Buyers'
            : minSpend > 0
            ? `on Orders Above ${formatINR(minSpend)}`
            : 'Storewide'

          const isCopied = copiedCode === c.code

          return (
            <React.Fragment key={c.id || c.code}>
              {idx > 0 && <span className="text-amber-400/60 font-serif font-bold text-sm px-2">✦</span>}

              <div
                onClick={(e) => handleCopy(c.code, e)}
                className="inline-flex items-center space-x-2.5 cursor-pointer hover:opacity-90 group transition-all"
                title={`Click to copy code "${c.code}"`}
              >
                <Tag className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-mono font-bold text-amber-300 bg-amber-400/15 group-hover:bg-amber-400/30 px-2 py-0.5 rounded border border-amber-400/30 text-xs tracking-wider flex items-center space-x-1">
                  <span>{c.code}</span>
                  {isCopied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-amber-200 opacity-70 group-hover:opacity-100" />
                  )}
                </span>
                <span className="font-medium tracking-wide text-amber-50">
                  {discountStr} {targetStr}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    )
  }, [coupons, copiedCode, showToast])

  return (
    <div className="announcement-viewport bg-rose-950 text-amber-100 text-[11px] sm:text-xs h-[34px] sm:h-9 border-b border-amber-400/20 shadow-sm overflow-hidden whitespace-nowrap flex items-center select-none">
      <div className="announcement-track flex flex-row items-center whitespace-nowrap min-w-max">
        {/* Primary Dynamic Group */}
        <div className="announcement-group inline-flex items-center space-x-6 px-6 shrink-0 whitespace-nowrap">
          {renderContent}
        </div>
        {/* Duplicate Dynamic Group for Seamless Infinite Loop */}
        <div className="announcement-group inline-flex items-center space-x-6 px-6 shrink-0 whitespace-nowrap" aria-hidden="true">
          {renderContent}
        </div>
      </div>
    </div>
  )
}
