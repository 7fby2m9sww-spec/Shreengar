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
import { createClient } from '@/lib/supabase/client'
import { Review } from '@/types/database'
import { Star, CheckCircle, XCircle, Trash2, MessageSquare } from 'lucide-react'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadReviews() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
        if (data) setReviews(data as Review[])
      } catch {}
      setIsLoading(false)
    }
    loadReviews()
  }, [])

  const handleStatusChange = async (id: string, newStatus: Review['status']) => {
    setReviews(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)))
    try {
      const supabase = createClient()
      await supabase.from('reviews').update({ status: newStatus }).eq('id', id)
    } catch {}
  }

  const columns: Column<Review>[] = [
    {
      header: 'Author & User',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[#5C0B26] text-[#D4AF37] font-serif font-bold text-xs flex items-center justify-center border border-[#D4AF37]">
            {row.user_name ? row.user_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F]">{row.user_name}</h4>
            <span className="text-[10px] text-[#7A6B70]">Product ID: {row.product_id.slice(0, 8)}...</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Rating',
      accessor: (row) => (
        <div className="flex items-center space-x-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 w-fit">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span className="font-bold text-xs text-[#2B1A1F]">{row.rating} / 5</span>
        </div>
      ),
    },
    {
      header: 'Review Feedback',
      accessor: (row) => (
        <div className="max-w-md space-y-0.5">
          {row.title && <h5 className="font-bold text-xs text-[#2B1A1F]">{row.title}</h5>}
          <p className="text-xs text-[#7A6B70] line-clamp-2">{row.comment}</p>
        </div>
      ),
    },
    {
      header: 'Moderation Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
  ]

  const filteredReviews = reviews.filter(r =>
    r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.comment && r.comment.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Review Moderation"
        description="Approve, reject, or delete product feedback submissions before publishing to the storefront."
        badgeText={`${reviews.length} Submissions`}
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search review author or comment text..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          title="No Reviews Submitted"
          description="Customer reviews submitted on product pages will appear here for approval."
          icon={MessageSquare}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable
            columns={columns}
            data={filteredReviews}
            actions={(row) => (
              <div className="flex items-center justify-end space-x-1.5">
                <button
                  onClick={() => handleStatusChange(row.id, 'approved')}
                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Approve Review"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStatusChange(row.id, 'rejected')}
                  className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Reject Review"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReviews(reviews.filter(r => r.id !== row.id))}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}
