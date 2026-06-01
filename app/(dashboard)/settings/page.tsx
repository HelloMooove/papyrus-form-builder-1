'use client';

import { useEffect, useState } from 'react';
import { Mail, Shield, UserPlus, Users, Trash2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { listTeamMembers, addTeamMember, updateTeamMemberRole, deleteTeamMember, updateTeamName } from '@/lib/store';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  role: 'admin' | 'member' | 'reader';
  joined_at: string;
  email: string;
}

export default function SettingsPage() {
  const [activeTeam, setActiveTeam] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'reader'>('member');

  // Helper pour lire le cookie actif
  function getActiveTeamId(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^|;)\s*papyrus:active-team-id\s*=\s*([^;]+)/);
    return match ? match[2] : null;
  }

  // Charger les données de l'espace et des membres
  async function loadData() {
    setLoading(true);
    try {
      const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
      
      if (isLocal) {
        setActiveTeam({ id: 'local', name: 'Démo locale' });
        setTeamNameDraft('Démo locale');
        const list = await listTeamMembers('local');
        setMembers(list);
        setCurrentUserId('local-user');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 1. Déterminer l'espace actif
      const activeTeamId = getActiveTeamId();
      let teamId = activeTeamId;

      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id, teams(name)');

      if (memberships && memberships.length > 0) {
        const found = memberships.find((m) => m.team_id === teamId);
        const selected = found || memberships[0];
        
        const t = selected.teams as unknown;
        const name = (Array.isArray(t) ? t[0]?.name : (t as { name?: string })?.name) ?? 'Mon équipe';
        
        setActiveTeam({ id: selected.team_id, name });
        setTeamNameDraft(name);
        
        // 2. Charger les membres
        const list = await listTeamMembers(selected.team_id);
        setMembers(list);
      }
    } catch (error) {
      console.error('Failed to load settings data:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRenameWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTeam || !teamNameDraft.trim()) return;

    setSavingName(true);
    try {
      await updateTeamName(activeTeam.id, teamNameDraft.trim());
      setActiveTeam({ ...activeTeam, name: teamNameDraft.trim() });
      toast.success('Espace de travail renommé avec succès !');
      // Force refresh the sidebar
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Failed to rename workspace:', error);
      toast.error('Erreur lors de la modification du nom');
    } finally {
      setSavingName(false);
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTeam || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      await addTeamMember(activeTeam.id, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation envoyée à ${inviteEmail} !`);
      setInviteEmail('');
      // Recharger les membres
      const list = await listTeamMembers(activeTeam.id);
      setMembers(list);
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout du membre');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'member' | 'reader') {
    if (!activeTeam) return;
    try {
      await updateTeamMemberRole(activeTeam.id, userId, role);
      toast.success('Rôle mis à jour avec succès');
      setMembers(members.map(m => m.user_id === userId ? { ...m, role } : m));
    } catch (error) {
      console.error('Failed to change member role:', error);
      toast.error('Erreur lors du changement de rôle');
    }
  }

  async function handleRemoveMember(userId: string, email: string) {
    if (!activeTeam) return;
    if (!confirm(`Retirer ${email} de l'espace de travail ?`)) return;

    try {
      await deleteTeamMember(activeTeam.id, userId);
      toast.success('Membre retiré avec succès');
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Erreur lors de la suppression du membre');
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-4xl">Paramètres</h1>
        <p className="papyrus-meta mt-1 text-sm not-italic">
          i. Gérez votre espace de travail et les membres de votre équipe
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Workspace details card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm space-y-4">
            <h2 className="font-display text-xl font-bold border-b border-border pb-2">Général</h2>
            <form onSubmit={handleRenameWorkspace} className="space-y-4">
              <Input
                label="Nom de l'espace"
                value={teamNameDraft}
                onChange={(e) => setTeamNameDraft(e.target.value)}
                placeholder="Mon équipe"
                disabled={isLocal}
                maxLength={50}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                loading={savingName}
                disabled={isLocal || !teamNameDraft.trim() || teamNameDraft.trim() === activeTeam?.name}
              >
                Sauvegarder
              </Button>
            </form>
            {isLocal && (
              <p className="text-[11px] text-text-tertiary">
                * Le renommage de l'espace de travail est désactivé en mode démo locale.
              </p>
            )}
          </div>
        </div>

        {/* Member management card */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-text-secondary" />
                Membres de l'équipe
              </h2>
              <span className="rounded-full bg-accent/5 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/15">
                {members.length} membre{members.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Invite member form */}
            {!isLocal && (
              <form onSubmit={handleInviteMember} className="rounded-xl border border-border-strong bg-bg-base/40 p-4 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <UserPlus className="h-4 w-4" />
                  Inviter un nouveau membre
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="h-10 w-full rounded-md border border-border-strong bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'reader')}
                      className="h-10 w-full rounded-md border border-border-strong bg-bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                    >
                      <option value="member">Collaborateur (Écriture)</option>
                      <option value="reader">Lecteur (Lecture seule)</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    variant="cta"
                    size="md"
                    loading={inviting}
                    disabled={!inviteEmail.trim()}
                  >
                    Inviter
                  </Button>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-text-tertiary leading-normal">
                  <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    L'utilisateur doit déjà posséder un compte Papyrus. Sa liaison à votre espace sera immédiate.
                  </span>
                </div>
              </form>
            )}

            {/* Member list */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="border-b border-border bg-bg-elevated/40 text-left text-xs uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium">Adresse Email</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => {
                    const isSelf = member.user_id === currentUserId;
                    return (
                      <tr 
                        key={member.user_id} 
                        className={cn(
                          "transition-colors",
                          i < members.length - 1 ? 'border-b border-dashed border-border' : '',
                          isSelf && "bg-accent/5"
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{member.email}</span>
                            {isSelf && (
                              <span className="rounded-full bg-accent-cta/15 border border-accent-cta/30 px-1.5 py-0.2 text-[9px] font-semibold text-accent-bold">
                                Vous
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSelf || isLocal ? (
                            <span className="inline-flex items-center gap-1 text-xs text-text-secondary font-medium capitalize">
                              <Shield className="h-3.5 w-3.5 text-accent-bold" />
                              {member.role === 'admin' ? 'Administrateur' : member.role === 'reader' ? 'Lecteur' : 'Collaborateur'}
                            </span>
                          ) : (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.user_id, e.target.value as 'admin' | 'member' | 'reader')}
                              className="h-8 rounded border border-border-strong bg-bg-surface px-2 text-xs text-text-primary focus:border-accent focus:outline-none"
                            >
                              <option value="member">Collaborateur</option>
                              <option value="reader">Lecteur</option>
                              <option value="admin">Administrateur</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isSelf && !isLocal && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.email)}
                              className="text-text-tertiary transition hover:text-danger p-1 hover:bg-danger/5 rounded-md"
                              aria-label="Retirer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
