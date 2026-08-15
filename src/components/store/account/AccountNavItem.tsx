// src/components/store/account/AccountNavItem.tsx
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const AccountNavItem: React.FC<Props> = ({ href, label, icon: Icon }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  if (process.env.NODE_ENV !== 'production' && !Icon) {
    throw new Error(`AccountNavItem "${label}" received an invalid icon`);
  }
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center space-x-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/5 text-foreground border-l-2 border-accent font-semibold'
          : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
      )}
    >
      <Icon className={cn('w-[18px] h-[18px]', isActive ? 'text-accent' : 'text-muted-foreground')} />
      <span>{label}</span>
    </Link>
  );
};
