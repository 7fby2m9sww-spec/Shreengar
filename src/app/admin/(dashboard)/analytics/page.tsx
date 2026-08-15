'use client'

import React, { useEffect, useState } from 'react'
import { AdminPageHeader, MetricCard } from '@/components/admin/AdminUI'
import { DollarSign, ShoppingBag, TrendingUp, Users, BarChart3, PieChart, Sparkles } from 'lucide-react'
import { getAdminKPIs } from '@/services/admin'
import { formatINR } from '@/lib/utils'

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeCustomers: 0,
    lowStockAlerts: 0,
  })

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await getAdminKPIs()
        setKpis(data)
      } catch {}
    }
    loadAnalytics()
  }, [])

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Business Analytics & Revenue"
        description="Monitor gross revenue growth, average basket value, and customer retention metrics."
        badgeText="Executive Reports"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Gross Revenue"
          value={formatINR(kpis.totalSales)}
          trend={14.2}
          trendLabel="vs last quarter"
          icon={DollarSign}
          accentColor="gold"
        />
        <MetricCard
          title="Average Order Value"
          value={formatINR(kpis.totalOrders ? Math.round(kpis.totalSales / kpis.totalOrders) : 0)}
          trend={6.8}
          trendLabel="basket size growth"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <MetricCard
          title="Total Orders"
          value={kpis.totalOrders}
          trend={9.1}
          trendLabel="orders processed"
          icon={ShoppingBag}
          accentColor="maroon"
        />
        <MetricCard
          title="Active Members"
          value={kpis.activeCustomers}
          trend={4.5}
          trendLabel="repeat buyers"
          icon={Users}
          accentColor="amber"
        />
      </div>

      {/* Analytics Visualization Placeholder Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Revenue Growth Graph (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-[#5C0B26]/10 shadow-sm space-y-6 dark:bg-[#211318] dark:border-[#70424E]">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif font-bold text-lg text-[#2B1A1F]">Revenue & Conversion Timeline</h3>
            </div>
            <span className="text-xs font-semibold text-[#8C3A57] bg-[#FAF8F5] px-3 py-1 rounded-xl border border-[#5C0B26]/10">
              Monthly View
            </span>
          </div>

          <div className="h-64 bg-gradient-to-b from-[#FAF8F5] to-white rounded-xl border border-[#5C0B26]/10 flex flex-col justify-end p-6 relative dark:bg-none dark:bg-[#1A0F13]">
            <svg className="w-full h-44 text-[#5C0B26]/40" viewBox="0 0 500 120" fill="none" preserveAspectRatio="none">
              <path
                d="M0,100 Q75,30 150,70 T300,40 T450,20 L500,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                d="M0,100 Q75,30 150,70 T300,40 T450,20 L500,10 L500,120 L0,120 Z"
                fill="url(#analyticsGradient)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C0B26" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex items-center justify-between text-xs text-[#7A6B70] font-mono pt-3 border-t border-[#5C0B26]/10">
              <span>Jan 2026</span><span>Feb 2026</span><span>Mar 2026</span><span>Apr 2026</span><span>May 2026</span><span>Jun 2026</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-2xl border border-[#5C0B26]/10 shadow-sm space-y-6 dark:bg-[#211318] dark:border-[#70424E]">
          <div className="flex items-center space-x-2 pb-4 border-b border-[#5C0B26]/10">
            <PieChart className="w-5 h-5 text-[#8C3A57]" />
            <h3 className="font-serif font-bold text-lg text-[#2B1A1F]">Category Share</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-[#2B1A1F]">
                <span>Designer Anarkalis</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-[#FAF8F5] h-2 rounded-full overflow-hidden border border-[#5C0B26]/10">
                <div className="bg-[#5C0B26] h-full rounded-full w-[45%] bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-[#2B1A1F]">
                <span>Silk Kurtis</span>
                <span>30%</span>
              </div>
              <div className="w-full bg-[#FAF8F5] h-2 rounded-full overflow-hidden border border-[#5C0B26]/10">
                <div className="bg-[#8C3A57] h-full rounded-full w-[30%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-[#2B1A1F]">
                <span>Festive Ethnic Sets</span>
                <span>25%</span>
              </div>
              <div className="w-full bg-[#FAF8F5] h-2 rounded-full overflow-hidden border border-[#5C0B26]/10">
                <div className="bg-[#D4AF37] h-full rounded-full w-[25%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
