import {
  LayoutDashboard,
  Package,
  Layers,
  FolderTree,
  Sparkles,
  Palette,
  Ruler,
  SlidersHorizontal,
  Warehouse,
  AlertTriangle,
  PackageX,
  History,
  ShoppingBag,
  RotateCcw,
  CreditCard,
  Users,
  Star,
  Headphones,
  Ticket,
  ImageIcon,
  BookOpen,
  UserCheck,
  Shield,
  KeyRound,
  FileText,
  Settings
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavChildItem {
  label: string
  href: string
  comingSoon?: boolean
  requiredPermission?: string
}

export interface NavGroupItem {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  requiredPermission?: string
  children?: NavChildItem[]
}

export const ADMIN_NAV_CONFIG: NavGroupItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    requiredPermission: 'manage_products',
    children: [
      { label: 'Products', href: '/admin/products' },
      { label: 'Product Families', href: '/admin/product-families' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'Collections', href: '/admin/collections' },
      { label: 'Colors', href: '/admin/colors' },
    ],
  },

  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingBag,
    requiredPermission: 'manage_orders',
    children: [
      { label: 'Orders', href: '/admin/orders' },
      { label: 'Returns', href: '#', comingSoon: true },
      { label: 'Payments', href: '#', comingSoon: true },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    requiredPermission: 'manage_customers',
    children: [
      { label: 'Customers', href: '/admin/customers' },
      { label: 'Reviews', href: '/admin/reviews' },
      { label: 'Support Inbox', href: '/admin/support', requiredPermission: 'support.manage' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Ticket,
    requiredPermission: 'manage_marketing',
    children: [
      { label: 'Homepage', href: '/admin/homepage' },
      { label: 'Coupons', href: '/admin/coupons' },
      { label: 'Banners', href: '/admin/banners' },
      { label: 'Blog', href: '/admin/blogs' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Shield,
    requiredPermission: 'manage_roles',
    children: [
      { label: 'Admin Users', href: '/admin/admin-users' },
      { label: 'Roles', href: '/admin/roles' },
      { label: 'Permissions', href: '/admin/permissions' },
      { label: 'Activity Logs', href: '#', comingSoon: true },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'General Settings', href: '/admin/settings' },
      { label: 'Footer Manager', href: '/admin/settings/footer' },
      { label: 'Security', href: '/admin/settings/security' },
    ],
  },
]
