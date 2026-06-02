'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Filter,
  Search,
  Users,
  User,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { formatCount } from '@/lib/utils';
import { createForm, listTeamMembers, addTeamMember, deleteTeamMember } from '@/lib/store';
import { getWorkspace, getWorkspaceForms } from '@/lib/store/local-workspaces';
import type { Form, Workspace } from '@/types';

type FilterStatus = 'all' | 'published' | 'draft' | 'closed';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceForms, setWorkspaceForms] = useState<Form[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);

  // États pour la gestion des membres du workspace
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

  // Récupérer l'utilisateur Supabase connecté
  useEffect(() => {
    async function getCurrentUser() {
      if (!isLocal) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      }
    }
    getCurrentUser();
  }, [isLocal]);

  // Fonction pour charger les membres de l'équipe
  const loadMembers = async (id: string) => {
    try {
      if (isLocal) {
        const { getMembers } = await import('@/lib/store/local-workspaces');
        setWorkspaceMembers(getMembers(id));
      } else {
        const list = await listTeamMembers(id);
        setWorkspaceMembers(list);
      }
    } catch (err) {
      console.error('Error loading workspace members:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !workspace) return;
    setMemberLoading(true);

    try {
      if (isLocal) {
        const { addMember } = await import('@/lib/store/local-workspaces');
        addMember({
          user_id: `user-${Date.now()}`,
          workspace_id: workspace.id,
          role: 'member',
          name: 'Nouveau membre',
          email: newMemberEmail.trim()
        });
      } else {
        await addTeamMember(workspace.id, newMemberEmail.trim(), 'member');
      }
      setNewMemberEmail('');
      await loadMembers(workspace.id);
      toast.success('Membre invité avec succès !');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'invitation");
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace) return;
    if (confirm('Retirer ce membre de cet espace de travail ?')) {
      try {
        if (isLocal) {
          const { removeMember } = await import('@/lib/store/local-workspaces');
          removeMember(workspace.id, userId);
        } else {
          await deleteTeamMember(workspace.id, userId);
        }
        await loadMembers(workspace.id);
        toast.success('Membre retiré.');
      } catch (err) {
        console.error(err);
        toast.error('Erreur lors du retrait du membre');
      }
    }
  };

  // Charger le workspace et ses formulaires
  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
        if (isLocal) {
          const ws = getWorkspace(workspaceId);
          if (!ws) {
            router.push('/dashboard');
            return;
          }
          setWorkspace(ws);

          const forms = getWorkspaceForms(workspaceId);
          setWorkspaceForms(forms);
          setLoading(false);
        } else {
          // Mode Supabase
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();

          // Récupérer le team (workspace)
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', workspaceId)
            .maybeSingle();

          if (teamError || !team) {
            console.error('Team error:', teamError);
            router.push('/dashboard');
            return;
          }

          // Récupérer le nombre de membres
          const { data: members } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', workspaceId);

          setWorkspace({
            id: team.id,
            name: team.name,
            scope: 'team',
            is_deletable: false,
            created_by: '',
            created_at: team.created_at,
            members: (members || []).map(m => ({
              user_id: m.user_id,
              workspace_id: m.team_id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              role: m.role as any,
              joined_at: m.joined_at
            })),
            form_count: 0
          });

          // Récupérer les formulaires de cette team
          const { data: forms, error: formsError } = await supabase
            .from('forms')
            .select('*')
            .eq('team_id', workspaceId)
            .order('updated_at', { ascending: false });

          if (formsError) {
            console.error('Error fetching workspace forms:', formsError);
            setWorkspaceForms([]);
          } else {
            // Récupérer les champs pour chaque formulaire (pour le nombre de champs affiché)
            const formsWithFields = await Promise.all(
              (forms || []).map(async (form) => {
                const { data: fields = [] } = await supabase
                  .from('fields')
                  .select('id')
                  .eq('form_id', form.id);
                return {
                  ...form,
                  fields: fields
                };
              })
            );
            setWorkspaceForms(formsWithFields as any);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
        router.push('/dashboard');
      }
    }

    loadWorkspaceData();

    // Recharger sur changement de formulaires
    const handleFormsChanged = () => {
      loadWorkspaceData();
    };

    window.addEventListener('papyrus:forms-changed', handleFormsChanged);
    window.addEventListener('papyrus:workspaces-changed', handleFormsChanged);

    return () => {
      window.removeEventListener('papyrus:forms-changed', handleFormsChanged);
      window.removeEventListener('papyrus:workspaces-changed', handleFormsChanged);
    };
  }, [workspaceId, router]);

  // Formulaires filtrés
  const filteredForms = useMemo(() => {
    let filtered = workspaceForms.filter(form => !form.is_template);

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => form.status === statusFilter);
    }

    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(form =>
        form.title.toLowerCase().includes(search) ||
        form.description?.toLowerCase().includes(search)
      );
    }

    // Tri par date de modification desc
    return filtered.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [workspaceForms, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const forms = workspaceForms.filter(f => !f.is_template);
    return {
      total: forms.length,
      published: forms.filter(f => f.status === 'published').length,
      draft: forms.filter(f => f.status === 'draft').length,
      closed: forms.filter(f => f.status === 'closed').length
    };
  }, [workspaceForms]);

  const handleNewForm = async () => {
    try {
      // S'assurer que le workspace existe
      const { initDefaultWorkspace } = await import('@/lib/store/local-workspaces');
      initDefaultWorkspace('local-user');

      const form = await createForm('Nouveau formulaire', workspaceId);
      router.push(`/forms/${form.id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="h-8 w-48 bg-bg-elevated animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-bg-elevated animate-pulse rounded mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-bg-elevated animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  const isPersonal = workspace.scope === 'personal';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {isPersonal ? (
              <User className="h-7 w-7 text-text-secondary" />
            ) : (
              <Users className="h-7 w-7 text-text-secondary" />
            )}
            <h1 className="font-display text-4xl text-text-primary">
              {workspace.name}
            </h1>
          </div>
          <p className="papyrus-meta text-sm not-italic text-text-secondary">
            i. {filteredForms.length} formulaire{filteredForms.length > 1 ? 's' : ''}
            {searchTerm && ` trouvé${filteredForms.length > 1 ? 's' : ''} pour "${searchTerm}"`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isPersonal && (
            <Button
              variant="secondary"
              iconLeft={<Users className="h-4 w-4" />}
              onClick={() => {
                setIsManagingMembers(true);
                loadMembers(workspace.id);
              }}
            >
              Membres
            </Button>
          )}
          <Button
            variant="cta"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={handleNewForm}
          >
            Nouveau formulaire
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="Total"
          value={formatCount(stats.total)}
          icon={<FileText className="h-4 w-4" />}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          label="Publiés"
          value={formatCount(stats.published)}
          icon={<Check className="h-4 w-4" />}
          color="text-mooove-electric"
          active={statusFilter === 'published'}
          onClick={() => setStatusFilter('published')}
        />
        <StatCard
          label="Brouillons"
          value={formatCount(stats.draft)}
          icon={<Pencil className="h-4 w-4" />}
          color="text-text-secondary"
          active={statusFilter === 'draft'}
          onClick={() => setStatusFilter('draft')}
        />
        <StatCard
          label="Clos"
          value={formatCount(stats.closed)}
          icon={<X className="h-4 w-4" />}
          color="text-text-tertiary"
          active={statusFilter === 'closed'}
          onClick={() => setStatusFilter('closed')}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Rechercher un formulaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition"
          />
        </div>
      </div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <EmptyState
          hasSearch={!!searchTerm}
          statusFilter={statusFilter}
          onNewForm={handleNewForm}
          onClearSearch={() => setSearchTerm('')}
          onClearFilter={() => setStatusFilter('all')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>
      )}

      {/* Modal de Gestion des Membres du Workspace */}
      {isManagingMembers && workspace && (
        <Modal
          isOpen={isManagingMembers}
          onClose={() => setIsManagingMembers(false)}
          title={`Gérer les membres — ${workspace.name}`}
        >
          <div className="space-y-6">
            {/* Formulaire d'invitation */}
            <form onSubmit={handleAddMember} className="space-y-3">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-text-tertiary">
                Inviter un membre
              </span>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="collaborateur@mooove.live"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 h-10 px-3 border border-border bg-bg-surface text-sm rounded-md focus:border-accent focus:outline-none"
                />
                <Button type="submit" variant="cta" loading={memberLoading} size="sm">
                  Inviter
                </Button>
              </div>
            </form>

            {/* Liste des membres */}
            <div className="space-y-3">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-text-tertiary">
                Membres de l&apos;espace ({workspaceMembers.length})
              </span>
              <div className="border border-border rounded-lg bg-bg-surface/50 divide-y divide-border overflow-hidden max-h-[220px] overflow-y-auto">
                {workspaceMembers.length === 0 ? (
                  <span className="block p-4 text-sm text-text-tertiary text-center">
                    Chargement des membres...
                  </span>
                ) : (
                  workspaceMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {member.email}
                        </span>
                        <span className="text-[10px] text-text-tertiary uppercase font-semibold">
                          {member.role}
                        </span>
                      </div>
                      
                      {/* Bouton de retrait (pas pour le créateur ou si local-user) */}
                      {member.user_id !== currentUser?.id && member.user_id !== 'local-user' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-xs text-danger hover:underline font-semibold"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsManagingMembers(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Composants helpers
function StatCard({
  label,
  value,
  icon,
  color = "text-text-secondary",
  active = false,
  onClick
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-5 transition text-left w-full ${
        active
          ? 'border-accent bg-accent/5'
          : 'border-border bg-bg-surface hover:border-border-strong hover:shadow-sm'
      }`}
    >
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl text-text-primary">{value}</div>
    </button>
  );
}

function FormCard({ form }: { form: Form }) {
  return (
    <Link
      href={`/forms/${form.id}`}
      className="group block rounded-lg border border-border bg-bg-surface p-5 transition hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-display text-lg text-text-primary leading-tight group-hover:text-accent transition">
          {form.title}
        </div>
        <StatusBadge status={form.status} />
      </div>

      {form.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {form.description}
        </p>
      )}

      <div className="papyrus-meta text-xs text-text-tertiary space-y-1">
        <div>
          Mis à jour {new Date(form.updated_at).toLocaleDateString('fr-FR')}
        </div>
        <div>
          {form.fields?.length ?? 0} champ{(form.fields?.length ?? 0) > 1 ? 's' : ''}
          {form.status === 'published' && ' · Ouvert aux réponses'}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="published">Publié</Badge>;
  if (status === 'closed') return <Badge variant="closed">Clos</Badge>;
  return <Badge variant="draft">Brouillon</Badge>;
}

function EmptyState({
  hasSearch,
  statusFilter,
  onNewForm,
  onClearSearch,
  onClearFilter
}: {
  hasSearch: boolean;
  statusFilter: FilterStatus;
  onNewForm: () => void;
  onClearSearch: () => void;
  onClearFilter: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <Search className="mx-auto h-10 w-10 text-text-tertiary" />
        <h3 className="mt-4 font-display text-xl text-text-primary">Aucun résultat</h3>
        <p className="papyrus-meta mt-1 text-sm">i. Aucun formulaire ne correspond à votre recherche</p>
        <Button variant="secondary" className="mt-5" onClick={onClearSearch}>
          Effacer la recherche
        </Button>
      </div>
    );
  }

  if (statusFilter !== 'all') {
    const filterLabels = {
      published: 'publié',
      draft: 'brouillon',
      closed: 'clos'
    };

    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <Filter className="mx-auto h-10 w-10 text-text-tertiary" />
        <h3 className="mt-4 font-display text-xl text-text-primary">Aucun formulaire {filterLabels[statusFilter]}</h3>
        <p className="papyrus-meta mt-1 text-sm">i. Aucun formulaire avec ce statut dans cet espace</p>
        <Button variant="secondary" className="mt-5" onClick={onClearFilter}>
          Voir tous les formulaires
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
      <FileText className="mx-auto h-10 w-10 text-text-tertiary" />
      <h3 className="mt-4 font-display text-xl text-text-primary">Aucun formulaire</h3>
      <p className="papyrus-meta mt-1 text-sm">i. Cet espace de travail ne contient aucun formulaire</p>
      <Button variant="cta" className="mt-5" iconLeft={<Plus className="h-4 w-4" />} onClick={onNewForm}>
        Créer le premier formulaire
      </Button>
    </div>
  );
}
