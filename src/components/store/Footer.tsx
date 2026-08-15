'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle2, ShieldCheck, Heart } from 'lucide-react'
import { FooterConfig } from '@/types/database'
import { DEFAULT_FOOTER_CONFIG } from '@/constants/footer'

interface FooterProps {
  config?: FooterConfig
}

export const Footer: React.FC<FooterProps> = ({ config: propConfig }) => {
  const config = propConfig || DEFAULT_FOOTER_CONFIG
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setTimeout(() => {
      setEmail('')
      setSubscribed(false)
    }, 4000)
  }

  const currentYear = new Date().getFullYear()
  const displayYear = config.bottomBar.automaticYear
    ? currentYear
    : config.bottomBar.manualYear || currentYear

  const quickLinksList = (config.quickLinks?.items || [])
    .filter(item => item.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

  const policiesList = (config.policies?.items || [])
    .filter(item => item.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

  return (
    <footer className="bg-surface-warm text-foreground pt-16 pb-8 border-t border-border-warm transition-colors font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-border-warm">
          {/* Brand & Store Overview (2 cols) */}
          {config.brand.enabled !== false && (
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary text-gold border border-gold/30 font-serif font-bold flex items-center justify-center text-lg shadow-md">
                  {config.brand.name ? config.brand.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="font-serif text-xl font-bold tracking-wider text-foreground uppercase">
                  {config.brand.name || 'SHREENGAR'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-serif max-w-sm">
                {config.brand.description}
              </p>
              <div className="text-xs text-muted-foreground space-y-1.5 font-mono pt-1">
                {config.brand.supportEmail && (
                  <p className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                    <span>
                      {config.brand.supportEmailLabel || 'Support Email'}:{' '}
                      <a href={`mailto:${config.brand.supportEmail}`} className="text-gold font-semibold hover:underline">
                        {config.brand.supportEmail}
                      </a>
                    </span>
                  </p>
                )}
                {config.brand.businessAddress && (
                  <p className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                    <span>
                      {config.brand.businessAddressLabel || 'Business Address'}:{' '}
                      <span className="text-gold font-semibold">{config.brand.businessAddress}</span>
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Navigation Links */}
          {config.quickLinks.enabled !== false && (
            <div className="space-y-3">
              <h4 className="font-serif text-xs font-bold tracking-widest uppercase text-gold">
                {config.quickLinks.heading || 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                {quickLinksList.map(item => {
                  const isExternal = item.href.startsWith('https://')
                  return (
                    <li key={item.id}>
                      {isExternal ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-gold transition-colors"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className="hover:text-gold transition-colors">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Policies & Compliance */}
          {config.policies.enabled !== false && (
            <div className="space-y-3">
              <h4 className="font-serif text-xs font-bold tracking-widest uppercase text-gold">
                {config.policies.heading || 'Policies & Compliance'}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                {policiesList.map(item => {
                  const isExternal = item.href.startsWith('https://')
                  return (
                    <li key={item.id}>
                      {isExternal ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-gold transition-colors"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className="hover:text-gold transition-colors">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Newsletter Subscription */}
          {config.newsletter.enabled !== false && (
            <div className="space-y-3">
              <h4 className="font-serif text-xs font-bold tracking-widest uppercase text-gold">
                {config.newsletter.heading || 'Festive Circle'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.newsletter.description}
              </p>

              {subscribed ? (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Thank you for subscribing!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex items-center space-x-1.5">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={config.newsletter.placeholder || 'Enter email...'}
                    required
                    className="w-full px-3 py-2 text-xs bg-surface border border-border-warm rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <button
                    type="submit"
                    aria-label={config.newsletter.buttonLabel || 'Subscribe'}
                    className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground font-serif font-bold text-xs rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-gold" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Bottom Copyright & Guarantee */}
        {config.bottomBar.enabled !== false && (
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground font-serif">
            <p>© {displayYear} {config.bottomBar.copyrightText}</p>
            <div className="mt-3 sm:mt-0 flex items-center space-x-4 text-[11px] text-muted-foreground">
              {config.bottomBar.authenticityText && (
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                  <span>{config.bottomBar.authenticityText}</span>
                </span>
              )}
              {config.bottomBar.authenticityText && config.bottomBar.craftedWithText && <span>|</span>}
              {config.bottomBar.craftedWithText && (
                <span className="flex items-center space-x-1">
                  <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                  <span>{config.bottomBar.craftedWithText}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
