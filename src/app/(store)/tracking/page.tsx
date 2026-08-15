'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { Search, Truck } from 'lucide-react'
import { getCustomerOrderByIdAction } from '@/actions/orders/actions'
import { useAuth } from '@/context/AuthContext'

export default function OrderTrackingPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [searchOrderNum, setSearchOrderNum] = useState('')
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login?next=/tracking')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchOrderNum.trim()) return
    setSearched(true)
    setIsSearching(true)
    try {
      const res = await getCustomerOrderByIdAction(searchOrderNum.trim())
      if (res.success && res.data) {
        setActiveOrder(res.data)
      } else {
        setActiveOrder(null)
      }
    } catch {
      setActiveOrder(null)
    } finally {
      setIsSearching(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-950"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-8 pb-16">
      <Breadcrumb items={[{ label: 'Order Tracking' }]} />

      <div className="text-center max-w-xl mx-auto space-y-3">
        <Truck className="w-10 h-10 text-amber-700 mx-auto" />
        <h1 className="font-serif text-3xl font-bold text-foreground">Track Your Shreengar Parcel</h1>
        <p className="text-xs text-muted-foreground">Enter your order ID or tracking number to view real-time courier updates.</p>

        {/* Tracking Search Input */}
        <form onSubmit={handleSearch} className="flex space-x-2 max-w-md mx-auto pt-2">
          <input
            type="text"
            value={searchOrderNum}
            onChange={e => setSearchOrderNum(e.target.value)}
            placeholder="e.g. SHR-85104"
            className="w-full px-4 py-2.5 text-xs bg-surface border border-border rounded-xl font-mono text-foreground focus:ring-2 focus:ring-rose-900"
            required
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2.5 bg-rose-950 text-amber-100 font-serif font-bold text-xs rounded-xl hover:bg-rose-900 flex items-center space-x-1 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Searching...' : 'Track'}</span>
          </button>
        </form>
      </div>

      {activeOrder ? (
        <div className="max-w-3xl mx-auto bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Order Number</span>
              <h3 className="font-mono font-bold text-base text-foreground">#{activeOrder.order_number}</h3>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Courier Partner</span>
              <p className="text-xs font-bold text-gold">
                <span className="text-xs text-muted-foreground bg-surface-warm px-2 py-1 rounded">{activeOrder.courier_name || 'Express Shipping'}</span> ({activeOrder.tracking_number || 'Preparing AWB'})
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface-muted/50 rounded-xl border border-border text-xs font-serif text-foreground">
            Current Status: <strong className="uppercase">{activeOrder.status}</strong>
          </div>
        </div>
      ) : searched && !isSearching ? (
        <div className="max-w-md mx-auto text-center p-8 bg-surface-muted/40 rounded-2xl border border-border text-xs text-muted-foreground font-serif">
          No order found matching &quot;{searchOrderNum}&quot;
        </div>
      ) : null}
    </div>
  )
}
