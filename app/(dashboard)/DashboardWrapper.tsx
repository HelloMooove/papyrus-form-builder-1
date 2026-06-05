'use client';

import { useState } from 'react';
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
        <main className="relative flex-1 overflow-y-auto" style={{ padding: 'var(--layout-padding)' }}>{children}</main>
      </div>
    </div>
  );
}
