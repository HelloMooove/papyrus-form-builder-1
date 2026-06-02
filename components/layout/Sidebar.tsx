'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Settings,
  CreditCard,
  Folder,
  Users,
  User,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  LogOut,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  initDefaultWorkspace,
  getWorkspaceForms
} from '@/lib/store/local-workspaces';
import type { Workspace, Form } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { createForm, createTeam, updateTeamName } from '@/lib/store';

interface Props {
  teamName?: string;
  userEmail?: string;
  activeTeam?: { id: string; name: string; plan: string };
  allTeams?: { id: string; name: string; plan: string }[];
}

export function Sidebar({ teamName, userEmail, activeTeam, allTeams }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWorkspaceId = searchParams.get('workspace');
  const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

  // Liste des espaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  // État d'ouverture accordéon par workspace ID
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  
  // Création workspace inline
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Rénommage workspace inline
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Dropdown menu d'options de workspace actif
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [workspaceDropdownPosition, setWorkspaceDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const workspaceMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Suppression modal
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);

  // Modal de gestion des membres
  const [managingWorkspace, setManagingWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // Menu contextuel formulaire actif
  const [activeFormMenuId, setActiveFormMenuId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const formMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Liste de tous les formulaires Supabase pour filtrage par équipe en mode non-local
  const [allForms, setAllForms] = useState<Form[]>([]);

  function loadWorkspaces(userId?: string) {
    let list: Workspace[] = [];
    if (isLocal) {
      list = getWorkspaces(userId);
    } else {
      list = (allTeams || []).map((t) => ({
        id: t.id,
        name: t.name,
        scope: t.name === 'Mon espace' ? 'personal' : 'team',
        is_deletable: t.name !== 'Mon espace',
        created_by: userId || '',
        created_at: ''
      })).sort((a, b) => {
        if (a.name === 'Mon espace') return -1;
        if (b.name === 'Mon espace') return 1;
        return 0;
      });
    }
    setWorkspaces(list);
    
    // Ouvrir par défaut le premier workspace perso s'il n'y a aucun état d'ouverture
    if (Object.keys(openAccordions).length === 0 && list.length > 0) {
      setOpenAccordions({ [list[0].id]: true });
    }
  }

  // Charger les espaces et initialiser le défaut au montage
  useEffect(() => {
    async function initWorkspaces() {
      let userId = 'local-user';
      if (isLocal) {
        initDefaultWorkspace('local-user');
      } else {
        // Mode Supabase : récupérer l'ID utilisateur et initialiser le workspace
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          initDefaultWorkspace(user.id);
        }
      }
      loadWorkspaces(userId);
    }

    initWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, allTeams]);

  // Écouter les changements de workspaces localStorage
  useEffect(() => {
    const handleWorkspacesChanged = async () => {
      let userId = 'local-user';
      if (!isLocal) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      }
      loadWorkspaces(userId);
    };
    window.addEventListener('papyrus:workspaces-changed', handleWorkspacesChanged);
    return () => {
      window.removeEventListener('papyrus:workspaces-changed', handleWorkspacesChanged);
    };
  }, [isLocal]);

  // Charger tous les formulaires et recharger les workspaces en cas de changement
  useEffect(() => {
    async function loadAllForms() {
      if (!isLocal) {
        try {
          const { listForms } = await import('@/lib/store');
          const formsList = await listForms();
          setAllForms(formsList);
          // Émettre un événement personnalisé quand les formulaires sont chargées
          window.dispatchEvent(new CustomEvent('papyrus:forms-loaded'));
        } catch (err) {
          console.error("Failed to load forms in Sidebar:", err);
        }
      } else {
        // En mode local, recharger les workspaces pour mettre à jour les formulaires
        loadWorkspaces();
      }
    }
    loadAllForms();

    // Recharger sur évènement forms-changed
    const handleFormsChanged = () => {
      loadAllForms();
    };
    window.addEventListener('papyrus:forms-changed', handleFormsChanged);
    window.addEventListener('papyrus:form-created', handleFormsChanged);
    return () => {
      window.removeEventListener('papyrus:forms-changed', handleFormsChanged);
      window.removeEventListener('papyrus:form-created', handleFormsChanged);
    };
  }, [isLocal]);

  const toggleAccordion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      if (isLocal) {
        createWorkspace({
          name: newWorkspaceName.trim(),
          scope: 'team',
          is_deletable: true,
          created_by: 'local-user'
        });
      } else {
        await createTeam(newWorkspaceName.trim());
      }
      setNewWorkspaceName('');
      setIsCreating(false);
      
      if (!isLocal) {
        router.refresh();
      } else {
        loadWorkspaces();
      }
      toast.success('Workspace créé avec succès !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la création du workspace');
    }
  };

  const handleStartRename = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(ws.id);
    setRenameValue(ws.name);
    setActiveMenuId(null);
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !renamingId) return;

    try {
      if (isLocal) {
        updateWorkspace(renamingId, { name: renameValue.trim() });
        setRenamingId(null);
        loadWorkspaces();
      } else {
        const res = await fetch('/api/teams', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: renamingId, name: renameValue.trim() })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erreur lors du renommage');
        }
        setRenamingId(null);
        window.location.reload();
      }
      toast.success('Workspace renommé !');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteWorkspaceConfirm = async () => {
    if (!deletingWorkspace) return;

    try {
      if (isLocal) {
        deleteWorkspace(deletingWorkspace.id);
        setDeletingWorkspace(null);
        loadWorkspaces();
      } else {
        const res = await fetch('/api/teams', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: deletingWorkspace.id })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erreur lors de la suppression');
        }
        setDeletingWorkspace(null);
      }
      toast.success('Workspace supprimé.');
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };
  // Fonction pour charger les membres de l'équipe
  const loadMembers = async (workspaceId: string) => {
    try {
      if (isLocal) {
        const { getMembers } = await import('@/lib/store/local-workspaces');
        setWorkspaceMembers(getMembers(workspaceId));
      } else {
        const { listTeamMembers } = await import('@/lib/store');
        const list = await listTeamMembers(workspaceId);
        setWorkspaceMembers(list);
      }
    } catch (err) {
      console.error('Error loading workspace members:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !managingWorkspace) return;
    setMemberLoading(true);

    try {
      if (isLocal) {
        const { addMember } = await import('@/lib/store/local-workspaces');
        addMember({
          user_id: `user-${Date.now()}`,
          workspace_id: managingWorkspace.id,
          role: 'member',
          name: 'Nouveau membre',
          email: newMemberEmail.trim()
        });
      } else {
        const { addTeamMember } = await import('@/lib/store');
        await addTeamMember(managingWorkspace.id, newMemberEmail.trim(), 'member');
      }
      setNewMemberEmail('');
      await loadMembers(managingWorkspace.id);
      toast.success('Membre invité avec succès !');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'invitation");
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!managingWorkspace) return;
    if (confirm('Retirer ce membre de cet espace de travail ?')) {
      try {
        if (isLocal) {
          const { removeMember } = await import('@/lib/store/local-workspaces');
          removeMember(managingWorkspace.id, userId);
        } else {
          const { deleteTeamMember } = await import('@/lib/store');
          await deleteTeamMember(managingWorkspace.id, userId);
        }
        await loadMembers(managingWorkspace.id);
        toast.success('Membre retiré.');
      } catch (err) {
        console.error(err);
        toast.error('Erreur lors du retrait du membre');
      }
    }
  };

  // Positionnement du dropdown de workspace
  const handleOpenWorkspaceMenu = (wsId: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    const dropdownWidth = 160;

    let left = rect.left;
    const top = rect.bottom + 4;

    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }

    if (left < 16) {
      left = 16;
    }

    setWorkspaceDropdownPosition({ top, left });
    setActiveMenuId(wsId);
  };

  const handleCloseWorkspaceMenu = () => {
    setActiveMenuId(null);
    setWorkspaceDropdownPosition(null);
  };
  // Fonction pour ouvrir le dropdown du formulaire avec positionnement dynamique
  const handleOpenFormMenu = (formId: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    const dropdownWidth = 180; // Largeur minimum du dropdown

    let left = rect.left;
    const top = rect.bottom + 4;

    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }

    if (left < 16) {
      left = 16;
    }

    setDropdownPosition({ top, left });
    setActiveFormMenuId(formId);
  };

  const handleCloseFormMenu = () => {
    setActiveFormMenuId(null);
    setDropdownPosition(null);
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Navigation statique en bas de la sidebar
  const STATIC_NAV = [
    { href: '/templates', label: 'Modèles', icon: FileText },
    { href: '/settings', label: 'Paramètres', icon: Settings },
    { href: '/billing', label: 'Billing', icon: CreditCard, badge: 'Bientôt' }
  ];

  const currentUserEmail = userEmail || 'local@papyrus.dev';

  // État pour l'utilisateur Supabase
  const [currentUser, setCurrentUser] = useState<any>(null);







  // Récupérer l'utilisateur Supabase connecté
  // TODO: v0.2 Supabase — remplacer 'Utilisateur local' par le vrai email de l'utilisateur connecté (supabase.auth.getUser())
  useEffect(() => {
    async function getCurrentUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }

    getCurrentUser();
  }, []);

  // Fonction pour créer un nouveau formulaire dans un workspace spécifique
  const handleCreateFormInWorkspace = async (workspaceId: string) => {
    try {
      // Ouvrir l'accordion du workspace pour afficher le formulaire
      setOpenAccordions((prev) => ({ ...prev, [workspaceId]: true }));

      if (!isLocal) {
        document.cookie = `papyrus:active-team-id=${workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
      }
      const newForm = await createForm('Nouveau formulaire', workspaceId);

      router.push(`/forms/${newForm.id}/edit`);
    } catch (err) {
      console.error('Error creating form:', err);
      toast.error('Erreur lors de la création du formulaire');
    }
  };

  // Composant dropdown rendu dans un portail
  const FormDropdownMenu = ({ formId, onClose }: { formId: string; onClose: () => void }) => {
    if (!dropdownPosition) return null;

    return createPortal(
      <>
        {/* Overlay pour fermer le menu */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={onClose}
        />
        {/* Menu dropdown */}
        <div
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-border bg-bg-surface p-3 animate-in fade-in duration-100"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              router.push(`/forms/${formId}/edit`);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              // TODO: Implémenter rename
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              // TODO: Implémenter copy link
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Copy link to share
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              // TODO: Implémenter move to workspace
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Move to workspace
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              // TODO: Implémenter duplicate
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Duplicate
          </button>
          <div className="my-2 border-t border-border"></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              // TODO: Implémenter delete
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/5 transition font-semibold rounded"
          >
            Delete
          </button>
        </div>
      </>,
      document.body
    );
  };

  // Composant dropdown de workspace rendu dans un portail
  const WorkspaceDropdownMenu = ({ ws, onClose }: { ws: Workspace; onClose: () => void }) => {
    if (!workspaceDropdownPosition) return null;
    const isPersonal = ws.scope === 'personal';

    return createPortal(
      <>
        {/* Overlay pour fermer le menu */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={onClose}
        />
        {/* Menu dropdown */}
        <div
          className="fixed z-[9999] min-w-[160px] rounded-lg border border-border bg-bg-surface p-3 animate-in fade-in duration-100"
          style={{
            top: workspaceDropdownPosition.top,
            left: workspaceDropdownPosition.left,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              handleStartRename(ws, e);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
          >
            Renommer
          </button>
          {!isPersonal && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  setManagingWorkspace(ws);
                  loadMembers(ws.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition rounded"
              >
                Membres
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  setDeletingWorkspace(ws);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/5 transition font-semibold rounded"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </>,
      document.body
    );
  };

  return (
    <aside className="flex h-full w-96 flex-col border-r border-border bg-bg-surface select-none">
      {/* Logo Papyrus */}
      <div className="px-5 py-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none w-full"
        >
          {/* Carré P arrondi */}
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-mooove-navy text-white font-bold text-xl">
            P
          </div>
          {/* Textes */}
          <div className="flex flex-col">
            <div className="font-display text-2xl font-semibold text-text-primary leading-tight">
              Papyrus
            </div>
            <div className="font-body text-lg text-text-tertiary leading-tight">
              by Mooove
            </div>
          </div>
        </button>
      </div>

      {/* Workspace Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          <span className="block px-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-text-tertiary mb-2">
            Espaces de travail
          </span>

          <div className="space-y-1">
            {workspaces.map((ws) => {
              const isOpen = !!openAccordions[ws.id];
              const forms = isLocal
                ? getWorkspaceForms(ws.id)
                : allForms.filter((f) => f.team_id === ws.id);
              const hasForms = forms.length > 0;
              const displayedForms = forms.slice(0, 5);
              const hasMoreForms = forms.length > 5;
              const isPersonal = ws.scope === 'personal';

              return (
                <div key={ws.id} className="group relative rounded-md transition duration-150">
                  {/* Item ligne workspace */}
                  <div
                    onClick={(e) => {
                      if (renamingId === ws.id) return;
                      router.push(`/forms?workspace=${ws.id}`);
                    }}
                    className={cn(
                      'flex items-center justify-between w-full px-4 h-14 text-xl font-medium cursor-pointer rounded-md transition hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
                      pathname === '/forms' && activeWorkspaceId === ws.id && 'bg-bg-elevated text-text-primary font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isPersonal ? (
                        <User className="h-5 w-5 shrink-0 text-text-tertiary" />
                      ) : (
                        <Users className="h-5 w-5 shrink-0 text-text-tertiary" />
                      )}

                      {renamingId === ws.id ? (
                        <form
                          onSubmit={handleRenameWorkspace}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0"
                        >
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => setRenamingId(null)}
                            className="w-full px-1 py-0.5 border border-border bg-bg-surface rounded text-[11px] font-normal focus:outline-none focus:border-accent"
                            autoFocus
                          />
                        </form>
                      ) : (
                        <span className="truncate text-xl font-medium text-text-primary">{ws.name}</span>
                      )}
                    </div>

                    {/* Options / Accordion chevrons */}
                    <div className="flex items-center gap-1">
                      {/* Bouton options 3 points */}
                      {renamingId !== ws.id && !isPersonal && (
                        <div className="relative">
                          <button
                            ref={(el) => {
                              workspaceMenuButtonRefs.current[ws.id] = el;
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const buttonElement = e.currentTarget;
                              if (activeMenuId === ws.id) {
                                handleCloseWorkspaceMenu();
                              } else {
                                handleOpenWorkspaceMenu(ws.id, buttonElement);
                              }
                            }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-border text-text-tertiary hover:text-text-primary transition"
                            aria-label="Options de l'espace"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Accordion trigger */}
                      <button
                        onClick={(e) => toggleAccordion(ws.id, e)}
                        className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Dropdown Content */}
                  {isOpen && (
                    <div className="pl-4 pr-2 py-1 space-y-1 border-l border-border/60 ml-4 mt-0.5 mb-1 animate-in slide-in-from-top-1 duration-150 max-h-[280px] overflow-y-auto">
                      {hasForms ? (
                        <>
                          {displayedForms.map((form) => (
                            <div key={form.id} className="group relative">
                              <div className="flex items-center justify-between w-full">
                                <Link
                                  href={`/forms/${form.id}/edit`}
                                  className={cn(
                                    'flex items-center gap-2 h-12 px-5 text-xl text-text-secondary hover:text-text-primary rounded hover:bg-bg-elevated transition truncate flex-1',
                                    pathname === `/forms/${form.id}/edit` && 'text-text-primary font-medium'
                                  )}
                                >
                                  <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                                  <span className="truncate">{form.title || 'Formulaire sans titre'}</span>
                                </Link>

                                {/* Bouton menu contextuel */}
                                <button
                                  ref={(el) => {
                                    formMenuButtonRefs.current[form.id] = el;
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const buttonElement = e.currentTarget;
                                    if (activeFormMenuId === form.id) {
                                      handleCloseFormMenu();
                                    } else {
                                      handleOpenFormMenu(form.id, buttonElement);
                                    }
                                  }}
                                  className="p-2 rounded opacity-0 group-hover:opacity-100 hover:bg-border text-text-tertiary hover:text-text-primary transition"
                                  aria-label="Options du formulaire"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {hasMoreForms && (
                            <Link
                              href={`/workspaces/${ws.id}`}
                              className="block h-9 px-4 text-sm text-accent hover:underline font-medium flex items-center"
                            >
                              Voir tous ({forms.length}) →
                            </Link>
                          )}
                        </>
                      ) : (
                        <span className="block h-9 px-4 text-sm text-text-tertiary flex items-center">
                          Aucun formulaire encore
                        </span>
                      )}

                      {/* Bouton + Nouveau formulaire */}
                      <button
                        onClick={() => handleCreateFormInWorkspace(ws.id)}
                        className="flex items-center gap-2 h-12 px-5 text-xl text-mooove-cyan hover:bg-papyrus-border/20 rounded-md transition w-full text-left font-medium"
                      >
                        <Plus className="h-5 w-5 shrink-0" />
                        Nouveau formulaire
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inline Workspace Creation Input */}
        <div className="pt-1">
          {isCreating ? (
            <form onSubmit={handleCreateWorkspace} className="px-3 py-1">
              <input
                type="text"
                required
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Nom du workspace..."
                className="w-full h-8 px-2 text-[11px] border border-border bg-bg-surface rounded-md focus:border-accent focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-4 w-full text-left text-xl text-text-tertiary hover:text-text-primary transition font-medium"
            >
              <Plus className="h-5 w-5" />
              Nouveau workspace
            </button>
          )}
        </div>
      </div>

      {/* Static Sub-Navigation */}
      <div className="px-3 py-2 border-t border-border">
        {STATIC_NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-0.5 flex items-center justify-between rounded-md px-4 h-14 text-xl font-medium transition',
                active
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-text-tertiary" />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="bg-bg-elevated border border-border text-text-secondary text-[9px] font-semibold px-2 py-0.5 rounded-full select-none">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Circle User Profile bottom */}
      <div className="border-t border-border px-3 py-4 bg-bg-elevated/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Initial circle */}
            <div className="flex h-12 w-12 min-w-[48px] items-center justify-center rounded-full bg-mooove-navy text-mooove-ice font-bold font-display text-xl">
              {(isLocal ? 'LO' : (userEmail || currentUser?.email || 'U')).charAt(0).toUpperCase()}
            </div>
            {/* Info text */}
            <div className="flex flex-col leading-tight truncate">
              <span className="font-display text-xl font-medium text-text-primary truncate">
                {isLocal ? 'local@papyrus.dev' : (userEmail || currentUser?.email || 'Utilisateur')}
              </span>
            </div>
          </div>
          
          {!isLocal && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-bg-elevated text-text-tertiary hover:text-danger transition shrink-0"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal for Workspaces */}
      {deletingWorkspace && (
        <Modal
          isOpen={!!deletingWorkspace}
          onClose={() => setDeletingWorkspace(null)}
          title="Supprimer le workspace"
        >
          <div className="space-y-4">
            <p>
              Êtes-vous sûr de vouloir supprimer définitivement le workspace{' '}
              <strong className="text-text-primary">« {deletingWorkspace.name} »</strong> ?
            </p>
            <p className="text-xs text-text-tertiary font-medium">
              Cette action est irréversible. Tous les formulaires associés à ce workspace seront dissociés (replacés hors workspace).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingWorkspace(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteWorkspaceConfirm}
              >
                Supprimer le workspace
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dropdown menu des formulaires rendu dans un portail */}
      {activeFormMenuId && (
        <FormDropdownMenu
          formId={activeFormMenuId}
          onClose={handleCloseFormMenu}
        />
      )}

      {/* Dropdown menu des workspaces rendu dans un portail */}
      {activeMenuId && workspaces.find(w => w.id === activeMenuId) && (
        <WorkspaceDropdownMenu
          ws={workspaces.find(w => w.id === activeMenuId)!}
          onClose={handleCloseWorkspaceMenu}
        />
      )}

      {/* Modal de Gestion des Membres du Workspace */}
      {managingWorkspace && (
        <Modal
          isOpen={!!managingWorkspace}
          onClose={() => setManagingWorkspace(null)}
          title={`Gérer les membres — ${managingWorkspace.name}`}
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
                Membres de l'espace ({workspaceMembers.length})
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
                onClick={() => setManagingWorkspace(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
}
