import React from 'react'
import { Header } from '@/components/store/Header'
import { Footer } from '@/components/store/Footer'
import { SupportPortal } from '@/components/store/SupportPortal'
import { getFooterSettings } from '@/services/footer'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const footerConfig = await getFooterSettings()

  return (
    <div className="flex flex-col min-h-screen overflow-x-clip">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Footer config={footerConfig} />
      <SupportPortal />
    </div>
  )
}
