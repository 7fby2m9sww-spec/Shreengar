import React from 'react'
import { redirect } from 'next/navigation'
import { checkAdminAuth } from '@/actions/catalog/actions'

export default async function Layout({ children }: { children: React.ReactNode }) {
  try {
    await checkAdminAuth('view_coupons')
  } catch (err) {
    redirect('/auth/login') // or a 403 page
  }
  return <>{children}</>
}
