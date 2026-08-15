'use client'

import React from 'react'

interface PermissionAwareNavItemProps {
  requiredPermission?: string
  userRole?: string
  children: React.ReactNode
}

export const PermissionAwareNavItem: React.FC<PermissionAwareNavItemProps> = ({
  requiredPermission,
  userRole = 'super_admin',
  children,
}) => {
  // If no permission specified or user is super_admin, render children
  if (!requiredPermission || userRole === 'super_admin') {
    return <>{children}</>
  }

  // Simple permission mapping for standard admin roles
  const rolePermissions: Record<string, string[]> = {
    inventory_manager: ['manage_inventory', 'manage_products'],
    marketing_manager: ['manage_marketing', 'manage_products'],
    support_agent: ['manage_orders', 'manage_customers'],
    catalog_manager: ['manage_products'],
  }

  const allowed = rolePermissions[userRole]?.includes(requiredPermission) ?? false

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
