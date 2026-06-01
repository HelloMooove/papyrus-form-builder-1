'use client';

import type { Field, Form, FormScope, MultilingualText } from '@/types';
import { MOOOOVE_TEMPLATES } from '@/lib/templates/seeds';
import { createForm, updateForm } from './index';

/**
 * Récupère tous les modèles disponibles, regroupés par scope.
 * - `global` : modèles officiels Mooove (en dur, voir lib/templates/seeds.ts)
 * - `workspace` : modèles partagés au sein de mon équipe (Forms is_template + scope workspace)
 * - `personal` : modèles que j'ai créés moi-même (Forms is_template + scope personal)
 *
 * En mode local, "mon équipe" = un seul workspace par défaut. Tous les Forms locaux
 * avec scope=workspace appartiennent à ce workspace.
 */
export function listTemplatesByScope(localForms: Form[]): Record<FormScope, Form[]> {
  const personal: Form[] = [];
  const workspace: Form[] = [];
  for (const f of localForms) {
    if (!f.is_template) continue;
    if (f.scope === 'workspace') workspace.push(f);
    else personal.push(f); // par défaut, un modèle local est personnel
  }
  return {
    global: MOOOOVE_TEMPLATES,
    workspace,
    personal
  };
}

/** Renvoie un modèle par son id, qu'il soit local ou Mooove. */
export function getTemplate(id: string, localForms: Form[]): Form | null {
  const fromLocal = localForms.find((f) => f.id === id && f.is_template);
  if (fromLocal) return fromLocal;
  return MOOOOVE_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Clone un modèle dans les formulaires personnels de l'utilisateur. Nouveaux IDs
 * pour le form et tous ses champs (options, sous-champs). Le clone démarre en brouillon
 * non-template.
 */
export async function cloneTemplate(template: Form): Promise<Form> {
  // 1. Crée un form vide avec un titre dérivé du modèle
  const fresh = await createForm(template.title);

  // 2. Remappe tous les IDs des champs et de leurs options / sous-champs
  const newFields: Field[] = (template.fields ?? []).map((f) => remapField(f, fresh.id));

  // 3. Copie le theme et les réglages du modèle (mais reste en brouillon, scope perso)
  const updated = await updateForm(fresh.id, {
    title: template.title,
    description: template.description,
    display_mode: template.display_mode,
    theme: { ...template.theme },
    access_type: template.access_type,
    languages: template.languages,
    default_language: template.default_language,
    fields: newFields,
    logic_rules: [],
    save_and_resume: template.save_and_resume ?? true,
    unique_email: template.unique_email ?? true,
    is_template: false,
    scope: undefined,
    template_origin_id: template.id,
    status: 'draft'
  });

  return updated ?? fresh;
}

function remapField(field: Field, newFormId: string): Field {
  const newId = randomId();
  return {
    ...field,
    id: newId,
    form_id: newFormId,
    label: cloneML(field.label),
    description: cloneML(field.description),
    placeholder: cloneML(field.placeholder),
    options: (field.options ?? []).map((o) => ({
      id: randomId(),
      label: cloneML(o.label),
      value: o.value
    })),
    rows: field.rows?.map((r) => ({
      id: randomId(),
      label: cloneML(r.label),
      value: r.value
    })),
    subfields: field.subfields?.map((sf) => ({
      ...sf,
      id: randomId(),
      label: cloneML(sf.label),
      description: cloneML(sf.description),
      placeholder: cloneML(sf.placeholder),
      options: (sf.options ?? []).map((o) => ({
        id: randomId(),
        label: cloneML(o.label),
        value: o.value
      })),
      rows: sf.rows?.map((r) => ({
        id: randomId(),
        label: cloneML(r.label),
        value: r.value
      }))
    }))
  };
}

function cloneML(m: MultilingualText): MultilingualText {
  return { ...m };
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
