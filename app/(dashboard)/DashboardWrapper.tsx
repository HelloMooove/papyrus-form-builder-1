'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

interface Props {
  teamName?: string;
  userEmail?: string;
  activeTeam?: { id: string; name: string; plan: string };
  allTeams?: { id: string; name: string; plan: string }[];
  children: React.ReactNode;
}

export function DashboardWrapper({
  teamName,
  userEmail,
  activeTeam,
  allTeams,
  children
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Détecter si on est sur la page builder pour supprimer le padding
  const isBuilderPage = pathname.includes('/edit');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        teamName={teamName}
        userEmail={userEmail}
        activeTeam={activeTeam}
        allTeams={allTeams}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className={`relative flex-1 ${isBuilderPage ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{
            padding: isBuilderPage ? '0' : 'var(--layout-padding)'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
