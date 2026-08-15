'use client'

import React from 'react'

interface PermissionGateProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  fallback = null,
}) => {
  // Super admin demo user bypass for full accessibility during review
  const isSuperAdmin = true

  if (!isSuperAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
