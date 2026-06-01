import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { IS_LOCAL_MODE } from '@/lib/mode';
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let teamName = 'Démo locale';
  let userEmail = 'local@papyrus.dev';
  let activeTeam = { id: 'local', name: 'Démo locale', plan: 'free' };
  let allTeams: { id: string; name: string; plan: string }[] = [activeTeam];

  if (!IS_LOCAL_MODE) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    userEmail = user.email ?? '';

    // Charger tous les workspaces de l'utilisateur
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, teams(id, name, plan)');

    if (memberships && memberships.length > 0) {
      allTeams = memberships
        .map((m) => {
          const t = m.teams as unknown;
          return Array.isArray(t) ? t[0] : (t as { id: string; name: string; plan: string } | null);
        })
        .filter((t): t is { id: string; name: string; plan: string } => !!t && !!t.id);

      if (allTeams.length > 0) {
        // Lire le cookie d'espace actif
        const activeTeamId = cookies().get('papyrus:active-team-id')?.value;
        const foundActive = allTeams.find((t) => t.id === activeTeamId);

        if (foundActive) {
          activeTeam = foundActive;
        } else {
          activeTeam = allTeams[0];
        }
        teamName = activeTeam.name;
      } else {
        teamName = 'Mon équipe';
        activeTeam = { id: user.id, name: teamName, plan: 'free' };
        allTeams = [activeTeam];
      }
    } else {
      teamName = 'Mon équipe';
      activeTeam = { id: user.id, name: teamName, plan: 'free' };
      allTeams = [activeTeam];
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        teamName={teamName} 
        userEmail={userEmail} 
        activeTeam={activeTeam} 
        allTeams={allTeams} 
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
