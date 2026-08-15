// src/components/store/account/AccountSection.tsx
import React, { ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const AccountSection: React.FC<Props> = ({ title, children, className }) => {
  return (
    <section className={`space-y-4 ${className ?? ''}`}>
      {title && <h2 className="font-serif text-xl font-semibold text-foreground">{title}</h2>}
      {children}
    </section>
  );
};
