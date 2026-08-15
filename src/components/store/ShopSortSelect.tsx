'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'

interface ShopSortSelectProps {
  currentSort: string
}

export const ShopSortSelect: React.FC<ShopSortSelectProps> = ({ currentSort }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    
    if (newSort === 'newest') {
      params.delete('sort')
    } else {
      params.set('sort', newSort)
    }
    
    // Reset page to 1 on sort change
    params.delete('page')

    const newUrl = `${pathname}?${params.toString()}`
    router.push(newUrl, { scroll: false })
  }

  return (
    <div className="flex items-center space-x-1.5 px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground">
      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
      <select
        name="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="bg-transparent focus:outline-none font-medium cursor-pointer"
      >
        <option value="newest">Newest Arrivals</option>
        <option value="oldest">Oldest First</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="rating">Top Rated</option>
        <option value="best-selling">Best Selling</option>
        <option value="alphabetical-az">A → Z</option>
        <option value="alphabetical-za">Z → A</option>
      </select>
    </div>
  )
}
