import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardWrapper } from './DashboardWrapper';
import { IS_LOCAL_MODE } from '@/lib/mode';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let teamName = 'Démo locale';
  let userEmail = 'local@papyrus.dev';
  let activeTeam = { id: 'local', name: 'Démo locale', plan: 'free' };
  let allTeams: { id: string; name: string; plan: string }[] = [activeTeam];

  if (!IS_LOCAL_MODE) {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    userEmail = user.email ?? '';

    const adminSupabase = createAdminClient();

    // Charger tous les workspaces de l'utilisateur via le client Admin (pour contourner le bug RLS de récursivité infinie en base de données)
    const { data: memberships } = await adminSupabase
      .from('team_members')
      .select('team_id, role, teams(id, name, plan)')
      .eq('user_id', user.id);

    let membershipsList = memberships || [];

    // Extraire les teams valides d'abord
    allTeams = membershipsList
      .map((m) => {
        const t = m.teams as unknown;
        return Array.isArray(t) ? t[0] : (t as { id: string; name: string; plan: string } | null);
      })
      .filter((t): t is { id: string; name: string; plan: string } => !!t && !!t.id);

    if (allTeams.length === 0) {
      // Si aucun workspace valide n'est trouvé -> création de "Mon espace" dans Supabase via le client Admin (RLS bypass)
      const adminSupabase = createAdminClient();
      const { data: newTeam, error: teamError } = await adminSupabase
        .from('teams')
        .insert({ name: 'Mon espace', plan: 'free' })
        .select()
        .single();

      if (!teamError && newTeam) {
        const { error: memberError } = await adminSupabase
          .from('team_members')
          .insert({
            user_id: user.id,
            team_id: newTeam.id,
            role: 'admin'
          });

        if (!memberError) {
          // Recharger le nouveau membership créé avec le client ADMIN pour contourner le bug RLS
          const { data: newMemberships } = await adminSupabase
            .from('team_members')
            .select('team_id, role, teams(id, name, plan)')
            .eq('team_id', newTeam.id)
            .eq('user_id', user.id);

          if (newMemberships && newMemberships.length > 0) {
            membershipsList = newMemberships;
            allTeams = membershipsList
              .map((m) => {
                const t = m.teams as unknown;
                return Array.isArray(t) ? t[0] : (t as { id: string; name: string; plan: string } | null);
              })
              .filter((t): t is { id: string; name: string; plan: string } => !!t && !!t.id);
          }
        }
      }
    }

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
      }
    }

  return (
    <DashboardWrapper
      teamName={teamName}
      userEmail={userEmail}
      activeTeam={activeTeam}
      allTeams={allTeams}
    >
      {children}
    </DashboardWrapper>
  );
}
