// src/components/store/account/AccountEmptyState.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Props {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export const AccountEmptyState: React.FC<Props> = ({ 
  Icon, 
  title, 
  description, 
  ctaLabel, 
  ctaHref,
  onCtaClick 
}) => {
  const content = (
    <>
      <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mx-auto shadow-sm">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-serif text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      </div>
      <div className="pt-6">
        {ctaHref ? (
          <Link href={ctaHref}>
            <Button variant="primary" className="px-6 py-2.5 shadow-md hover:shadow-lg min-h-[44px]">
              {ctaLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" onClick={onCtaClick} className="px-6 py-2.5 shadow-md hover:shadow-lg min-h-[44px]">
            {ctaLabel}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="text-center py-20 px-4 bg-surface-muted rounded-2xl border border-border shadow-sm space-y-5">
      {content}
    </div>
  );
};
