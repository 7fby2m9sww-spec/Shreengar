'use client'

import React, { useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Save, Check, Settings, Truck } from 'lucide-react'

export default function AdminSettingsPage() {
  const [storeName, setStoreName] = useState('Shreengar Royal Ethnic Couture')
  const [email, setEmail] = useState('care@shreengar.com')
  const [phone, setPhone] = useState('+91 1800-419-8920')
  const [taxRate, setTaxRate] = useState('5')
  const [freeShippingMin, setFreeShippingMin] = useState('2999')

  // Status states
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setIsSaved(false)

    // Simulate saving general settings locally
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaved(true)
    setIsLoading(false)
    setTimeout(() => setIsSaved(false), 4000)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Store Configurations"
        description="Configure store branding, support channels, and GST tax rates."
        badgeText="System Setup"
      />

      <form onSubmit={handleSave} className="bg-white dark:bg-[#211318] p-6 sm:p-8 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-8">
        {/* Section 1: Store Identity */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#5C0B26]/10">
            <Settings className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-serif text-lg font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">General Store Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Store Name"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
            />
            <Input
              label="Customer Support Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Helpline Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <Input
              label="Default Base Currency"
              defaultValue="INR (₹)"
              disabled
              className="bg-[#FAF8F5]/60 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 2: Tax & Shipping */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#5C0B26]/10">
            <Truck className="w-4 h-4 text-[#8C3A57]" />
            <h3 className="font-serif text-lg font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">Tax & Shipping Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GST / Apparel Tax Rate (%)"
              value={taxRate}
              onChange={e => setTaxRate(e.target.value)}
              required
            />
            <Input
              label="Free Shipping Order Threshold (INR)"
              value={freeShippingMin}
              onChange={e => setFreeShippingMin(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-4 border-t border-[#5C0B26]/10 flex items-center justify-between">
          <div>
            {isSaved && (
              <span className="text-xs text-emerald-800 font-semibold flex items-center bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300">
                <Check className="w-4 h-4 mr-1 text-emerald-600" /> Configurations saved successfully!
              </span>
            )}
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            disabled={isLoading}
            className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border dark:border-[#D0A45C]/25"
          >
            {isLoading ? 'Saving...' : 'Save Configurations'}
          </Button>
        </div>
      </form>
    </div>
  )
}
