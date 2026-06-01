'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  UserMinus,
  UserPlus,
  Shield,
  Eye,
  FileText,
  Users,
  Settings2,
  Trash
} from 'lucide-react';
import type { Workspace, Form, WorkspaceMember, WorkspaceRole } from '@/types';
import {
  getWorkspace,
  getWorkspaceForms,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember
} from '@/lib/store/local-workspaces';
import { createForm, updateForm, deleteForm, cloneForm } from '@/lib/store';
import { FormCard } from '@/components/dashboard/FormCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type Tab = 'forms' | 'members' | 'settings';

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.id;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('forms');

  // Filtre statut formulaire
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'closed'>('all');

  // État d'invitation de membre
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');

  // Modal suppression de membre
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);

  // Modal suppression de workspace
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);

  // Débounce pour le renommage de workspace
  const [workspaceNameInput, setWorkspaceNameInput] = useState('');

  // Charger les données du workspace et des formulaires
  const loadWorkspaceData = () => {
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      toast.error('Espace de travail introuvable');
      router.push('/dashboard');
      return;
    }
    setWorkspace(ws);
    setWorkspaceNameInput(ws.name);

    const wsForms = getWorkspaceForms(workspaceId);
    setForms(wsForms);
  };

  useEffect(() => {
    loadWorkspaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Synchroniser l'onglet actif avec le paramètre d'URL s'il existe
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['forms', 'members', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Rôle de l'utilisateur actuel dans ce workspace
  const currentUserMember = workspace?.members?.find((m) => m.user_id === 'local-user');
  const currentUserRole: WorkspaceRole =
    currentUserMember?.role || (workspace?.scope === 'personal' ? 'owner' : 'admin');
  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Redirection silencieuse si accès restreint à l'onglet Paramètres
  useEffect(() => {
    if (activeTab === 'settings' && workspace && !isAdminOrOwner) {
      setActiveTab('forms');
      toast.error('Accès refusé. Réservé aux administrateurs.');
    }
  }, [activeTab, workspace, isAdminOrOwner]);

  // Effet pour sauvegarder automatiquement le nom du workspace (débounce 1s)
  useEffect(() => {
    if (!workspace || !workspaceNameInput.trim() || workspaceNameInput === workspace.name) return;

    const timer = setTimeout(() => {
      updateWorkspace(workspace.id, { name: workspaceNameInput.trim() });
      toast.success('Nom enregistré avec succès !');
      // Déclencher un événement pour rafraîchir la sidebar
      window.dispatchEvent(new CustomEvent('papyrus:workspaces-changed'));
      
      // Mettre à jour l'état local du workspace pour refléter le changement de nom
      setWorkspace((prev) => (prev ? { ...prev, name: workspaceNameInput.trim() } : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [workspaceNameInput, workspace]);

  if (!workspace) return null;

  // Actions formulaires
  const handleCreateForm = async () => {
    try {
      const newForm = await createForm('Nouveau formulaire');
      await updateForm(newForm.id, { workspace_id: workspace.id });
      toast.success('Formulaire créé !');
      router.push(`/forms/${newForm.id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
      toast.error('Erreur lors de la création du formulaire');
    }
  };

  const handleEditForm = (formId: string) => {
    router.push(`/forms/${formId}/edit`);
  };

  const handleDuplicateForm = async (formId: string) => {
    try {
      const cloned = await cloneForm(formId);
      if (cloned) {
        await updateForm(cloned.id, { workspace_id: workspace.id });
        loadWorkspaceData();
        toast.success('Formulaire dupliqué !');
      } else {
        toast.error('Erreur lors de la duplication');
      }
    } catch (error) {
      console.error('Failed to duplicate form:', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      await deleteForm(formId);
      loadWorkspaceData();
      toast.success('Formulaire supprimé.');
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Actions membres
  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    try {
      // TODO: Supabase — envoyer invitation réelle via Resend
      addMember({
        user_id: `user-${Date.now()}`,
        workspace_id: workspace.id,
        role: inviteRole,
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase()
      });

      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      loadWorkspaceData();
      toast.success(`Invitation simulée pour ${inviteEmail} !`);
    } catch (err) {
      toast.error("Erreur lors de l'invitation");
    }
  };

  const handleUpdateRole = (userId: string, role: WorkspaceRole) => {
    try {
      updateMemberRole(workspace.id, userId, role);
      loadWorkspaceData();
      toast.success('Rôle mis à jour avec succès');
    } catch (err) {
      toast.error('Erreur lors du changement de rôle');
    }
  };

  const handleRemoveMemberConfirm = () => {
    if (!memberToRemove) return;

    try {
      removeMember(workspace.id, memberToRemove.user_id);
      setMemberToRemove(null);
      loadWorkspaceData();
      toast.success('Collaborateur retiré.');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Actions Workspace Paramètres
  const handleDeleteWorkspace = () => {
    try {
      deleteWorkspace(workspace.id);
      setShowDeleteWorkspaceModal(false);
      toast.success('Workspace supprimé avec succès.');
      router.push('/dashboard');
    } catch (err) {
      toast.error('Erreur lors de la suppression du workspace');
    }
  };

  // Filtrer les formulaires
  const filteredForms = forms.filter((f) => {
    if (statusFilter === 'all') return true;
    return f.status === statusFilter;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Workspace Header Info */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-text-tertiary text-xs font-semibold uppercase tracking-wider">
            {workspace.scope === 'personal' ? (
              <Users className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            <span>Espace {workspace.scope === 'personal' ? 'Personnel' : 'Équipe'}</span>
          </div>
          <h1 className="font-display text-3xl font-bold mt-1 text-text-primary">
            {workspace.name}
          </h1>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 border-b border-transparent md:border-none">
          <button
            onClick={() => setActiveTab('forms')}
            className={cn(
              'px-4 py-2 text-xs font-medium rounded-lg transition-all',
              activeTab === 'forms'
                ? 'bg-mooove-navy text-mooove-ice'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            )}
          >
            Formulaires ({forms.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'px-4 py-2 text-xs font-medium rounded-lg transition-all',
              activeTab === 'members'
                ? 'bg-mooove-navy text-mooove-ice'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            )}
          >
            Membres ({workspace.members?.length || 0})
          </button>
          {isAdminOrOwner && (
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-lg transition-all',
                activeTab === 'settings'
                  ? 'bg-mooove-navy text-mooove-ice'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              Paramètres
            </button>
          )}
        </div>
      </div>

      {/* ==================== TAB: FORMS ==================== */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Pill Filters */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'draft', label: 'Brouillons' },
                { key: 'published', label: 'Publiés' },
                { key: 'closed', label: 'Clos' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as any)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full border transition',
                    statusFilter === filter.key
                      ? 'border-mooove-navy bg-mooove-navy text-white'
                      : 'border-border text-text-secondary hover:border-border-strong hover:text-text-primary'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Create button */}
            <Button
              onClick={handleCreateForm}
              variant="primary"
              size="sm"
              iconLeft={<Plus className="h-4 w-4" />}
            >
              Nouveau formulaire
            </Button>
          </div>

          {filteredForms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onEdit={handleEditForm}
                  onDuplicate={handleDuplicateForm}
                  onDelete={handleDeleteForm}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-2xl bg-bg-surface text-center">
              <FileText className="h-10 w-10 text-text-tertiary mb-3 animate-pulse" />
              <h3 className="font-display text-lg font-bold text-text-primary">
                Aucun formulaire trouvé
              </h3>
              <p className="text-xs text-text-tertiary mt-1 max-w-sm">
                Commencez par créer votre premier formulaire interactif et récoltez de superbes réponses.
              </p>
              <Button
                onClick={handleCreateForm}
                variant="primary"
                size="sm"
                className="mt-4"
                iconLeft={<Plus className="h-4 w-4" />}
              >
                Créer un formulaire
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: MEMBERS ==================== */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold border-b border-border pb-3 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-text-secondary" />
              Collaborateurs de l'espace
            </h3>

            {/* Tableau des membres */}
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-elevated/40 text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    {isAdminOrOwner && <th className="px-4 py-3 w-16" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {workspace.members?.map((member) => {
                    const isSelf = member.user_id === 'local-user';
                    const isMemberOwner = member.role === 'owner';

                    return (
                      <tr key={member.user_id} className={cn('hover:bg-bg-elevated/20 transition', isSelf && 'bg-accent-cta/5')}>
                        <td className="px-4 py-3.5 font-medium text-text-primary flex items-center gap-2">
                          <span className="truncate">{member.name || 'Invitations en attente'}</span>
                          {isSelf && (
                            <span className="bg-mooove-navy text-mooove-ice text-[9px] font-bold px-1.5 py-0.2 rounded">
                              Vous
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-text-secondary truncate">{member.email}</td>
                        <td className="px-4 py-3.5">
                          {isAdminOrOwner && !isMemberOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.user_id, e.target.value as WorkspaceRole)}
                              className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                            >
                              <option value="admin">Administrateur</option>
                              <option value="member">Collaborateur</option>
                              <option value="viewer">Lecteur</option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium capitalize text-text-secondary">
                              {isMemberOwner ? (
                                <Shield className="h-3 w-3 text-accent" />
                              ) : (
                                <Eye className="h-3 w-3 text-text-tertiary" />
                              )}
                              {member.role === 'owner'
                                ? 'Propriétaire'
                                : member.role === 'admin'
                                ? 'Administrateur'
                                : member.role === 'member'
                                ? 'Collaborateur'
                                : 'Lecteur'}
                            </span>
                          )}
                        </td>
                        {isAdminOrOwner && (
                          <td className="px-4 py-3.5 text-right">
                            {!isMemberOwner && !isSelf && (
                              <button
                                onClick={() => setMemberToRemove(member)}
                                className="p-1 rounded text-text-tertiary hover:text-danger transition hover:bg-danger/5"
                                aria-label="Retirer le collaborateur"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Formulaire d'invitation si Admin ou Owner */}
            {isAdminOrOwner ? (
              <form onSubmit={handleInviteMember} className="mt-8 pt-6 border-t border-border space-y-4">
                <h4 className="font-display text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Inviter un collaborateur
                </h4>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      type="text"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Nom complet"
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Adresse email"
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                      className="w-full h-10 px-3 bg-bg-surface border border-border-strong rounded-md text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="admin">Administrateur</option>
                      <option value="member">Collaborateur</option>
                      <option value="viewer">Lecteur</option>
                    </select>
                  </div>
                  <Button type="submit" variant="cta" size="md" className="shrink-0 text-xs font-semibold">
                    Inviter
                  </Button>
                </div>
                <p className="text-[10px] text-text-tertiary leading-normal">
                  * TODO: Supabase — en production, cela enverra une invitation par email via Resend avec un lien de raccordement d'espace.
                </p>
              </form>
            ) : (
              <div className="mt-6 text-center py-2 text-text-tertiary">
                Contactez un admin pour modifier les accès de cet espace.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB: SETTINGS ==================== */}
      {activeTab === 'settings' && isAdminOrOwner && (
        <div className="space-y-6">
          {/* Général */}
          <div className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-bold border-b border-border pb-3 mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-text-secondary" />
              Général
            </h3>
            
            <div className="max-w-md">
              <Input
                label="Nom du workspace"
                value={workspaceNameInput}
                onChange={(e) => setWorkspaceNameInput(e.target.value)}
                placeholder="Mon espace"
                maxLength={50}
              />
              <p className="text-[10px] text-text-tertiary mt-2">
                * Enregistrement automatique en direct (debounce 1s).
              </p>
            </div>
          </div>

          {/* Zone Danger */}
          {workspace.is_deletable && (
            <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 shadow-sm space-y-4">
              <h3 className="font-display text-lg font-bold border-b border-danger/10 pb-3 mb-4 text-danger flex items-center gap-2">
                <Trash className="h-5 w-5" />
                Zone de Danger
              </h3>
              
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Supprimer ce workspace</h4>
                <p className="text-xs text-text-secondary mt-1">
                  La suppression de cet espace de travail entraînera la dissociation de tous les formulaires associés. Ils ne seront pas supprimés, mais ne figureront plus dans cet espace.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setShowDeleteWorkspaceModal(true)}
                  variant="danger"
                  size="sm"
                  className="font-semibold text-xs"
                >
                  Supprimer ce workspace
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Deletion Confirm Member */}
      {memberToRemove && (
        <Modal
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          title="Retirer un collaborateur"
        >
          <div className="space-y-4">
            <p>
              Êtes-vous sûr de vouloir retirer{' '}
              <strong className="text-text-primary">{memberToRemove.name || memberToRemove.email}</strong>{' '}
              de cet espace de travail ?
            </p>
            <p className="text-xs text-text-tertiary">
              Cette personne n'aura plus accès aux formulaires ni à la configuration de ce workspace.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMemberToRemove(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemoveMemberConfirm}
              >
                Retirer le collaborateur
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Deletion Confirm Workspace */}
      {showDeleteWorkspaceModal && (
        <Modal
          isOpen={showDeleteWorkspaceModal}
          onClose={() => setShowDeleteWorkspaceModal(false)}
          title="Supprimer définitivement le workspace"
        >
          <div className="space-y-4">
            <p>
              Êtes-vous sûr de vouloir supprimer définitivement le workspace{' '}
              <strong className="text-text-primary">« {workspace.name} »</strong> ?
            </p>
            <p className="text-xs text-text-tertiary font-medium">
              Cette action est irréversible. Tous les formulaires de ce workspace seront dissociés (replacés hors workspace).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteWorkspaceModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteWorkspace}
              >
                Supprimer définitivement (danger)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
