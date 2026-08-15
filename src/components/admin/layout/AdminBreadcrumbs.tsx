'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { ADMIN_NAV_CONFIG } from './AdminNavConfig'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface AdminBreadcrumbsProps {
  customItems?: BreadcrumbItem[]
}

export const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({ customItems }) => {
  const pathname = usePathname()

  let breadcrumbs: BreadcrumbItem[] = []

  if (customItems && customItems.length > 0) {
    breadcrumbs = customItems
  } else {
    // Generate dynamically from route
    breadcrumbs.push({ label: 'Dashboard', href: '/admin' })

    if (pathname !== '/admin' && pathname !== '/admin/dashboard') {
      const segments = pathname.replace('/admin/', '').split('/').filter(Boolean)
      
      let accumulatedHref = '/admin'
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        accumulatedHref += `/${seg}`

        // Match segment to NAV_CONFIG labels if possible
        let foundLabel: string | undefined

        for (const group of ADMIN_NAV_CONFIG) {
          if (group.href === accumulatedHref) {
            foundLabel = group.label;
            break;
          }
          if (group.children) {
            const childMatch = group.children.find(c => c.href === accumulatedHref || c.href.split('?')[0] === accumulatedHref)
            if (childMatch) {
              // Add parent label if first segment
              if (i === 0) {
                breadcrumbs.push({ label: group.label })
              }
              foundLabel = childMatch.label;
              break;
            }
          }
        }

        if (!foundLabel) {
          // Format slug like 'admin-users' -> 'Admin Users'
          foundLabel = seg
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
        }

        // If not already added as parent
        if (breadcrumbs[breadcrumbs.length - 1]?.label !== foundLabel) {
          breadcrumbs.push({
            label: foundLabel,
            href: i === segments.length - 1 ? undefined : accumulatedHref
          })
        }
      }
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#7A6B70] dark:text-[#BFA8AF]">
      <Link
        href="/admin"
        className="flex items-center hover:text-[#5C0B26] dark:hover:text-[#FFF4DC] transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
        title="Admin Home"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Admin Dashboard</span>
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-[#7A6B70]/40 flex-shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-[#5C0B26] dark:hover:text-[#FFF4DC] font-medium transition-colors max-w-[140px] sm:max-w-[200px] truncate focus:outline-none focus:ring-1 focus:ring-[#D4AF37] rounded"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`max-w-[140px] sm:max-w-[240px] truncate ${
                  isLast ? 'font-bold text-[#2B1A1F] dark:text-[#FFF4DC]' : 'font-medium text-[#7A6B70]'
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
