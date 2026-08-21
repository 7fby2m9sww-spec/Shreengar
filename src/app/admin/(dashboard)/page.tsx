'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AdminPageHeader,
  MetricCard,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from '@/components/admin/AdminUI'
import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  Activity,
  Plus,
  TrendingUp,
  Ticket,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { getAdminDashboardData, DashboardOverviewData } from '@/services/admin'
import { formatINR, formatDate } from '@/lib/utils'

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getAdminDashboardData()
      setData(res)
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError('Unable to load dashboard metrics. Please check database connection.')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="Monitor sales, orders, customers, stock and store activity."
          badgeText="Current Overview"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TableSkeleton rows={2} />
          <TableSkeleton rows={2} />
          <TableSkeleton rows={2} />
          <TableSkeleton rows={2} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="Monitor sales, orders, customers, stock and store activity."
          badgeText="Current Overview"
        />
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-serif font-bold text-sm text-rose-900">Unable to load dashboard metrics</h3>
          <p className="text-xs text-rose-700">{error || 'Stale data is hidden for integrity.'}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-semibold hover:bg-rose-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      </div>
    )
  }

  const { kpis, monthlySales, fulfillmentPipeline, recentOrders, recentActivity } = data
  const yearSalesTotal = monthlySales.reduce((acc, m) => acc + m.sales, 0)
  const maxMonthlySales = Math.max(...monthlySales.map(m => m.sales), 1)

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Action Hierarchy */}
      <AdminPageHeader
        title="Dashboard"
        description="Monitor sales, orders, customers, stock and store activity."
        badgeText="Current Overview"
        actions={
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/coupons"
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center space-x-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-600" />
              <span>Create Coupon</span>
            </Link>

            <Link
              href="/admin/orders"
              className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center space-x-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Orders</span>
            </Link>

            <Link
              href="/admin/products"
              className="px-4 py-2 bg-[#5C0B26] hover:bg-[#8C3A57] text-[#FAF8F5] text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Add Product</span>
            </Link>
          </div>
        }
      />

      {/* 2. Real Database KPI Cards (No fake trends) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gross Revenue"
          value={formatINR(kpis.totalSales)}
          icon={DollarSign}
          accentColor="gold"
          badge="Revenue"
        />
        <MetricCard
          title="Total Orders"
          value={kpis.totalOrders}
          icon={ShoppingBag}
          accentColor="maroon"
          badge="Orders"
        />
        <MetricCard
          title="Active Customers"
          value={kpis.activeCustomers}
          icon={Users}
          accentColor="emerald"
          badge="Customers"
        />
        <MetricCard
          title="Low Stock Alerts"
          value={kpis.lowStockAlerts}
          icon={AlertTriangle}
          accentColor="maroon"
          badge="Inventory"
        />
      </div>

      {/* 3. Dynamic Sales Overview & Order Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real Monthly Sales Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#2B1A1F] flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-[#5C0B26]" />
                <span>Sales & Revenue Summary</span>
              </h3>
              <p className="text-[11px] text-gray-500">Monthly gross revenue recorded in the database.</p>
            </div>
            <span className="text-xs font-semibold text-[#5C0B26] bg-[#5C0B26]/5 px-2.5 py-1 rounded-lg font-mono">
              Year {currentYear}
            </span>
          </div>

          {yearSalesTotal === 0 ? (
            <div className="h-44 bg-[#FAF8F5] rounded-xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center space-y-1">
              <TrendingUp className="w-6 h-6 text-gray-400" />
              <p className="text-xs font-semibold text-gray-600">Sales data will appear after completed orders are recorded.</p>
              <p className="text-[10px] text-gray-400">Current year sales database sum is ₹0.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <div className="h-44 bg-[#FAF8F5] rounded-xl border border-gray-100 p-4 flex items-end justify-between gap-2 min-w-[500px]">
                {monthlySales.map((item, idx) => {
                  const heightPercent = (item.sales / maxMonthlySales) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                      <div
                        className="w-full bg-[#5C0B26] group-hover:bg-[#8C3A57] rounded-t-md transition-all relative"
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono transition-opacity whitespace-nowrap z-10">
                          {formatINR(item.sales)}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-gray-400">{item.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Real Order Pipeline */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F]">Fulfillment Pipeline</h3>
            <p className="text-[11px] text-gray-500">Live order status counts from database.</p>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: 'Pending', count: fulfillmentPipeline.pending, color: 'bg-amber-500' },
              { label: 'Processing', count: fulfillmentPipeline.processing, color: 'bg-blue-600' },
              { label: 'Shipped', count: fulfillmentPipeline.shipped, color: 'bg-[#5C0B26]' },
              { label: 'Delivered', count: fulfillmentPipeline.delivered, color: 'bg-emerald-600' },
              { label: 'Cancelled', count: fulfillmentPipeline.cancelled, color: 'bg-rose-500' },
            ].map(item => {
              const total = fulfillmentPipeline.total || 1
              const percent = Math.round((item.count / total) * 100)
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700 text-[11px]">
                    <span>{item.label}</span>
                    <span className="font-mono font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${fulfillmentPipeline.total === 0 ? 0 : percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Real Recent Orders & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-[#FAF8F5] border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F] flex items-center space-x-1.5">
              <ShoppingBag className="w-4 h-4 text-[#5C0B26]" />
              <span>Recent Customer Orders</span>
            </h3>
            <Link href="/admin/orders" className="text-xs font-bold text-[#5C0B26] hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No recent orders yet" description="Orders placed by customers will appear here in real time." />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {recentOrders.map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-amber-50/20">
                  <div>
                    <span className="font-mono font-bold text-gray-900">#{order.order_number}</span>
                    <p className="text-[11px] text-gray-500">{formatDate(order.created_at)}</p>
                  </div>

                  <span className="font-bold text-gray-900">{formatINR(order.total_amount)}</span>

                  <StatusBadge status={order.status as any} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Activity Logs */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-[#FAF8F5] border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#2B1A1F] flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-[#5C0B26]" />
              <span>Recent Activity</span>
            </h3>
            <Link href="/admin/activity" className="text-xs font-bold text-[#5C0B26] hover:underline">
              Logs
            </Link>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 text-xs">
            {recentActivity.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-[11px]">No recent Admin activity.</p>
            ) : (
              recentActivity.map(log => (
                <div key={log.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-0.5">
                  <p className="font-bold text-gray-800 text-[11px]">{log.action}</p>
                  <p className="text-[10px] text-gray-500">{log.user_email || 'Admin User'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
