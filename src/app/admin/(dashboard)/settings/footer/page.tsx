'use client'

import React, { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Footer } from '@/components/store/Footer'
import {
  Save,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layout,
  Link as LinkIcon,
  Shield,
  Mail,
  Eye,
  AlertCircle
} from 'lucide-react'
import { getFooterSettingsAction, updateFooterSettingsAction } from '@/actions/footer/actions'
import { DEFAULT_FOOTER_CONFIG } from '@/constants/footer'
import { FooterConfig, FooterLinkItem } from '@/types/database'

export default function AdminFooterManagerPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG)
  const [initialConfig, setInitialConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const res = await getFooterSettingsAction()
      if (res.success && res.data) {
        setConfig(res.data)
        setInitialConfig(res.data)
      }
      setIsLoading(false)
    }
    loadData()
  }, [])

  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(initialConfig)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const res = await updateFooterSettingsAction(config)
    setIsSaving(false)

    if (res.success) {
      setInitialConfig(config)
      setSuccessMessage('Footer settings saved and storefront updated successfully!')
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setErrorMessage(res.error || 'Failed to save footer settings.')
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to discard all unsaved footer changes?')) {
      setConfig(initialConfig)
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }

  // Helper functions for links
  const handleAddLink = (type: 'quickLinks' | 'policies') => {
    const items = [...(config[type]?.items || [])]
    const newItem: FooterLinkItem = {
      id: `${type === 'quickLinks' ? 'ql' : 'pol'}-${Date.now()}`,
      label: 'New Link',
      href: type === 'quickLinks' ? '/shop' : '/privacy-policy',
      enabled: true,
      sortOrder: items.length + 1
    }
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        items: [...items, newItem]
      }
    })
  }

  const handleRemoveLink = (type: 'quickLinks' | 'policies', id: string) => {
    const filtered = (config[type]?.items || []).filter(item => item.id !== id)
    const reindexed = filtered.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        items: reindexed
      }
    })
  }

  const handleMoveLink = (type: 'quickLinks' | 'policies', index: number, direction: 'up' | 'down') => {
    const items = [...(config[type]?.items || [])]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    const temp = items[index]
    items[index] = items[targetIndex]
    items[targetIndex] = temp

    const reindexed = items.map((item, idx) => ({ ...item, sortOrder: idx + 1 }))
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        items: reindexed
      }
    })
  }

  const handleUpdateLink = (type: 'quickLinks' | 'policies', id: string, field: keyof FooterLinkItem, value: any) => {
    const items = (config[type]?.items || []).map(item => {
      if (item.id === id) {
        return { ...item, [field]: value }
      }
      return item
    })
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        items
      }
    })
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 font-serif">
        Loading Footer Configurations...
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <AdminPageHeader
        title="Storefront Footer Manager"
        description="Edit every visible footer text, link, label, compliance route, newsletter message, and bottom bar setting."
        badgeText="Site Configuration"
      />

      {/* Action Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">You have unsaved footer changes.</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleReset} className="text-xs">
            Discard Changes
          </Button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Brand Information */}
        <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <Layout className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-serif text-base font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
                1. Brand Information & Contacts
              </h3>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.brand.enabled !== false}
                onChange={e => setConfig({ ...config, brand: { ...config.brand, enabled: e.target.checked } })}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Show Brand Section</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand Display Name"
              value={config.brand.name || ''}
              onChange={e => setConfig({ ...config, brand: { ...config.brand, name: e.target.value } })}
              required
            />
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Brand Description</label>
              <textarea
                value={config.brand.description || ''}
                onChange={e => setConfig({ ...config, brand: { ...config.brand, description: e.target.value } })}
                rows={2}
                className="w-full p-2 text-xs bg-surface border border-border-warm rounded-lg focus:ring-1 focus:ring-[#5C0B26]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Support Email Label"
              value={config.brand.supportEmailLabel || ''}
              onChange={e => setConfig({ ...config, brand: { ...config.brand, supportEmailLabel: e.target.value } })}
            />
            <Input
              label="Support Email Address"
              type="email"
              value={config.brand.supportEmail || ''}
              onChange={e => setConfig({ ...config, brand: { ...config.brand, supportEmail: e.target.value } })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business Address Label"
              value={config.brand.businessAddressLabel || ''}
              onChange={e => setConfig({ ...config, brand: { ...config.brand, businessAddressLabel: e.target.value } })}
            />
            <Input
              label="Business Address Value"
              value={config.brand.businessAddress || ''}
              onChange={e => setConfig({ ...config, brand: { ...config.brand, businessAddress: e.target.value } })}
            />
          </div>
        </div>

        {/* Section 2: Quick Links Manager */}
        <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-serif text-base font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
                2. Quick Links Section
              </h3>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.quickLinks.enabled !== false}
                onChange={e => setConfig({ ...config, quickLinks: { ...config.quickLinks, enabled: e.target.checked } })}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Show Quick Links Column</span>
            </label>
          </div>

          <Input
            label="Column Heading"
            value={config.quickLinks.heading || ''}
            onChange={e => setConfig({ ...config, quickLinks: { ...config.quickLinks, heading: e.target.value } })}
          />

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">Links ({config.quickLinks.items?.length || 0}/10 Max)</label>
              <button
                type="button"
                onClick={() => handleAddLink('quickLinks')}
                disabled={(config.quickLinks.items?.length || 0) >= 10}
                className="px-3 py-1.5 bg-[#5C0B26] text-white font-bold text-xs rounded-lg hover:bg-[#5C0B26]/90 disabled:opacity-40 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Quick Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {(config.quickLinks.items || []).map((item, idx) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-rose-950/20 border border-gray-200 dark:border-rose-900/40 rounded-xl gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => handleUpdateLink('quickLinks', item.id, 'label', e.target.value)}
                      placeholder="Link Label"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-rose-950 border border-gray-300 rounded focus:ring-1 focus:ring-[#5C0B26]"
                    />
                    <input
                      type="text"
                      value={item.href}
                      onChange={e => handleUpdateLink('quickLinks', item.id, 'href', e.target.value)}
                      placeholder="/route or https://..."
                      className="px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-rose-950 border border-gray-300 rounded focus:ring-1 focus:ring-[#5C0B26]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <label className="flex items-center space-x-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled !== false}
                        onChange={e => handleUpdateLink('quickLinks', item.id, 'enabled', e.target.checked)}
                        className="rounded text-[#5C0B26]"
                      />
                      <span>Active</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleMoveLink('quickLinks', idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLink('quickLinks', idx, 'down')}
                      disabled={idx === (config.quickLinks.items?.length || 0) - 1}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink('quickLinks', item.id)}
                      className="p-1 text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Policies & Compliance Manager */}
        <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-serif text-base font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
                3. Policies & Compliance Column
              </h3>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.policies.enabled !== false}
                onChange={e => setConfig({ ...config, policies: { ...config.policies, enabled: e.target.checked } })}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Show Policies Column</span>
            </label>
          </div>

          <Input
            label="Column Heading"
            value={config.policies.heading || ''}
            onChange={e => setConfig({ ...config, policies: { ...config.policies, heading: e.target.value } })}
          />

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">Policy Links ({config.policies.items?.length || 0}/10 Max)</label>
              <button
                type="button"
                onClick={() => handleAddLink('policies')}
                disabled={(config.policies.items?.length || 0) >= 10}
                className="px-3 py-1.5 bg-[#5C0B26] text-white font-bold text-xs rounded-lg hover:bg-[#5C0B26]/90 disabled:opacity-40 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Policy Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {(config.policies.items || []).map((item, idx) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-rose-950/20 border border-gray-200 dark:border-rose-900/40 rounded-xl gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => handleUpdateLink('policies', item.id, 'label', e.target.value)}
                      placeholder="Policy Label"
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-rose-950 border border-gray-300 rounded focus:ring-1 focus:ring-[#5C0B26]"
                    />
                    <input
                      type="text"
                      value={item.href}
                      onChange={e => handleUpdateLink('policies', item.id, 'href', e.target.value)}
                      placeholder="/route or https://..."
                      className="px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-rose-950 border border-gray-300 rounded focus:ring-1 focus:ring-[#5C0B26]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <label className="flex items-center space-x-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled !== false}
                        onChange={e => handleUpdateLink('policies', item.id, 'enabled', e.target.checked)}
                        className="rounded text-[#5C0B26]"
                      />
                      <span>Active</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleMoveLink('policies', idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLink('policies', idx, 'down')}
                      disabled={idx === (config.policies.items?.length || 0) - 1}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink('policies', item.id)}
                      className="p-1 text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Festive Circle / Newsletter Settings */}
        <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-serif text-base font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
                4. Festive Circle / Newsletter Section
              </h3>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.newsletter.enabled !== false}
                onChange={e => setConfig({ ...config, newsletter: { ...config.newsletter, enabled: e.target.checked } })}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Show Newsletter Column</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Newsletter Section Heading"
              value={config.newsletter.heading || ''}
              onChange={e => setConfig({ ...config, newsletter: { ...config.newsletter, heading: e.target.value } })}
            />
            <Input
              label="Email Input Placeholder"
              value={config.newsletter.placeholder || ''}
              onChange={e => setConfig({ ...config, newsletter: { ...config.newsletter, placeholder: e.target.value } })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Newsletter Description</label>
              <textarea
                value={config.newsletter.description || ''}
                onChange={e => setConfig({ ...config, newsletter: { ...config.newsletter, description: e.target.value } })}
                rows={2}
                className="w-full p-2 text-xs bg-surface border border-border-warm rounded-lg focus:ring-1 focus:ring-[#5C0B26]"
              />
            </div>
            <Input
              label="Submit Button Accessible Label"
              value={config.newsletter.buttonLabel || ''}
              onChange={e => setConfig({ ...config, newsletter: { ...config.newsletter, buttonLabel: e.target.value } })}
            />
          </div>
        </div>

        {/* Section 5: Bottom Bar Settings */}
        <div className="bg-white dark:bg-[#211318] p-6 rounded-2xl border border-[#5C0B26]/10 dark:border-[#70424E] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5C0B26]/10">
            <div className="flex items-center space-x-2">
              <Layout className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-serif text-base font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
                5. Bottom Bar & Copyright Settings
              </h3>
            </div>
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.bottomBar.enabled !== false}
                onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, enabled: e.target.checked } })}
                className="rounded text-[#5C0B26] focus:ring-[#5C0B26]"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">Show Bottom Bar</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Copyright Text (after Year)"
              value={config.bottomBar.copyrightText || ''}
              onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, copyrightText: e.target.value } })}
            />
            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bottomBar.automaticYear !== false}
                  onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, automaticYear: e.target.checked } })}
                  className="rounded text-[#5C0B26]"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300">Automatic Copyright Year (e.g. {new Date().getFullYear()})</span>
              </label>

              {!config.bottomBar.automaticYear && (
                <Input
                  label="Manual Copyright Year"
                  value={config.bottomBar.manualYear || ''}
                  onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, manualYear: e.target.value } })}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Authenticity Badge Text"
              value={config.bottomBar.authenticityText || ''}
              onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, authenticityText: e.target.value } })}
            />
            <Input
              label="Crafted-With Text"
              value={config.bottomBar.craftedWithText || ''}
              onChange={e => setConfig({ ...config, bottomBar: { ...config.bottomBar, craftedWithText: e.target.value } })}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-[#211318] rounded-2xl border border-[#5C0B26]/10 shadow-sm sticky bottom-4 z-10">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3.5 py-2 text-xs font-semibold border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 flex items-center space-x-2"
          >
            <Eye className="w-4 h-4 text-gray-600" />
            <span>{showPreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
          </button>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isSaving}
              className="text-xs flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !hasUnsavedChanges}
              className="bg-[#5C0B26] hover:bg-[#5C0B26]/90 text-white text-xs font-bold flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{isSaving ? 'Saving...' : 'Save Footer Settings'}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Live Storefront Footer Preview */}
      {showPreview && (
        <div className="space-y-3 pt-4 border-t border-amber-300/30">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-[#D4AF37]" />
            <h4 className="font-serif text-sm font-bold text-[#2B1A1F] dark:text-[#FFF4DC]">
              Live Storefront Footer Preview
            </h4>
          </div>
          <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-md">
            <Footer config={config} />
          </div>
        </div>
      )}
    </div>
  )
}
