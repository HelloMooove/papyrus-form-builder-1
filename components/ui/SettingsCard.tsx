import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight';
}

export function SettingsCard({ children, className, variant = 'default' }: SettingsCardProps) {
  return (
    <div
      className={cn(
        'border border-papyrus-border rounded-xl p-4 transition-colors',
        variant === 'highlight' ? 'bg-amber-50' : 'bg-papyrus-surface',
        className
      )}
    >
      {children}
    </div>
  );
}
