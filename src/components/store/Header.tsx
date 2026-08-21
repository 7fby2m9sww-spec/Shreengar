'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ShoppingBag, Heart, User, Menu, X, Sparkles, LogOut, ChevronDown, UserCheck, LayoutDashboard, Settings, MapPin, Sun, Moon, CircleUserRound, Package } from 'lucide-react'
import { getCategories } from '@/services/products'
import { Category } from '@/types/database'
import { getWishlistCountAction } from '@/actions/wishlist/actions'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Profile } from '@/lib/auth/getSession'
// Minimal admin payload returned by /api/admin/status
type HeaderAdmin = {
  id: string
  email: string
  fullName?: string | null
}
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@teispace/next-themes'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MiniCart } from '@/components/store/MiniCart'
import { CouponAnnouncementBar } from '@/components/store/CouponAnnouncementBar'
import { ShreengarLogo } from '@/components/store/ShreengarLogo'
import { getAccountNavigation } from '@/lib/auth/accountNavigation'

interface HeaderProps {
  cartCount?: number
  wishlistCount?: number
}

export const Header: React.FC<HeaderProps> = ({
  cartCount: propCartCount,
  wishlistCount: propWishlistCount,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [categories, setCategories] = useState<Category[]>([])
  
  const navCategories = categories.filter(
    cat => {
      const name = (cat.name || '').trim().toLowerCase()
      const slug = (cat.slug || '').trim().toLowerCase()
      return !name.includes('kurti') && !slug.includes('kurti') && !name.includes('all collection') && !slug.includes('all-collection')
    }
  )
  
  // Consume customer/admin session from shared AuthContext
  const { session, logout, isLoading } = useAuth()
  const [dynamicWishlistCount, setDynamicWishlistCount] = useState<number>(0)
  const { totalCount: cartTotalCount, openMiniCart } = useCart()

  useEffect(() => {
    async function loadCategories() {
      const catData = await getCategories()
      setCategories(catData)
    }
    loadCategories()
  }, [])

  // Dispatch custom events for scroll lock states so components like SupportPortal can adapt
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mobile-menu-toggle', { detail: { open: isMobileMenuOpen } }))
  }, [isMobileMenuOpen])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('account-drawer-toggle', { detail: { open: isAccountDrawerOpen } }))
  }, [isAccountDrawerOpen])

  // Close account drawer on Escape key press
  useEffect(() => {
    if (!isAccountDrawerOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAccountDrawerOpen])

  // Sync wishlist count whenever the session changes or wishlist is updated
  useEffect(() => {
    const handleWishlistUpdate = async () => {
      if (session.type === 'customer') {
        try {
          const count = await getWishlistCountAction()
          setDynamicWishlistCount(count)
        } catch {
          setDynamicWishlistCount(0)
        }
      } else {
        try {
          const localWish = JSON.parse(localStorage.getItem('shreengar_wishlist') || '[]')
          setDynamicWishlistCount(Array.isArray(localWish) ? localWish.length : 0)
        } catch {
          setDynamicWishlistCount(0)
        }
      }
    }
    
    handleWishlistUpdate()
    window.addEventListener('wishlist-updated', handleWishlistUpdate)
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate)
  }, [session])

  // Handle outside clicks and keyboard accessibility for dropdown
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAccountDropdownOpen(false)
        setIsAccountDrawerOpen(false)
        setIsMobileMenuOpen(false)
      }
    }

    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAccountDropdownOpen])

  // Listen for custom trigger event to open account drawer (from mobile sidebar bar)
  useEffect(() => {
    const handleOpenDrawer = () => {
      setIsAccountDrawerOpen(true)
      setIsMobileMenuOpen(false)
      setIsAccountDropdownOpen(false)
    }
    window.addEventListener('open-account-drawer', handleOpenDrawer)
    return () => {
      window.removeEventListener('open-account-drawer', handleOpenDrawer)
    }
  }, [])

  // Prevent body scroll when either mobile menu or account drawer is open
  useEffect(() => {
    if (isMobileMenuOpen || isAccountDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen, isAccountDrawerOpen])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => {
      const next = !prev
      if (next) {
        setIsAccountDrawerOpen(false)
        setIsAccountDropdownOpen(false)
      }
      return next
    })
  }

  const toggleAccountDrawer = () => {
    setIsAccountDrawerOpen(prev => {
      const next = !prev
      if (next) {
        setIsMobileMenuOpen(false)
        setIsAccountDropdownOpen(false)
      }
      return next
    })
  }

  const toggleAccountDropdown = () => {
    setIsAccountDropdownOpen(prev => {
      const next = !prev
      if (next) {
        setIsMobileMenuOpen(false)
        setIsAccountDrawerOpen(false)
      }
      return next
    })
  }

  const handleLogout = async () => {
    setIsAccountDropdownOpen(false)
    setIsAccountDrawerOpen(false)
    setDynamicWishlistCount(0)
    await logout()
  }

  const finalCartCount = propCartCount !== undefined ? propCartCount : cartTotalCount
  const finalWishlistCount = propWishlistCount !== undefined ? propWishlistCount : dynamicWishlistCount
  const hasSession = session.type !== 'anonymous'

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface-warm/95 backdrop-blur-md border-b border-border-warm transition-all font-sans">
        {/* Top Announcement Bar — Dynamic Realtime Coupon Ticker */}
        <CouponAnnouncementBar />

        {/* Main Navigation Bar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Mobile Header (Visible only on mobile/tablet < md) */}
          <div className="flex md:hidden items-center justify-between w-full h-[70px] relative">
            {/* Left Actions: Hamburger Only (44px total width) */}
            <div className="absolute left-2 min-[360px]:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center">
              <button
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                className="p-2 text-foreground hover:bg-surface-muted rounded-xl transition-transform active:scale-90 duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Center: Brand Logo (absolute viewport centered) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
              <ShreengarLogo className="w-[125px] min-[360px]:w-[140px] xs:w-[150px] max-w-[155px] shrink-0 object-contain transition-transform active:scale-98 duration-150" />
            </div>

            {/* Right Actions: Cart & Account (88px total width) */}
            <div className="absolute right-2 min-[360px]:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center space-x-0.5">
              {/* Cart Icon */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsAccountDrawerOpen(false)
                  setIsAccountDropdownOpen(false)
                  openMiniCart()
                }}
                className="relative p-2 text-foreground hover:text-gold transition-transform active:scale-90 duration-150 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Shopping Bag"
                aria-label="Open shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {finalCartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-brand-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {finalCartCount}
                  </span>
                )}
              </button>

              {/* Account Trigger */}
              <button
                onClick={toggleAccountDrawer}
                aria-label="Open Account Directory"
                className="flex items-center justify-center p-2 rounded-full hover:bg-surface-muted focus:outline-none transition-all active:scale-90 duration-150 border border-border/40 min-w-[44px] min-h-[44px] cursor-pointer"
              >
                {hasSession ? (
                  <div className="w-8 h-8 rounded-full bg-rose-950 text-amber-300 font-bold text-xs flex items-center justify-center border border-gold/20">
                    {session.email[0].toUpperCase()}
                  </div>
                ) : (
                  <User className="w-5 h-5 text-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Desktop Header (Visible only on desktop >= md) */}
          <div className="hidden md:flex h-20 items-center justify-between w-full relative">
            {/* Left Brand Logo */}
            <div>
              <ShreengarLogo />
            </div>

            {/* Desktop Category Navigation */}
            <nav className="hidden lg:flex items-center space-x-6 font-serif text-sm font-bold text-foreground">
              <Link href="/shop" className="hover:text-gold transition-colors">
                All Collections
              </Link>
              {navCategories.slice(0, 5).map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="hover:text-gold transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Action Tools: Search, Wishlist, Cart, Profile */}
            <div className="flex items-center space-x-4 lg:space-x-5 z-10">
              {/* Desktop Search Input Bar */}
              <form action="/shop" method="GET" className="hidden sm:flex items-center relative min-w-0">
                <input
                  type="text"
                  name="search"
                  placeholder="Search Anarkalis..."
                  className="w-36 md:w-48 lg:w-56 pl-9 pr-4 py-1.5 text-xs bg-surface-warm border border-border-warm rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-44 md:focus:w-56 focus:ring-1 focus:ring-gold transition-all min-w-0"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              </form>

              {/* Wishlist Icon */}
              <Link
                href="/wishlist"
                className="relative p-2 text-foreground hover:text-gold transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {finalWishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-brand-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {finalWishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Icon */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsAccountDrawerOpen(false)
                  setIsAccountDropdownOpen(false)
                  openMiniCart()
                }}
                className="relative p-2 text-foreground hover:text-gold transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Shopping Bag"
                aria-label="Open shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {finalCartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-brand-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {finalCartCount}
                  </span>
                )}
              </button>

              {/* Account Profile Trigger */}
              <div className="relative" ref={dropdownRef}>
                {hasSession ? (
                  <>
                    <button
                      onClick={toggleAccountDropdown}
                      aria-haspopup="true"
                      aria-expanded={isAccountDropdownOpen}
                      className="flex items-center space-x-2 p-1 rounded-full hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all border border-border/40 min-w-[44px] min-h-[44px] justify-center cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-950 text-amber-300 font-bold text-xs flex items-center justify-center border border-gold/20">
                        {session.email[0].toUpperCase()}
                      </div>
                      <span className="hidden md:inline text-xs font-bold text-foreground">
                        {session.fullName || 'Account'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {isAccountDropdownOpen && (
                      <div className="absolute right-0 mt-2.5 w-60 bg-surface rounded-2xl shadow-xl border border-border py-2.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
                        <div className="px-4 py-2 border-b border-border mb-2">
                          <p className="text-xs text-muted-foreground">Signed in as</p>
                          <p className="text-xs font-bold text-foreground truncate mt-0.5">{session.email}</p>
                        </div>

                        {isLoading ? (
                          <div className="px-4 py-2 space-y-2.5 animate-pulse">
                            <div className="h-6 bg-surface-muted rounded-lg w-full animate-pulse" />
                            <div className="h-6 bg-surface-muted rounded-lg w-full animate-pulse" />
                          </div>
                        ) : (
                          <>
                            {getAccountNavigation(session.type === 'admin' ? 'admin' : (session as any).role).map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsAccountDropdownOpen(false)}
                                className="flex items-center space-x-3 px-4 py-2.5 text-xs text-foreground hover:bg-surface-muted hover:text-accent font-medium transition-colors"
                              >
                                <item.icon className="w-4 h-4 text-muted-foreground" />
                                <span>{item.label}</span>
                              </Link>
                            ))}
 
                            {mounted && (
                              <div className="flex items-center justify-between px-3.5 py-2 bg-surface-muted/50 rounded-xl border border-border-warm/50 mx-2.5 my-1.5 font-sans">
                                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider select-none">Appearance</span>
                                <div className="flex items-center space-x-0.5 bg-surface-muted rounded-full p-0.5 border border-border/40">
                                  <button
                                    onClick={() => setTheme('light')}
                                    className={`p-1.5 rounded-full transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'light' ? 'bg-surface text-accent shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                                    aria-label="Light mode"
                                  >
                                    <Sun className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-1.5 rounded-full transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'dark' ? 'bg-surface text-accent shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                                    aria-label="Dark mode"
                                  >
                                    <Moon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        <div className="border-t border-border mt-2 pt-2 px-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-3 h-11 rounded-lg text-red-600/90 hover:bg-red-500/10 hover:text-red-600 font-medium transition-colors cursor-pointer"
                          >
                            <LogOut className="w-4.5 h-4.5" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center space-x-2 text-xs font-serif font-bold">
                    <Link href="/auth/login" className="px-3.5 py-2 text-foreground hover:text-gold transition-colors">
                      Sign In
                    </Link>
                    <Link href="/auth/signup" className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl shadow-md transition-colors">
                      Join Us
                    </Link>
                    <ThemeToggle />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Storefront Hamburger Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface-muted px-4 pt-4 pb-6 space-y-4 shadow-xl animate-in fade-in duration-200">
            <form action="/shop" method="GET" className="relative w-full">
              <input
                type="text"
                name="search"
                placeholder="Search Anarkalis, Kurtis, Sarees..."
                className="w-full pl-10 pr-4 h-11 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-gold text-sm transition-all"
              />
              <Search className="w-4.5 h-4.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            <nav className="flex flex-col space-y-3 font-serif text-sm font-semibold text-foreground">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gold py-1">
                Home
              </Link>
              <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-gold py-1">
                All Collections
              </Link>
              {navCategories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-gold py-1"
                >
                  {cat.name}
                </Link>
              ))}

              {hasSession ? (
                <div className="pt-2 border-t border-border/30">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsAccountDrawerOpen(true)
                    }}
                    className="w-full text-left font-serif font-bold text-amber-800 dark:text-gold py-2 flex items-center justify-between min-h-[44px] cursor-pointer"
                  >
                    <span>Account Directory &rarr;</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-border/30 flex flex-col space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-surface border border-border text-foreground rounded-lg font-bold flex items-center justify-center min-h-[44px]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-brand-primary text-brand-primary-foreground rounded-lg font-bold flex items-center justify-center min-h-[44px]"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Unified Mobile Account Directory Drawer (Positioned outside of header to prevent z-index issues) */}
      {isAccountDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Account Directory">
          {/* Full viewport backdrop covering header and announcement bar */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
            onClick={() => setIsAccountDrawerOpen(false)}
          />

          {/* Drawer Content Sheet */}
          <div
            className="fixed right-0 top-0 w-[88vw] max-w-[380px] h-[100dvh] bg-surface-elevated shadow-2xl border-l border-border flex flex-col justify-between overflow-y-auto z-60 transition-transform duration-300 ease-in-out translate-x-0"
            style={{
              paddingTop: 'calc(1.25rem + env(safe-area-inset-top))',
              paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
              paddingLeft: '1.25rem',
              paddingRight: '1.25rem',
            }}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-warm pb-3">
                <span className="font-serif font-bold text-lg text-foreground">Account Directory</span>
                <button
                  onClick={() => setIsAccountDrawerOpen(false)}
                  className="p-2 rounded-lg text-foreground hover:bg-rose-900/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                  aria-label="Close directory"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card Mini */}
              <div className="flex items-center space-x-3.5 pb-4 border-b border-border-warm">
                {hasSession ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-rose-950 text-amber-300 font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-sm border border-gold/30">
                      {session.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif font-bold text-base text-foreground leading-snug line-clamp-1">
                        {session.fullName || (session.type === 'admin' || (session as any).role === 'admin' ? 'Admin' : 'Customer')}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono block truncate mt-0.5">
                        {session.email}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-surface-muted text-muted-foreground font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-sm border border-border">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif font-bold text-base text-foreground leading-snug">Guest User</h3>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        Please sign in to manage account
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Links */}
              <nav className="flex flex-col space-y-1">
                {isLoading ? (
                  <div className="space-y-2.5 py-4 animate-pulse">
                    <div className="h-10 bg-surface-muted rounded-xl w-full" />
                    <div className="h-10 bg-surface-muted rounded-xl w-full" />
                    <div className="h-10 bg-surface-muted rounded-xl w-full" />
                  </div>
                ) : hasSession ? (
                  <>
                    {getAccountNavigation(session.type === 'admin' ? 'admin' : (session as any).role).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsAccountDrawerOpen(false)}
                        className="flex items-center space-x-3 px-3 h-[50px] rounded-xl text-foreground hover:bg-surface-muted hover:text-accent font-medium transition-all active:scale-[0.98] duration-150"
                      >
                        <item.icon className="w-[20px] h-[20px] text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="pt-2 flex flex-col space-y-2.5">
                    <Link
                      href="/auth/login"
                      onClick={() => setIsAccountDrawerOpen(false)}
                      className="w-full h-11 flex items-center justify-center bg-brand-primary text-brand-primary-foreground font-serif font-bold text-sm rounded-xl shadow-md hover:bg-brand-primary-hover transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsAccountDrawerOpen(false)}
                      className="w-full h-11 flex items-center justify-center bg-surface border border-border text-foreground font-serif font-bold text-sm rounded-xl hover:bg-surface-muted transition-colors"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            {/* Footer Area: Theme Toggle & Logout */}
            <div className="space-y-4 pt-4 border-t border-border-warm">
              {mounted && (
                <div className="flex items-center justify-between px-3 py-2 bg-surface-muted/50 rounded-xl border border-border-warm/50">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Appearance</span>
                  <div className="flex items-center space-x-1 bg-surface-muted rounded-full p-0.5 border border-border/40">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'light' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      aria-label="Light mode"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${resolvedTheme === 'dark' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      aria-label="Dark mode"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {hasSession && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-3 h-[50px] rounded-xl text-red-600/90 hover:bg-red-500/10 hover:text-red-600 font-bold transition-all border border-transparent cursor-pointer"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                  <span>Log Out</span>
                </button>
              )}

              <div className="text-[10px] text-center text-muted-foreground font-serif tracking-widest uppercase">
                SHREENGAR ROYAL COUTURE © 2026
              </div>
            </div>
          </div>
        </div>
      )}
      <MiniCart />
    </>
  )
}
