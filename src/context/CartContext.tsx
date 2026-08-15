'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { usePathname } from 'next/navigation'
import { CartDisplayItem, LocalCartItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  addToCartAction,
  updateCartQuantityAction,
  removeCartItemAction,
  clearCartAction,
  mergeGuestCartAction,
  getCartAction,
} from '@/actions/cart/actions'

const LOCAL_CART_KEY = 'shreengar_cart'

// ─── Pricing Engine ─────────────────────────────────────────
export interface CartTotals {
  subtotal: number
  discount: number
  couponDiscount: number
  shipping: number
  tax: number
  grandTotal: number
}

function computeTotals(items: CartDisplayItem[], couponDiscount = 0): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = 0
  const shipping = subtotal > 999 ? 0 : 100
  const tax = 0
  const grandTotal = subtotal - discount - couponDiscount + shipping + tax
  return { subtotal, discount, couponDiscount, shipping, tax, grandTotal }
}

// ─── LocalStorage Helpers ────────────────────────────────────
function readLocalCart(): LocalCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    return raw ? (JSON.parse(raw) as LocalCartItem[]) : []
  } catch {
    return []
  }
}

function writeLocalCart(items: LocalCartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items))
}

function clearLocalCart() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LOCAL_CART_KEY)
}

function localToDisplay(items: LocalCartItem[]): CartDisplayItem[] {
  return items.map(i => ({
    id: i.id,
    variantId: i.variantId,
    productId: i.productId,
    title: i.title,
    sku: i.sku,
    size: i.size,
    colorName: i.colorName,
    colorCode: i.colorCode,
    price: i.price,
    quantity: i.quantity,
    stockQuantity: 999, // guests don't have live stock — validated server-side on merge
    image: i.image,
    showColorOption: i.showColorOption !== undefined ? i.showColorOption : false,
  }))
}

// ─── Context Shape ───────────────────────────────────────────
interface CartContextType {
  items: CartDisplayItem[]
  totals: CartTotals
  totalCount: number
  isLoading: boolean
  isMiniCartOpen: boolean
  openMiniCart: () => void
  closeMiniCart: () => void
  addItem: (productId: string, variantId: string, quantity: number, snapshot?: Omit<LocalCartItem, 'id' | 'variantId' | 'quantity'>) => Promise<{ success: boolean; error?: string }>
  updateQuantity: (cartItemId: string, quantity: number) => Promise<{ success: boolean; error?: string }>
  removeItem: (cartItemId: string) => Promise<{ success: boolean; error?: string }>
  clearCart: () => Promise<void>
  setCouponDiscount: (amount: number) => void
  refreshCart: () => Promise<void>
  shippingPincode: string | null
  shippingQuoteId: string | null
  shippingQuoteError: string | null
  deliveryMinDays: number
  deliveryMaxDays: number
  setShippingPincode: (pincode: string | null) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// ─── DB Row → CartDisplayItem ────────────────────────────────
function mapDbRowToDisplay(row: any): CartDisplayItem | null {
  const v = row.variant
  if (!v) return null
  const product = v.product
  const stockQty: number = v.inventory
    ? (v.inventory.available_quantity ?? Math.max(0, (v.inventory.quantity ?? 0) - (v.inventory.reserved_quantity ?? 0)))
    : 0
  const price: number = row.unit_price ?? v.price_override ?? product?.price ?? 0
  return {
    id: row.id,
    variantId: v.id,
    productId: product?.id ?? '',
    title: product?.title ?? 'Unknown Product',
    sku: v.sku ?? '',
    size: v.size ?? '',
    colorName: v.color_name ?? '',
    colorCode: v.color_code ?? '',
    price,
    quantity: row.quantity,
    stockQuantity: stockQty,
    image: product?.images?.[0] ?? null,
    showColorOption: product?.show_color_option !== undefined ? !!product.show_color_option : false,
  }
}

// ─── Provider ────────────────────────────────────────────────
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartDisplayItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const { isAuthenticated: isCustomerAuth } = useAuth()
  const [isAdminAuth, setIsAdminAuth] = useState(false)
  const isAuthenticated = isCustomerAuth || isAdminAuth
  const mergeAttempted = useRef(false)

  const [shippingPincode, setShippingPincodeState] = useState<string | null>(null)
  const [shippingQuoteId, setShippingQuoteId] = useState<string | null>(null)
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [shippingTax, setShippingTax] = useState<number>(0)
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null)
  const [deliveryMinDays, setDeliveryMinDays] = useState<number>(3)
  const [deliveryMaxDays, setDeliveryMaxDays] = useState<number>(7)
  const [isShippingLoading, setIsShippingLoading] = useState(false)

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const discount = 0

  const shipping = 0
  const tax = 0
  const grandTotal = subtotal - discount - couponDiscount + shipping + tax

  const totals: CartTotals = {
    subtotal,
    discount,
    couponDiscount,
    shipping,
    tax,
    grandTotal
  }

  const triggerShippingCalculation = useCallback(async (pincode: string | null) => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setShippingQuoteId(null)
      setShippingFee(0)
      setShippingTax(0)
      setShippingQuoteError(null)
      return
    }

    setShippingQuoteId('free-shipping')
    setShippingFee(0)
    setShippingTax(0)
    setShippingQuoteError(null)
  }, [])

  const setShippingPincode = useCallback((pincode: string | null) => {
    setShippingPincodeState(pincode)
    triggerShippingCalculation(pincode)
  }, [triggerShippingCalculation])

  // Recalculate shipping quote whenever items, quantities, or settings change
  useEffect(() => {
    if (shippingPincode && items.length > 0) {
      triggerShippingCalculation(shippingPincode)
    } else {
      setShippingQuoteId(null)
      setShippingFee(0)
      setShippingTax(0)
      setShippingQuoteError(null)
    }
  }, [totalCount, shippingPincode, triggerShippingCalculation])

  // ─── Load cart (DB for auth users, empty for guests) ─────────
  const refreshCart = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const res = await getCartAction()
        if ('items' in res && res.items) {
          const mapped = res.items
            .map(mapDbRowToDisplay)
            .filter((i): i is CartDisplayItem => i !== null)
          setItems(mapped)
        }
      } else {
        setItems([])
        clearLocalCart()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart')
          localStorage.removeItem('shreengar-cart')
          localStorage.removeItem('guest-cart')
          localStorage.removeItem('cart-storage')
        }
      }
    } catch { }
    setIsLoading(false)
  }, [isAuthenticated])

  const pathname = usePathname()

  // ─── Admin session check on route transition ─────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdminAuth(!!user)
    }).catch(() => {
      setIsAdminAuth(false)
    })
  }, [pathname])

  // ─── Real-time Admin Auth listener ───────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminAuth(!!session?.user)
      if (!session?.user && !isCustomerAuth) {
        // Immediate clear on logout
        setItems([])
        clearLocalCart()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart')
          localStorage.removeItem('shreengar-cart')
          localStorage.removeItem('guest-cart')
          localStorage.removeItem('cart-storage')
        }
        setIsMiniCartOpen(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [isCustomerAuth])

  // ─── Cart Loading Sync ─────────────────────────────────────────
  useEffect(() => {
    refreshCart()
  }, [isAuthenticated, refreshCart])

  // ─── Add item ────────────────────────────────────────────────
  const addItem = useCallback(async (
    productId: string,
    variantId: string,
    quantity: number,
    snapshot?: Omit<LocalCartItem, 'id' | 'variantId' | 'quantity'>
  ) => {
    if (isAuthenticated) {
      const res = await addToCartAction(productId, variantId, quantity)
      if (res.success) {
        await refreshCart()
        return { success: true }
      }
      return { success: false, error: 'error' in res ? res.error : 'Failed.' }
    } else {
      return { success: false, error: 'Please sign in to add items to your bag.' }
    }
  }, [isAuthenticated, refreshCart])

  // ─── Update quantity ─────────────────────────────────────────
  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (isAuthenticated) {
      const prev = items
      setItems(cur => cur.map(i => i.id === cartItemId ? { ...i, quantity } : i))
      const res = await updateCartQuantityAction(cartItemId, quantity)
      if (!res.success) {
        setItems(prev) // rollback
        return { success: false, error: 'error' in res ? res.error : 'Failed.' }
      }
      return { success: true }
    } else {
      return { success: false, error: 'Authentication required.' }
    }
  }, [isAuthenticated, items])

  // ─── Remove item ─────────────────────────────────────────────
  const removeItem = useCallback(async (cartItemId: string) => {
    if (isAuthenticated) {
      const prev = items
      setItems(cur => cur.filter(i => i.id !== cartItemId))
      const res = await removeCartItemAction(cartItemId)
      if (!res.success) {
        setItems(prev)
        return { success: false, error: 'error' in res ? res.error : 'Failed.' }
      }
      return { success: true }
    } else {
      return { success: false, error: 'Authentication required.' }
    }
  }, [isAuthenticated, items])

  // ─── Clear cart ──────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      await clearCartAction()
    }
    setItems([])
  }, [isAuthenticated])

  return (
    <CartContext.Provider value={{
      items,
      totals,
      totalCount,
      isLoading: isLoading || isShippingLoading,
      isMiniCartOpen,
      openMiniCart: () => setIsMiniCartOpen(true),
      closeMiniCart: () => setIsMiniCartOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setCouponDiscount,
      refreshCart,
      shippingPincode,
      shippingQuoteId,
      shippingQuoteError,
      deliveryMinDays,
      deliveryMaxDays,
      setShippingPincode
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
