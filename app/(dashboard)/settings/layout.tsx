'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, User, Palette, Bell } from 'lucide-react';
import { SettingsHeader } from '@/components/ui/SettingsHeader';
import { cn } from '@/lib/utils';

const SETTINGS_NAVIGATION = [
  {
    label: 'Profil',
    href: '/settings/profile',
    icon: User,
    description: 'Vos informations personnelles'
  },
  {
    label: 'Équipe',
    href: '/settings/team',
    icon: Users,
    description: 'Membres et invitations'
  },
  {
    label: 'Apparence',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Thème et préférences'
  },
  {
    label: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Alertes et emails'
  }
];

interface Props {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SettingsHeader
        icon={Settings}
        title="Paramètres"
        description="Gérez votre compte, votre équipe et vos préférences."
      />

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-2">
            {SETTINGS_NAVIGATION.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col px-4 py-3 rounded-xl transition-all text-left",
                    isActive
                      ? "bg-mooove-navy text-white shadow-sm"
                      : "text-gray-700 hover:bg-papyrus-surface hover:text-mooove-navy"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-gray-500 group-hover:text-mooove-navy"
                    )} />
                    <span className="font-medium text-base">{item.label}</span>
                  </div>
                  <p className={cn(
                    "text-xs mt-1 ml-8",
                    isActive ? "text-white/70" : "text-gray-500"
                  )}>
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="bg-papyrus-surface rounded-2xl border border-papyrus-border p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}