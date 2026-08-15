import React from 'react'
import StoreLayout from '@/app/(store)/layout'
import HomePage from '@/app/(store)/page'

export default function RootHomePage() {
  return (
    <StoreLayout>
      <HomePage />
    </StoreLayout>
  )
}
