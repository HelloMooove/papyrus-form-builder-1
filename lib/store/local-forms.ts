'use client';

import type { Field, Form, FormStatus, MultilingualText } from '@/types';
import { uniqueSlug } from '@/lib/utils';

const STORAGE_KEY = 'papyrus.forms.v1';

function uuid(): string {
  // crypto.randomUUID dispo dans tous les navigateurs modernes
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyMultilingual(value = ''): MultilingualText {
  return { fr: value };
}

/** Nettoie les champs obsolètes (banner, logo) qui ont été refactorisés vers FormHeader */
function cleanObsoleteFields(form: Form): Form {
  if (!form.fields) return form;
  const cleanedFields = form.fields
    .filter((field) => (field.type as string) !== 'banner' && (field.type as string) !== 'logo')
    .map((field, index) => ({ ...field, field_order: index }));

  return { ...form, fields: cleanedFields };
}

function readAll(): Form[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Form[];
    return Array.isArray(parsed) ? parsed.map(cleanObsoleteFields) : [];
  } catch {
    return [];
  }
}

function writeAll(forms: Form[]): void {
  if (typeof window === 'undefined') return;
  // Nettoie les champs obsolètes avant de sauvegarder
  const cleanedForms = forms.map(cleanObsoleteFields);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedForms));
  // Notifie les autres onglets / hooks
  window.dispatchEvent(new CustomEvent('papyrus:forms-changed'));
}

/** Liste tous les formulaires triés par updated_at desc. */
export function listForms(): Form[] {
  return readAll().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getForm(id: string): Form | null {
  return readAll().find((f) => f.id === id) ?? null;
}

export function createForm(title = 'Nouveau formulaire', workspace_id?: string): Form {
  const now = new Date().toISOString();
  const form: Form = {
    id: uuid(),
    team_id: 'local',
    workspace_id,
    created_by: 'local-user',
    title,
    slug: uniqueSlug(title),
    description: '',
    display_mode: 'sections',
    status: 'draft',
    is_template: false,
    template_origin_id: null,
    theme: {
      bg: '#F7F0DC',
      accent: '#052139',
      font: 'Aktiv Grotesk',
      banner_url: null,
      dark_mode: false
    },
    access_type: 'public',
    languages: ['fr'],
    default_language: 'fr',
    fields: [],
    logic_rules: [],
    save_and_resume: true,
    unique_email: true,
    published_at: null,
    closes_at: null,
    created_at: now,
    updated_at: now
  };

  const all = readAll();
  all.push(form);
  writeAll(all);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('papyrus:form-created'));
  }
  return form;
}

export function updateForm(id: string, patch: Partial<Form>): Form | null {
  const all = readAll();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function deleteForm(id: string): void {
  const all = readAll().filter((f) => f.id !== id);
  writeAll(all);
}

/** Ajoute un champ à un formulaire et renvoie le formulaire à jour. */
export function addField(
  formId: string,
  type: Field['type'],
  label = 'Nouvelle question',
  customField?: Field
): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const fields = form.fields ?? [];
  const newField: Field = customField
    ? { ...customField, form_id: formId, field_order: fields.length }
    : {
        id: uuid(),
        form_id: formId,
        type,
        label: emptyMultilingual(label),
        description: emptyMultilingual(''),
        placeholder: emptyMultilingual(''),
        options:
          type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown'
            ? [
                { id: uuid(), label: emptyMultilingual('') },
                { id: uuid(), label: emptyMultilingual('') }
              ]
            : type === 'matrix'
              ? [
                  { id: uuid(), label: emptyMultilingual('Pas du tout') },
                  { id: uuid(), label: emptyMultilingual('Plutôt non') },
                  { id: uuid(), label: emptyMultilingual('Neutre') },
                  { id: uuid(), label: emptyMultilingual('Plutôt oui') },
                  { id: uuid(), label: emptyMultilingual('Tout à fait') }
                ]
              : [],
        rows:
          type === 'matrix'
            ? [
                { id: uuid(), label: emptyMultilingual('Critère 1') },
                { id: uuid(), label: emptyMultilingual('Critère 2') },
                { id: uuid(), label: emptyMultilingual('Critère 3') }
              ]
            : undefined,
        required: false,
        field_order: fields.length,
        validation: type === 'matrix' ? { matrix_mode: 'single' } : {}
      };
  return updateForm(formId, { fields: [...fields, newField] });
}

export function updateField(formId: string, fieldId: string, patch: Partial<Field>): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const fields = (form.fields ?? []).map((f) => (f.id === fieldId ? { ...f, ...patch } : f));
  return updateForm(formId, { fields });
}

export function deleteField(formId: string, fieldId: string): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const fields = (form.fields ?? []).filter((f) => f.id !== fieldId).map((f, i) => ({
    ...f,
    field_order: i
  }));
  return updateForm(formId, { fields });
}

/** Réordonne les champs selon la liste d'IDs fournie. */
export function reorderFields(formId: string, orderedIds: string[]): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const byId = new Map((form.fields ?? []).map((f) => [f.id, f]));
  const fields = orderedIds
    .map((id, i) => {
      const f = byId.get(id);
      return f ? { ...f, field_order: i } : null;
    })
    .filter((f): f is Field => f !== null);
  return updateForm(formId, { fields });
}

/** Duplique un champ et l'insère juste après l'original. Renvoie l'ID du nouveau champ. */
export function duplicateField(
  formId: string,
  fieldId: string,
  customField?: Field
): { form: Form; newFieldId: string } | null {
  const form = getForm(formId);
  if (!form) return null;
  const fields = form.fields ?? [];
  const idx = fields.findIndex((f) => f.id === fieldId);
  if (idx === -1) return null;

  const original = fields[idx];
  const newId = customField ? customField.id : uuid();
  const copy: Field = customField
    ? { ...customField, form_id: formId }
    : {
        ...original,
        id: newId,
        options: original.options.map((o) => ({ ...o, id: uuid() })),
        field_order: idx + 1
      };

  const next = [...fields];
  next.splice(idx + 1, 0, copy);
  const reindexed = next.map((f, i) => ({ ...f, field_order: i }));
  const updated = updateForm(formId, { fields: reindexed });
  return updated ? { form: updated, newFieldId: newId } : null;
}

/** Helper utilisé par OptionsEditor pour gérer les options d'un champ. */
export function newOptionId(): string {
  return uuid();
}

/**
 * Duplique un formulaire entier (nouveau ID, nouveau slug, statut brouillon).
 * Les champs sont copiés tels quels — pas besoin de remapper leurs IDs car ils restent
 * cohérents au sein du nouveau form.
 */
export function cloneForm(formId: string, workspace_id?: string): Form | null {
  const original = getForm(formId);
  if (!original) return null;
  const now = new Date().toISOString();
  const newId = uuid();
  const cloned: Form = {
    ...original,
    id: newId,
    workspace_id: workspace_id || original.workspace_id,
    title: `${original.title} (copie)`,
    slug: uniqueSlug(`${original.title}-copie`),
    status: 'draft',
    is_template: false,
    template_origin_id: original.id,
    scope: undefined,
    fields: (original.fields ?? []).map((f) => ({ ...f, form_id: newId })),
    created_at: now,
    updated_at: now,
    published_at: null,
    closes_at: null
  };
  const all = readAll();
  all.push(cloned);
  writeAll(all);
  return cloned;
}

/** Archive un formulaire — passe le statut à `closed`. Réversible via `unarchiveForm`. */
export function archiveForm(formId: string): Form | null {
  return updateForm(formId, { status: 'closed' });
}

/** Désarchive — repasse en brouillon. */
export function unarchiveForm(formId: string): Form | null {
  return updateForm(formId, { status: 'draft' });
}

/**
 * Marque un formulaire comme modèle, ou l'inverse. Si on l'élève au scope `workspace`,
 * il deviendra visible par toute l'équipe (en local : tout le monde sur cette machine).
 */
export function setAsTemplate(
  formId: string,
  isTemplate: boolean,
  scope: 'personal' | 'workspace' = 'personal'
): Form | null {
  return updateForm(formId, {
    is_template: isTemplate,
    scope: isTemplate ? scope : undefined
  });
}

// ============================================================================
// Logic rules (conditional display)
// ============================================================================

import type { LogicRule } from '@/types';

export function listLogicRules(formId: string, sourceFieldId?: string): LogicRule[] {
  const form = getForm(formId);
  if (!form) return [];
  const rules = form.logic_rules ?? [];
  return sourceFieldId ? rules.filter((r) => r.source_field_id === sourceFieldId) : rules;
}

export function addLogicRule(
  formId: string,
  rule: Omit<LogicRule, 'id' | 'form_id'>
): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const newRule: LogicRule = {
    ...rule,
    id: uuid(),
    form_id: formId
  };
  return updateForm(formId, { logic_rules: [...(form.logic_rules ?? []), newRule] });
}

export function updateLogicRule(
  formId: string,
  ruleId: string,
  patch: Partial<LogicRule>
): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const next = (form.logic_rules ?? []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r));
  return updateForm(formId, { logic_rules: next });
}

export function deleteLogicRule(formId: string, ruleId: string): Form | null {
  const form = getForm(formId);
  if (!form) return null;
  const next = (form.logic_rules ?? []).filter((r) => r.id !== ruleId);
  return updateForm(formId, { logic_rules: next });
}

// ============================================================================
// Workspaces (Teams) & Member Management Mock
// ============================================================================

export function createTeam(name: string): any {
  const team = {
    id: `local-team-${Date.now()}`,
    name,
    plan: 'free',
    created_at: new Date().toISOString()
  };
  // Définir le cookie actif sur le client
  if (typeof document !== 'undefined') {
    document.cookie = `papyrus:active-team-id=${team.id}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return team;
}

export function updateTeamName(teamId: string, name: string): void {
  // Mock
}

export function listTeamMembers(teamId: string): any[] {
  return [
    {
      user_id: 'local-user',
      role: 'admin',
      joined_at: new Date().toISOString(),
      email: 'local@papyrus.dev'
    }
  ];
}

export function addTeamMember(teamId: string, email: string, role: 'admin' | 'member' | 'reader' = 'member'): void {
  // Mock
}

export function updateTeamMemberRole(teamId: string, userId: string, role: 'admin' | 'member' | 'reader'): void {
  // Mock
}

export function deleteTeamMember(teamId: string, userId: string): void {
  // Mock
}
