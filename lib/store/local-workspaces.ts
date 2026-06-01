'use client';

import type { Workspace, WorkspaceMember, WorkspaceRole, Form } from '@/types';
import { listForms, updateForm } from './local-forms';

const WORKSPACE_KEY = 'papyrus_workspaces';
const MEMBER_KEY = 'papyrus_workspace_members';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readWorkspaces(): Workspace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWorkspaces(data: Workspace[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('papyrus:workspaces-changed'));
}

function readMembers(): WorkspaceMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MEMBER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeMembers(data: WorkspaceMember[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MEMBER_KEY, JSON.stringify(data));
}

// ============================================================================
// Workspaces
// ============================================================================

export function getWorkspaces(userId?: string): Workspace[] {
  // TODO: Supabase — remplacer par requête Supabase
  const workspaces = readWorkspaces();
  const allMembers = readMembers();
  const allForms = listForms();

  const filtered = userId
    ? workspaces.filter(w => w.created_by === userId)
    : workspaces;

  return filtered
    .map(ws => ({
      ...ws,
      members: allMembers.filter(m => m.workspace_id === ws.id),
      form_count: allForms.filter(f => f.workspace_id === ws.id).length
    }))
    .sort((a, b) => {
      // Personal workspaces first, then by created_at
      if (a.scope === 'personal' && b.scope !== 'personal') return -1;
      if (a.scope !== 'personal' && b.scope === 'personal') return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

export function getWorkspace(id: string): Workspace | null {
  // TODO: Supabase — remplacer par requête Supabase
  const workspaces = readWorkspaces();
  const ws = workspaces.find(w => w.id === id);
  if (!ws) return null;

  const allMembers = readMembers();
  const allForms = listForms();

  return {
    ...ws,
    members: allMembers.filter(m => m.workspace_id === ws.id),
    form_count: allForms.filter(f => f.workspace_id === ws.id).length
  };
}

export function createWorkspace(data: Omit<Workspace, 'id' | 'created_at'>): Workspace {
  // TODO: Supabase — remplacer par requête Supabase
  const id = uuid();
  const created_at = new Date().toISOString();
  const newWs: Workspace = {
    id,
    created_at,
    ...data
  };

  const workspaces = readWorkspaces();
  workspaces.push(newWs);
  writeWorkspaces(workspaces);

  // Ajouter automatiquement le créateur comme owner
  addMember({
    user_id: data.created_by,
    workspace_id: id,
    role: 'owner',
    name: 'Utilisateur local',
    email: 'local@papyrus.dev'
  });

  return newWs;
}

export function updateWorkspace(id: string, data: Partial<Workspace>): Workspace {
  // TODO: Supabase — remplacer par requête Supabase
  const workspaces = readWorkspaces();
  const idx = workspaces.findIndex(w => w.id === id);
  if (idx === -1) throw new Error('Workspace introuvable');

  const updated = { ...workspaces[idx], ...data };
  workspaces[idx] = updated;
  writeWorkspaces(workspaces);

  return updated;
}

export function deleteWorkspace(id: string): void {
  // TODO: Supabase — remplacer par requête Supabase
  const workspaces = readWorkspaces().filter(w => w.id !== id);
  writeWorkspaces(workspaces);

  // Supprimer les membres du workspace
  const members = readMembers().filter(m => m.workspace_id !== id);
  writeMembers(members);

  // Dissocier les formulaires en vidant leur workspace_id
  const allForms = listForms();
  allForms.forEach(form => {
    if (form.workspace_id === id) {
      updateForm(form.id, { workspace_id: undefined });
    }
  });
}

// ============================================================================
// Init
// ============================================================================

export function initDefaultWorkspace(userId: string): void {
  // TODO: Supabase — remplacer par requête Supabase
  const workspaces = readWorkspaces();
  const userWorkspaces = workspaces.filter(w => w.created_by === userId);

  if (userWorkspaces.length === 0) {
    createWorkspace({
      name: 'Mon espace',
      scope: 'personal',
      is_deletable: false,
      created_by: userId
    });
  }
}

// ============================================================================
// Membres
// ============================================================================

export function getMembers(workspaceId: string): WorkspaceMember[] {
  // TODO: Supabase — remplacer par requête Supabase
  const allMembers = readMembers();
  return allMembers.filter(m => m.workspace_id === workspaceId);
}

export function addMember(member: Omit<WorkspaceMember, 'joined_at'>): WorkspaceMember {
  // TODO: Supabase — remplacer par requête Supabase
  const newMember: WorkspaceMember = {
    ...member,
    joined_at: new Date().toISOString()
  };

  const members = readMembers();
  
  // Éviter les doublons
  const exists = members.some(m => m.workspace_id === member.workspace_id && m.user_id === member.user_id);
  if (!exists) {
    members.push(newMember);
    writeMembers(members);
  }
  
  return newMember;
}

export function updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): void {
  // TODO: Supabase — remplacer par requête Supabase
  const members = readMembers();
  const idx = members.findIndex(m => m.workspace_id === workspaceId && m.user_id === userId);
  if (idx !== -1) {
    members[idx].role = role;
    writeMembers(members);
  }
}

export function removeMember(workspaceId: string, userId: string): void {
  // TODO: Supabase — remplacer par requête Supabase
  const members = readMembers().filter(m => !(m.workspace_id === workspaceId && m.user_id === userId));
  writeMembers(members);
}

// ============================================================================
// Forms dans un workspace
// ============================================================================

export function getWorkspaceForms(workspaceId: string): Form[] {
  // TODO: Supabase — remplacer par requête Supabase
  const allForms = listForms();
  return allForms.filter(f => f.workspace_id === workspaceId);
}
