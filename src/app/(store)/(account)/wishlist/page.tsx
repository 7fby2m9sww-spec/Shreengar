import React from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/store/Breadcrumb'
import { ProductCard } from '@/components/store/ProductCard'
import { Heart } from 'lucide-react'
import { getSession } from '@/lib/auth/getSession'
import { redirect } from 'next/navigation'
import { AccountEmptyState } from '@/components/store/account/AccountEmptyState'
import { getWishlistForUser } from '@/services/store'

export default async function WishlistPage() {
  const session = await getSession()
  if (!session.authenticated) {
    redirect('/auth/login?next=/wishlist')
  }
  const userId = session.profile.id
  const wishlistedProducts = await getWishlistForUser(userId)

  return (
    <div className="space-y-6 pb-16 font-sans">
      <Breadcrumb items={[{ label: 'My Wishlist' }]} />

      <div className="flex items-center space-x-3">
        <Heart className="w-7 h-7 text-destructive fill-destructive" />
        <h1 className="font-serif text-3xl font-bold text-foreground">My Saved Wishlist</h1>
      </div>

      {wishlistedProducts.length === 0 ? (
        <AccountEmptyState
          Icon={Heart}
          title="Your wishlist is empty"
          description="Save your favorite ethnic outfits to buy later."
          ctaLabel="Explore Catalog"
          ctaHref="/shop"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
