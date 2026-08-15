'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AdminPageHeader,
  EmptyState,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { getCustomerDetailsAction, AdminCustomerDetails } from '@/actions/customers/actions'
import { formatINR, formatDate } from '@/lib/utils'
import { 
  User, Mail, Calendar, Phone, ShoppingBag, 
  MapPin, Clock, CreditCard, ChevronLeft, ArrowUpRight 
} from 'lucide-react'
import Link from 'next/link'

export default function AdminCustomerDetailsPage() {
  const params = useParams()
  const customerId = params.customerId as string

  const [details, setDetails] = useState<AdminCustomerDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDetails() {
      try {
        const res = await getCustomerDetailsAction(customerId)
        if (res.success && res.data) {
          setDetails(res.data)
        } else {
          setProfileError(res.error || 'Customer profile could not be loaded.')
        }
      } catch {
        setProfileError('Customer profile could not be loaded.')
      }
      setIsLoading(false)
    }
    loadDetails()
  }, [customerId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <TableSkeleton rows={4} />
      </div>
    )
  }

  if (profileError || !details) {
    return (
      <div className="space-y-6">
        <Link href="/admin/customers">
          <Button variant="ghost" size="sm" className="text-[#5C0B26]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Customers
          </Button>
        </Link>
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-800 dark:text-red-200 font-medium">
          {profileError || 'Unable to load customer details. Please try again.'}
        </div>
      </div>
    )
  }

  const { profile, addresses, orderSummary, orderHistory } = details

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <Link href="/admin/customers" className="inline-flex items-center text-xs font-bold text-[#5C0B26] hover:underline mb-2">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back to Customer Directory
          </Link>
          <AdminPageHeader
            title={profile.full_name || 'Customer Profile'}
            description={`View detailed shopper profile, delivery addresses, and total spent history.`}
            badgeText="Loyalty Member"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal details & Addresses */}
        <div className="lg:col-span-1 space-y-8">
          {/* Personal Card */}
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-6 shadow-xs">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#5C0B26] text-[#D4AF37] font-serif font-bold text-lg flex items-center justify-center border-2 border-[#D4AF37]">
                {profile.full_name ? profile.full_name[0].toUpperCase() : 'C'}
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC]">
                  {profile.full_name || 'Customer User'}
                </h3>
                <span className="text-xs text-[#7A6B70] dark:text-[#D7C0B5]">
                  ID: {profile.id.slice(0, 8)}...
                </span>
              </div>
            </div>

            <div className="space-y-4 border-t border-[#5C0B26]/5 pt-4">
              <div className="flex items-center space-x-3 text-xs">
                <Mail className="w-4 h-4 text-[#8C3A57] flex-shrink-0" />
                <span className="text-[#2B1A1F] dark:text-[#FFF4DC] break-all">{profile.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <Phone className="w-4 h-4 text-[#8C3A57] flex-shrink-0" />
                <span className="text-[#2B1A1F] dark:text-[#FFF4DC]">{profile.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <Calendar className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-[#2B1A1F] dark:text-[#FFF4DC]">
                  Registered: {formatDate(profile.created_at)}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <Clock className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-[#2B1A1F] dark:text-[#FFF4DC]">
                  Account Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Addresses Card */}
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-6 shadow-xs">
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC] mb-4 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-[#8C3A57]" /> Saved Addresses ({addresses.length})
            </h3>
            
            {addressesError ? (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{addressesError}</span>
            ) : addresses.length === 0 ? (
              <p className="text-xs text-[#7A6B70]/80 italic">No saved addresses found.</p>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {addresses.map((addr) => (
                  <div 
                    key={addr.id} 
                    className={`p-3 rounded-xl border text-xs relative ${
                      addr.is_default 
                        ? 'border-[#5C0B26]/20 bg-[#5C0B26]/5' 
                        : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    {addr.is_default && (
                      <span className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    <h5 className="font-bold text-[#2B1A1F] dark:text-[#FFF4DC] mb-1">{addr.full_name}</h5>
                    <p className="text-[#7A6B70] dark:text-[#D7C0B5] leading-relaxed">
                      {addr.address_line1}
                      {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                      {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}
                      <br />
                      {addr.city}, {addr.state} - {addr.postal_code}
                      <br />
                      {addr.country}
                    </p>
                    <p className="text-[#8C3A57] font-semibold mt-1 flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-1" /> {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order stats & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-4 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-[#7A6B70] dark:text-[#D7C0B5]">Total Orders</span>
              <p className="text-xl font-serif font-bold text-[#5C0B26] mt-1">{orderSummary.total_orders}</p>
            </div>
            <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-4 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-[#7A6B70] dark:text-[#D7C0B5]">Total Spent</span>
              <p className="text-xl font-serif font-bold text-[#5C0B26] mt-1">{formatINR(orderSummary.total_spent)}</p>
            </div>
            <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-4 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-[#7A6B70] dark:text-[#D7C0B5]">Pending Orders</span>
              <p className="text-xl font-serif font-bold text-amber-600 mt-1">{orderSummary.pending_orders}</p>
            </div>
            <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-4 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-[#7A6B70] dark:text-[#D7C0B5]">Delivered / Cancelled</span>
              <p className="text-xl font-serif font-bold text-emerald-600 mt-1">
                {orderSummary.delivered_orders} <span className="text-xs text-red-500">/ {orderSummary.cancelled_orders}</span>
              </p>
            </div>
          </div>

          {/* Order History List */}
          <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 p-6 shadow-xs">
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F] dark:text-[#FFF4DC] mb-6 flex items-center">
              <ShoppingBag className="w-4 h-4 mr-2 text-[#8C3A57]" /> Purchase History
            </h3>

            {ordersError ? (
              <div className="p-4 bg-red-500/10 text-red-800 rounded-xl text-center text-xs font-semibold">
                {ordersError}
              </div>
            ) : orderHistory.length === 0 ? (
              <p className="text-xs text-[#7A6B70]/80 italic">No purchase history found for this member.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {orderHistory.map((order) => (
                  <div 
                    key={order.id} 
                    className="p-4 rounded-2xl border border-[#5C0B26]/5 bg-[#FAF8F5] dark:bg-[#2B1B20] flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#5C0B26] text-xs">#{order.order_number}</span>
                        <span className="text-[10px] text-[#7A6B70] dark:text-[#D7C0B5]">{formatDate(order.created_at)}</span>
                      </div>
                      {/* Priority to historical snapshot fallback to profile */}
                      <div className="text-[11px] text-[#7A6B70]">
                        Recipient: <span className="font-semibold text-[#2B1A1F] dark:text-[#FFF4DC]">
                          {order.customer_name || profile.full_name || 'N/A'}
                        </span>
                        {order.customer_phone && ` (${order.customer_phone})`}
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          order.status === 'delivered' 
                            ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' 
                            : order.status === 'cancelled'
                            ? 'bg-red-500/10 text-red-800 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                        }`}>
                          {order.status}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          order.payment_status === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                        }`}>
                          Payment: {order.payment_status}
                        </span>
                        {order.payment_method && (
                          <span className="text-[10px] text-[#7A6B70] flex items-center font-medium">
                            <CreditCard className="w-3 h-3 mr-1" /> {order.payment_method}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-[#7A6B70] dark:text-[#D7C0B5] block">Total Amount</span>
                        <span className="font-serif font-bold text-[#2B1A1F] text-xs">{formatINR(order.total_amount)}</span>
                      </div>
                      <Link href={`/admin/orders?search=${order.order_number}`}>
                        <Button variant="outline" size="sm" className="border-[#5C0B26]/10 text-xs text-[#5C0B26]">
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> View Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
