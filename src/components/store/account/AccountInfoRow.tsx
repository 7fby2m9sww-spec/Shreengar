// src/components/store/account/AccountInfoRow.tsx
import React from 'react';

interface Props {
  label: string;
  value: React.ReactNode;
}

export const AccountInfoRow: React.FC<Props> = ({ label, value }) => (
  <div className="flex justify-between py-3 border-b border-border/30 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);
