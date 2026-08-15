'use client'

import React, { useEffect, useState } from 'react'
import { ProductCard } from './ProductCard'
import { getProducts } from '@/services/products'
import { Product } from '@/types/database'

interface RecentlyViewedProps {
  currentProductId?: string
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ currentProductId }) => {
  const [recentProducts, setRecentProducts] = useState<Product[]>([])

  useEffect(() => {
    async function loadRecommendations() {
      const all = await getProducts()
      const filtered = all.filter(p => p.id !== currentProductId).slice(0, 4)
      setRecentProducts(filtered)
    }
    loadRecommendations()
  }, [currentProductId])

  if (recentProducts.length === 0) return null

  return (
    <div className="space-y-4 pt-8 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">You May Also Like</h3>
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Handcrafted Ethnic Recommendations</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {recentProducts.map(prod => (
          <ProductCard key={prod.id} product={prod} />
        ))}
      </div>
    </div>
  )
}
