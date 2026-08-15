'use server'

import {
  AdminUser,
  Role,
  Permission,
  ActivityLog,
  HomepageBanner,
  Blog,
  Order
} from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'

export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('admin_users').select('*, role:roles(*)')
    if (!error && data) return data as AdminUser[]
  } catch {}

  return []
}

export async function getRoles(): Promise<Role[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('roles').select('*')
    if (!error && data) return data as Role[]
  } catch {}

  return []
}

export async function getPermissions(): Promise<Permission[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('permissions').select('*')
    if (!error && data) return data as Permission[]
  } catch {}

  return []
}

export async function getBanners(): Promise<HomepageBanner[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('homepage_banners').select('*').eq('is_active', true).order('display_order')
    if (!error && data) return data as HomepageBanner[]
  } catch {}

  return []
}

export async function createBanner(banner: Partial<HomepageBanner>): Promise<{ success: boolean; data?: HomepageBanner; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('homepage_banners').insert(banner).select().single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as HomepageBanner }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function updateBanner(id: string, banner: Partial<HomepageBanner>): Promise<{ success: boolean; data?: HomepageBanner; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('homepage_banners').update(banner).eq('id', id).select().single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as HomepageBanner }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function deleteBanner(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('homepage_banners').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

export async function getAdminBlogsWithStatus(): Promise<{ blogs: Blog[]; error: string | null }> {
  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('is_published', true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order('published_at', { ascending: false, nullsFirst: true })

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || error.message.includes('schema cache')
      const errMsg = isMissingTable
        ? 'Blog database table is unavailable.'
        : error.message
      console.warn('Diagnostic warning (blogs query):', error.message || error)
      return { blogs: [], error: errMsg }
    }
    return { blogs: (data || []) as Blog[], error: null }
  } catch (err: any) {
    console.warn('Diagnostic warning (blogs exception):', err.message || err)
    return { blogs: [], error: err.message || 'Blog database table is unavailable.' }
  }
}

export async function getBlogs(): Promise<Blog[]> {
  const result = await getAdminBlogsWithStatus()
  return result.blogs
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20)
    if (!error && data) return data as ActivityLog[]
  } catch {}

  return []
}

export async function checkUserPermission(userEmail: string, permissionCode: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('admin_users')
      .select('*, role:roles(*)')
      .eq('email', userEmail)
      .eq('is_active', true)
      .maybeSingle()

    if (!user) return false
    if (user.role?.code === 'super_admin') return true

    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id, permission:permissions(name)')
      .eq('role_id', user.role_id)

    if (rolePerms && Array.isArray(rolePerms)) {
      return (rolePerms as unknown as Array<{ permission?: { name?: string } | { name?: string }[] }>).some((rp) => {
        const perm = Array.isArray(rp.permission) ? rp.permission[0] : rp.permission
        return perm?.name === permissionCode
      })
    }
  } catch {}

  return false
}

export async function getAdminKPIs() {
  try {
    const supabase = createAdminClient()

    const [
      { count: productsCount },
      { count: categoriesCount },
      { count: ordersCount },
      { count: customersCount },
      { count: lowStockCount },
      { count: couponsCount },
      { count: blogsCount },
      { count: reviewsCount },
      { data: salesData },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('*', { count: 'exact', head: true }).lte('quantity', 5),
      supabase.from('coupons').select('*', { count: 'exact', head: true }),
      supabase.from('blogs').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').in('status', ['delivered', 'shipped', 'completed', 'processing', 'pending']),
    ])

    const totalSales = salesData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0

    return {
      totalSales,
      totalOrders: ordersCount || 0,
      activeCustomers: customersCount || 0,
      lowStockAlerts: lowStockCount || 0,
      totalProducts: productsCount || 0,
      totalCategories: categoriesCount || 0,
      totalCoupons: couponsCount || 0,
      totalBlogs: blogsCount || 0,
      totalReviews: reviewsCount || 0,
    }
  } catch {}

  return {
    totalSales: 0,
    totalOrders: 0,
    activeCustomers: 0,
    lowStockAlerts: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalCoupons: 0,
    totalBlogs: 0,
    totalReviews: 0,
  }
}

export interface DashboardOverviewData {
  kpis: {
    totalSales: number
    totalOrders: number
    activeCustomers: number
    lowStockAlerts: number
  }
  monthlySales: { month: string; sales: number }[]
  fulfillmentPipeline: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    total: number
  }
  recentOrders: Order[]
  recentActivity: ActivityLog[]
}

export async function getAdminDashboardData(): Promise<DashboardOverviewData> {
  const currentYear = new Date().getFullYear()
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlySales = monthLabels.map(month => ({ month, sales: 0 }))

  try {
    const supabase = createAdminClient()

    const [
      { count: ordersCount },
      { count: customersCount },
      { count: lowStockCount },
      { data: allOrders },
      { data: activityLogs }
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('*', { count: 'exact', head: true }).lte('quantity', 5),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(6)
    ])

    const ordersList: Order[] = (allOrders as Order[]) || []
    
    // Calculate total sales from orders
    let totalSales = 0
    const pipeline = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      total: ordersList.length
    }

    ordersList.forEach(o => {
      const amt = Number(o.total_amount || 0)
      if (o.status !== 'cancelled') {
        totalSales += amt
      }

      // Track status counts
      const status = (o.status || 'pending').toLowerCase()
      if (status === 'pending') pipeline.pending++
      else if (status === 'processing') pipeline.processing++
      else if (status === 'shipped') pipeline.shipped++
      else if (status === 'delivered') pipeline.delivered++
      else if (status === 'cancelled') pipeline.cancelled++

      // Track monthly sales for current year
      if (o.created_at) {
        const orderDate = new Date(o.created_at)
        if (orderDate.getFullYear() === currentYear && o.status !== 'cancelled') {
          const mIdx = orderDate.getMonth()
          if (mIdx >= 0 && mIdx < 12) {
            monthlySales[mIdx].sales += amt
          }
        }
      }
    })

    return {
      kpis: {
        totalSales,
        totalOrders: ordersCount || ordersList.length,
        activeCustomers: customersCount || 0,
        lowStockAlerts: lowStockCount || 0
      },
      monthlySales,
      fulfillmentPipeline: pipeline,
      recentOrders: ordersList.slice(0, 5),
      recentActivity: (activityLogs as ActivityLog[]) || []
    }
  } catch (err) {
    console.error('Error in getAdminDashboardData:', err)
  }

  return {
    kpis: { totalSales: 0, totalOrders: 0, activeCustomers: 0, lowStockAlerts: 0 },
    monthlySales,
    fulfillmentPipeline: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, total: 0 },
    recentOrders: [],
    recentActivity: []
  }
}
