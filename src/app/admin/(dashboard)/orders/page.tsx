'use client'

import React, { useEffect, useState } from 'react'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getAllOrdersAction, updateOrderStatusAction } from '@/actions/orders/actions'
import { Order } from '@/types/database'
import { formatINR, formatDate } from '@/lib/utils'
import { Truck, ShoppingBag, ArrowUpRight } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { getAllowedTransitions } from '@/lib/orders/orderWorkflow'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingNo, setTrackingNo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { showToast } = useToast()
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await getAllOrdersAction()
        if (res.success && res.data) {
          setOrders(res.data)
        } else {
          setErrorMsg('Unable to load orders. Please try again.')
        }
      } catch {
        setErrorMsg('Unable to load orders. Please try again.')
      }
      setIsLoading(false)
    }
    loadOrders()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: Order['status']) => {
    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    try {
      const res = await updateOrderStatusAction(id, newStatus)
      if (res.success) {
        setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: newStatus } : o)))
        showToast('Success', 'Order status updated successfully!', 'success')
      } else {
        showToast('Error', res.error || 'Failed to update order status.', 'error')
      }
    } catch {
      showToast('Error', 'Failed to update order status.', 'error')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    const id = selectedOrder.id
    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    try {
      const res = await updateOrderStatusAction(selectedOrder.id, 'shipped', trackingNo, 'Blue Dart / Delhivery Express')
      if (res.success) {
        setOrders(prev =>
          prev.map(o => (o.id === id ? { ...o, tracking_number: trackingNo, status: 'shipped' } : o))
        )
        showToast('Success', 'Order dispatched and status updated to shipped!', 'success')
      } else {
        showToast('Error', res.error || 'Failed to update order status.', 'error')
      }
    } catch {
      showToast('Error', 'Failed to update order status.', 'error')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setSelectedOrder(null)
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const columns: Column<Order>[] = [
    {
      header: 'Order Reference',
      accessor: (row) => (
        <div className="flex flex-col">
            <span className="font-mono font-bold text-[#5C0B26] dark:text-[#FFF4DC]">#{row.order_number}</span>
            <span className="text-[10px] text-[#7A6B70] dark:text-[#D7C0B5]">{formatDate(row.created_at)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#2B1A1F] text-xs">{row.customer_name || 'N/A'}</span>
          <span className="text-[10px] text-[#7A6B70] dark:text-[#D7C0B5]">{row.customer_email || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Fulfillment Status',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <select
            value={row.status}
            disabled={updatingIds.has(row.id)}
            onChange={e => handleUpdateStatus(row.id, e.target.value as Order['status'])}
            className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-[#5C0B26]/15 bg-[#FAF8F5] text-[#2B1A1F] dark:text-[#FFF4DC] focus:outline-none focus:ring-2 focus:ring-[#5C0B26] disabled:opacity-50"
          >
            {[row.status, ...getAllowedTransitions(row.status, row.payment_status as any)].map(opt => (
              <option key={opt} value={opt}>
                {getStatusLabel(opt)}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      header: 'Payment Status',
      accessor: (row) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          row.payment_status === 'paid'
            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
            : row.payment_status === 'pending'
            ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20'
            : 'bg-red-500/10 text-red-800 dark:text-red-200 border border-red-500/20'
        }`}>
          {row.payment_status === 'pending' ? 'Pending payment' : row.payment_status}
        </span>
      ),
    },
    {
      header: 'Order Total',
      accessor: (row) => (
        <span className="font-serif font-bold text-[#2B1A1F] text-xs">
          {formatINR(row.total_amount)}
        </span>
      ),
    },
    {
      header: 'Courier Tracking',
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-[#8C3A57]">
          {row.tracking_number ? (
            <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-900 border border-amber-500/20">
              {row.tracking_number}
            </span>
          ) : (
            <span className="text-[#7A6B70]/60 italic text-[11px]">Unassigned</span>
          )}
        </span>
      ),
    },
  ]

  const filteredOrders = orders.filter(o =>
    o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.tracking_number && o.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders & Fulfillment"
        description="Track customer purchases, update delivery status, and assign courier AWB tracking codes."
        badgeText={`${orders.length} Orders`}
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search order number or tracking code..."
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : errorMsg ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-800 dark:text-red-200 font-medium">
          {errorMsg}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="Customer order records will appear here as soon as orders are placed."
          icon={ShoppingBag}
        />
      ) : (
        <div className="bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2">
          <DataTable
            columns={columns}
            data={filteredOrders}
            actions={(row) => {
              const isPaid = row.payment_status === 'paid'
              const isPacked = row.status === 'packed'
              const canDispatch = isPaid && isPacked

              return (
                <div className="flex flex-col space-y-1 items-end">
                  <Button
                    onClick={() => {
                      setSelectedOrder(row)
                      setTrackingNo(row.tracking_number || '')
                    }}
                    disabled={!canDispatch || updatingIds.has(row.id)}
                    variant="outline"
                    size="sm"
                    className="border-[#5C0B26]/20 text-[#5C0B26] hover:bg-[#5C0B26]/5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" /> Dispatch Order
                  </Button>
                  {!canDispatch && (
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                      Payment must be completed and the order packed before dispatch.
                    </span>
                  )}
                </div>
              )
            }}
          />
        </div>
      )}

      {/* Dispatch Tracking Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Assign Courier Tracking - #${selectedOrder?.order_number}`}
      >
        <form onSubmit={handleSaveTracking} className="space-y-4">
          <Input
            label="Courier Logistics Partner"
            defaultValue="Blue Dart / Delhivery Express"
          />
          <Input
            label="AWB Tracking Code"
            value={trackingNo}
            onChange={e => setTrackingNo(e.target.value)}
            placeholder="e.g. AWB98234123"
            required
          />
          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setSelectedOrder(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
              Confirm & Mark Shipped
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
