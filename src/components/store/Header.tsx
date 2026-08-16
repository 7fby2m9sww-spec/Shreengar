'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ShoppingBag, Heart, User, Menu, X, Sparkles, LogOut, ChevronDown, UserCheck, LayoutDashboard, Settings, MapPin, Sun, Moon, CircleUserRound, Package } from 'lucide-react'
import { getCategories } from '@/services/products'
import { Category } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
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
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)

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
  const { session, logout } = useAuth()
  const [dynamicWishlistCount, setDynamicWishlistCount] = useState<number>(0)
  const { totalCount: cartTotalCount, openMiniCart } = useCart()

  useEffect(() => {
    async function loadCategories() {
      const catData = await getCategories()
      setCategories(catData)
    }
    loadCategories()
  }, [])

  // Sync wishlist count whenever the session changes
  useEffect(() => {
    if (session.type === 'customer') {
      const supabase = createClient()
      supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.customerId)
        .then(
          ({ count }) => {
            setDynamicWishlistCount(count || 0)
          },
          () => {
            setDynamicWishlistCount(0)
          }
        )
    } else {
      try {
        const localWish = JSON.parse(localStorage.getItem('shreengar_wishlist') || '[]')
        setDynamicWishlistCount(Array.isArray(localWish) ? localWish.length : 0)
      } catch {
        setDynamicWishlistCount(0)
      }
    }
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
      }
    }

    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAccountDropdownOpen])

  const handleLogout = async () => {
    setIsAccountDropdownOpen(false)
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
          <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:bg-surface-muted rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Unified Gold Brand Logo */}
          <ShreengarLogo />


          {/* Desktop Category Navigation */}
          {navCategories.length > 0 && (
            <nav className="hidden lg:flex items-center space-x-6 font-serif text-sm font-bold text-foreground">
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
          )}

          {/* Action Tools: Search, Wishlist, Cart, Profile */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Search Input Bar */}
            <form action="/shop" method="GET" className="hidden sm:flex items-center relative">
              <input
                type="text"
                name="search"
                placeholder="Search Anarkalis..."
                className="w-44 lg:w-56 pl-9 pr-4 py-1.5 text-xs bg-surface-warm border border-border-warm rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-64 focus:ring-1 focus:ring-gold transition-all"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </form>

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              className="relative p-2 text-foreground hover:text-gold transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {finalWishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-brand-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                  {finalWishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon — opens MiniCart drawer */}
            <button
              onClick={openMiniCart}
              className="relative p-2 text-foreground hover:text-gold transition-colors cursor-pointer"
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

            {/* Dynamic Account Dropdown */}
            {hasSession ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={isAccountDropdownOpen}
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all border border-border/40"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-950 text-amber-300 font-bold text-xs flex items-center justify-center">
                    {session.type === 'customer'
                      ? session.email[0].toUpperCase()
                      : session.type === 'admin'
                      ? session.email[0].toUpperCase()
                      : 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground pr-1" />
                </button>

                {/* Dropdown Menu */}
                {isAccountDropdownOpen && (
                  <div className="absolute top-full right-0 mt-3 w-72 bg-surface-elevated rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border/40 p-2 text-sm z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 pt-3 pb-4 mb-2 border-b border-border/30 text-foreground">
                      <p className="font-serif font-medium text-base line-clamp-1">
                        {session.type === 'customer' || session.type === 'admin'
                          ? session.fullName
                          : 'Guest'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {session.type === 'customer' || session.type === 'admin'
                          ? session.email
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1">
                      {session.type === 'admin' && (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center space-x-3 px-3 h-11 rounded-lg text-brand-primary bg-amber-100/50 hover:bg-amber-100/80 font-semibold transition-colors"
                          >
                            <LayoutDashboard className="w-4.5 h-4.5 text-brand-primary" />
                            <span>Admin Dashboard</span>
                          </Link>

                          <Link
                            href="/auth/login"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center space-x-3 px-3 h-11 rounded-lg text-foreground hover:bg-primary/5 hover:text-accent font-medium transition-colors"
                          >
                            <CircleUserRound className="w-4.5 h-4.5 text-muted-foreground" />
                            <span>Switch to Customer</span>
                          </Link>
                        </>
                      )}

                      {session.type === 'customer' && (
                        <>
                          <Link
                            href="/account"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center space-x-3 px-3 h-11 rounded-lg text-foreground hover:bg-primary/5 hover:text-accent font-medium transition-colors"
                          >
                            <CircleUserRound className="w-4.5 h-4.5 text-muted-foreground" />
                            <span>My Account</span>
                          </Link>

                          <Link
                            href="/orders"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center space-x-3 px-3 h-11 rounded-lg text-foreground hover:bg-primary/5 hover:text-accent font-medium transition-colors"
                          >
                            <Package className="w-4.5 h-4.5 text-muted-foreground" />
                            <span>My Orders</span>
                          </Link>

                          <Link
                            href="/wishlist"
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center space-x-3 px-3 h-11 rounded-lg text-foreground hover:bg-primary/5 hover:text-accent font-medium transition-colors"
                          >
                            <Heart className="w-4.5 h-4.5 text-muted-foreground" />
                            <span>Wishlist</span>
                          </Link>
                        </>
                      )}

                      {mounted && (
                        <div className="flex items-center justify-between px-3 h-11">
                          <span className="text-sm font-medium text-foreground">Theme</span>
                          <div className="flex items-center space-x-1 bg-surface-muted rounded-full p-0.5 border border-border/40">
                            <button
                              onClick={() => setTheme('light')}
                              className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              <Sun className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTheme('dark')}
                              className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-surface text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              <Moon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-3 h-11 rounded-lg text-red-600/90 hover:bg-red-500/10 hover:text-red-600 font-medium transition-colors"
                      >
                        <LogOut className="w-4.5 h-4.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
                <>
                  <div className="hidden sm:flex items-center space-x-2 text-xs font-serif font-bold">
                    <Link href="/auth/login" className="px-3.5 py-2 text-foreground hover:text-gold transition-colors">
                      Sign In
                    </Link>
                    <Link href="/auth/signup" className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl shadow-md transition-colors">
                      Join Us
                    </Link>
                  </div>
                  <ThemeToggle />
                </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface-muted px-4 pt-4 pb-6 space-y-4 shadow-xl">
          <form action="/shop" method="GET" className="relative">
            <input
              type="text"
              name="search"
              placeholder="Search Anarkalis..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-lg text-foreground"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          {navCategories.length > 0 && (
            <nav className="flex flex-col space-y-3 font-serif text-sm font-semibold text-foreground">
              {navCategories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="hover:text-gold"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex flex-col space-y-3 font-serif text-sm font-semibold text-foreground">
            {hasSession ? (
              <>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span>Account</span>
                  <ThemeToggle />
                </div>
                <Link href="/account" onClick={() => setIsMobileMenuOpen(false)}>My Account</Link>
                <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)}>My Orders</Link>
                <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>Wishlist</Link>
                <button onClick={handleLogout} className="text-left text-red-600">Log Out</button>
              </>
            ) : (
              <div className="pt-2 flex items-center space-x-3 text-xs">
                <Link
                  href="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg font-bold"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-2 bg-brand-primary text-brand-primary-foreground rounded-lg font-bold"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
    <MiniCart />
    </>
  )
}
