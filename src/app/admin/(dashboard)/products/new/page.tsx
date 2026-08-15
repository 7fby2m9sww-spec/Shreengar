'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RedirectHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      router.replace(`/admin/products?new=true&category=${category}`)
    } else {
      router.replace('/admin/products?new=true')
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C0B26]"></div>
    </div>
  )
}

export default function NewProductPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C0B26]"></div>
      </div>
    }>
      <RedirectHandler />
    </Suspense>
  )
}
