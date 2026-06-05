import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Gère le renommage (PATCH) et la suppression (DELETE) de workspaces
 * en utilisant le client d'administration côté serveur pour contourner les contraintes RLS de teams.
 */

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Charger tous les workspaces de l'utilisateur via le client Admin
    const { data: memberships } = await adminSupabase
      .from('team_members')
      .select('team_id, role, teams(id, name, plan)')
      .eq('user_id', user.id);

    const membershipsList = memberships || [];

    // Extraire les teams valides
    const teams = membershipsList
      .map((m) => {
        const t = m.teams as unknown;
        return Array.isArray(t) ? t[0] : (t as { id: string; name: string; plan: string } | null);
      })
      .filter((t): t is { id: string; name: string; plan: string } => !!t && !!t.id);

    return NextResponse.json(teams);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching teams:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { teamId, name } = await request.json();
    if (!teamId || !name?.trim()) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Vérifier si l'utilisateur est bien membre admin de la team
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // Effectuer le renommage avec le client Admin
    const { error } = await adminSupabase
      .from('teams')
      .update({ name: name.trim() })
      .eq('id', teamId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error renaming team:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { teamId } = await request.json();
    if (!teamId) {
      return NextResponse.json({ error: 'Paramètre teamId manquant' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Vérifier si l'utilisateur est bien membre admin de la team
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // Ne pas permettre de supprimer l'espace "Mon espace"
    const { data: team } = await adminSupabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .maybeSingle();

    if (team?.name === 'Mon espace') {
      return NextResponse.json({ error: 'Mon espace est non-supprimable' }, { status: 400 });
    }

    // Effectuer la suppression avec le client Admin
    const { error } = await adminSupabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error deleting team:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
