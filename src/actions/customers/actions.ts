'use server'

import { createAdminClient } from '../../lib/supabase/server.ts'
import { checkAdminAuth } from '../catalog/actions.ts'
import type { UserProfile, ShippingAddress, Order } from '../../types/database.ts'

export interface AdminCustomerListItem {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
  total_orders: number
  total_spent: number
  latest_order_at: string | null
  pending_orders: number
  completed_orders: number
}

export interface CustomerAddress extends ShippingAddress {
  landmark?: string | null
}

export interface AdminCustomerDetails {
  profile: UserProfile
  addresses: CustomerAddress[]
  orderSummary: {
    total_orders: number
    total_spent: number
    pending_orders: number
    delivered_orders: number
    cancelled_orders: number
    latest_order_at: string | null
  }
  orderHistory: Order[]
}

export async function getAllCustomersAction(): Promise<{ success: boolean; data?: AdminCustomerListItem[]; error?: string }> {
  try {
    // 1. Validate admin session and permission before instantiating admin client
    await checkAdminAuth('view_customers')

    const supabase = createAdminClient()

    // 2. Fetch profiles
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (profErr) {
      console.error('[GET-ALL-CUSTOMERS-PROFILES-ERROR]', profErr)
      return { success: false, data: [], error: 'Unable to load customers. Please try again.' }
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, data: [] }
    }

    // 3. Batch fetch orders to avoid N+1 queries
    const profileIds = profiles.map(p => p.id)
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, status, created_at')
      .in('user_id', profileIds)

    if (ordersErr) {
      console.error('[GET-ALL-CUSTOMERS-ORDERS-ERROR]', ordersErr)
      return { success: false, data: [], error: 'Unable to load customers. Please try again.' }
    }

    // 4. Map aggregates
    const statsMap = new Map<string, {
      total_orders: number
      total_spent: number
      latest_order_at: string | null
      pending_orders: number
      completed_orders: number
    }>()

    for (const order of orders || []) {
      const uId = order.user_id
      if (!statsMap.has(uId)) {
        statsMap.set(uId, {
          total_orders: 0,
          total_spent: 0,
          latest_order_at: null,
          pending_orders: 0,
          completed_orders: 0
        })
      }
      const stat = statsMap.get(uId)!
      stat.total_orders += 1
      stat.total_spent += Number(order.total_amount || 0)
      if (!stat.latest_order_at || new Date(order.created_at) > new Date(stat.latest_order_at)) {
        stat.latest_order_at = order.created_at
      }
      if (order.status === 'pending') {
        stat.pending_orders += 1
      } else if (order.status === 'delivered') {
        stat.completed_orders += 1
      }
    }

    const data = profiles.map(p => {
      const stats = statsMap.get(p.id) || {
        total_orders: 0,
        total_spent: 0,
        latest_order_at: null,
        pending_orders: 0,
        completed_orders: 0
      }
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        updated_at: p.updated_at,
        ...stats
      }
    })

    return { success: true, data }
  } catch (error) {
    console.warn('[CUSTOMERS] Customer directory could not be loaded.')
    return {
      success: false,
      data: [],
      error: 'Unable to load customers. Please try again.'
    }
  }
}

export async function getCustomerDetailsAction(customerId: string): Promise<{ success: boolean; data?: AdminCustomerDetails; error?: string }> {
  try {
    // 1. Validate admin session and permission
    await checkAdminAuth('view_customers')

    const supabase = createAdminClient()

    // 2. Fetch profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, created_at, updated_at')
      .eq('id', customerId)
      .single()

    if (profErr || !profile) {
      console.error('[GET-CUSTOMER-PROFILE-ERROR]', profErr)
      return { success: false, error: 'Customer not found.' }
    }

    // 3. Fetch addresses (handling error locally to keep details page functional)
    let addresses: CustomerAddress[] = []
    try {
      const { data: addrData, error: addrErr } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', customerId)
      if (addrErr) {
        console.error('[GET-CUSTOMER-ADDRESSES-ERROR]', addrErr)
      } else {
        addresses = (addrData || []) as CustomerAddress[]
      }
    } catch (e) {
      console.error('[GET-CUSTOMER-ADDRESSES-EXCEPTION]', e)
    }

    // 4. Fetch orders (handling error locally to keep details page functional)
    let orderHistory: Order[] = []
    const orderSummary = {
      total_orders: 0,
      total_spent: 0,
      pending_orders: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
      latest_order_at: null as string | null
    }

    try {
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        console.error('[GET-CUSTOMER-ORDERS-ERROR]', ordersErr)
      } else if (ordersData) {
        orderHistory = ordersData as Order[]
        for (const order of orderHistory) {
          orderSummary.total_orders += 1
          orderSummary.total_spent += Number(order.total_amount || 0)
          if (!orderSummary.latest_order_at || new Date(order.created_at) > new Date(orderSummary.latest_order_at)) {
            orderSummary.latest_order_at = order.created_at
          }
          if (order.status === 'pending') {
            orderSummary.pending_orders += 1
          } else if (order.status === 'delivered') {
            orderSummary.delivered_orders += 1
          } else if (order.status === 'cancelled') {
            orderSummary.cancelled_orders += 1
          }
        }
      }
    } catch (e) {
      console.error('[GET-CUSTOMER-ORDERS-EXCEPTION]', e)
    }

    return {
      success: true,
      data: {
        profile,
        addresses,
        orderSummary,
        orderHistory
      }
    }
  } catch (error) {
    console.warn('[CUSTOMERS] Customer details could not be loaded.')
    return {
      success: false,
      error: 'Unable to load customer details. Please try again.'
    }
  }
}
