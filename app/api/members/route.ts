import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Gère la lecture (GET), l'invitation (POST) et le retrait (DELETE) de membres de workspaces
 * en utilisant le client d'administration côté serveur pour contourner les blocages RLS de team_members.
 */

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) {
      return NextResponse.json({ error: 'Paramètre teamId manquant' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Vérifier si l'utilisateur est bien membre de la team (pour pouvoir lister)
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // Récupérer les membres de l'équipe
    const { data: members, error: membersError } = await adminSupabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId);

    if (membersError) throw membersError;

    // Récupérer les emails des membres depuis la table profiles
    const userIds = (members || []).map((m) => m.user_id);
    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (profilesError) {
      console.warn("Could not load profiles, returning raw member data:", profilesError);
      return NextResponse.json(members.map(m => ({ ...m, email: `Membre (${m.user_id.slice(0, 8)}...)` })));
    }

    const emailMap = new Map(profiles.map((p) => [p.id, p.email]));
    const formatted = members.map((m) => ({
      ...m,
      email: emailMap.get(m.user_id) || `Membre (${m.user_id.slice(0, 8)}...)`
    }));

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error listing team members:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { teamId, email, role = 'member' } = await request.json();
    if (!teamId || !email?.trim()) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Vérifier si l'utilisateur est bien admin de la team (pour inviter)
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // 1. Chercher l'utilisateur par e-mail dans profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Aucun utilisateur inscrit sous cette adresse e-mail.' }, { status: 404 });
    }

    // 2. Lier le membre
    const { error: insertError } = await adminSupabase
      .from('team_members')
      .insert({
        user_id: profile.id,
        team_id: teamId,
        role
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Cet utilisateur est déjà membre de cet espace de travail.' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error adding team member:', err);
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

    const { teamId, userId } = await request.json();
    if (!teamId || !userId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Vérifier si l'utilisateur est bien admin de la team (pour exclure)
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // Effectuer la suppression
    const { error } = await adminSupabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error removing team member:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
