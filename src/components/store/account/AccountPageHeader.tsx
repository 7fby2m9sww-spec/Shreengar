// src/components/store/account/AccountPageHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
}

export const AccountPageHeader: React.FC<Props> = ({ breadcrumbs, title, description }) => {
  return (
    <div className="mb-8">
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
        {breadcrumbs.map((item, idx) => (
          <React.Fragment key={idx}>
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {idx < breadcrumbs.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </nav>
      <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
