import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Ticket, Percent, Coins } from 'lucide-react'
import { formatINR } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_spend: number
  is_active: boolean
  description?: string
  expires_at?: string
}

export default async function CouponsPage() {
  const supabase = await createClient()
  
  // Try fetching active coupons from database
  let coupons: Coupon[] = []
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
    
    if (!error && data) {
      coupons = data as Coupon[]
    }
  } catch (err) {
    console.error('Failed to fetch coupons:', err)
  }

  // Elegant fallback coupons if database is empty
  if (coupons.length === 0) {
    coupons = [
      {
        id: '1',
        code: 'FESTIVE20',
        discount_type: 'percentage',
        discount_value: 20,
        min_spend: 2999,
        is_active: true,
        description: 'Get 20% off on all items from our luxury festive collection.',
      },
      {
        id: '2',
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_spend: 999,
        is_active: true,
        description: 'Special 10% discount on your first royal purchase.',
      },
      {
        id: '3',
        code: 'ROYAL500',
        discount_type: 'fixed',
        discount_value: 500,
        min_spend: 4999,
        is_active: true,
        description: 'Flat ₹500 discount on premium ethnic designer wear.',
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">My Coupons & Offers</h1>
        <p className="text-xs text-muted mt-1">Apply these exclusive promo codes at checkout for royal discounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="relative bg-surface rounded-2xl border border-border shadow-sm p-6 overflow-hidden flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow group"
          >
            {/* Side punch-holes for ticket effect */}
            <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-surface-muted border border-border -translate-y-1/2 z-10" />
            <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-surface-muted border border-border -translate-y-1/2 z-10" />
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-surface-muted border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-800">
                {coupon.discount_type === 'percentage' ? (
                  <Percent className="w-6 h-6" />
                ) : (
                  <Coins className="w-6 h-6" />
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-foreground">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% Discount`
                    : `Flat ${formatINR(coupon.discount_value)} Off`}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 pr-4 leading-relaxed">
                  {coupon.description || `Save discount on orders above ${formatINR(coupon.min_spend)}.`}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-900/50 uppercase font-semibold block tracking-wider">
                  Promo Code
                </span>
                <span className="font-mono font-bold text-sm text-foreground tracking-wider">
                  {coupon.code}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-rose-900/50 uppercase font-semibold block tracking-wider">
                  Min Spend
                </span>
                <span className="font-medium text-xs text-foreground">
                  {formatINR(coupon.min_spend)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
