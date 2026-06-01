'use client';

import type { Field, Form, FormStatus, MultilingualText, LogicRule } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { uniqueSlug } from '@/lib/utils';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyMultilingual(value = ''): MultilingualText {
  return { fr: value };
}

async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('User not authenticated');
  return user;
}

function getActiveTeamId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^|;)\s*papyrus:active-team-id\s*=\s*([^;]+)/);
  return match ? match[2] : null;
}

/** Liste tous les formulaires triés par updated_at desc. */
export async function listForms(): Promise<Form[]> {
  const supabase = createClient();
  const user = await getCurrentUser();

  // 1. Lire d'abord le cookie actif
  const activeId = getActiveTeamId();
  let teamId = activeId;

  // Valider que l'ID de l'équipe active est un UUID valide et que l'utilisateur en est membre
  let isValidMember = false;
  if (teamId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (memberCheck) {
      isValidMember = true;
    }
  }

  if (!isValidMember) {
    // Récupérer le team_id réel de l'utilisateur depuis team_members
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching user team in listForms:', memberError);
    }

    teamId = membership?.team_id || user.id;
  }

  const { data: forms, error } = await supabase
    .from('forms')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching forms:', error);
    throw error;
  }

  // Pour chaque formulaire, récupérer les champs et règles (sans nested selects)
  const formsWithRelations = await Promise.all(
    (forms || []).map(async (form) => {
      const { data: fields = [] } = await supabase
        .from('fields')
        .select('*')
        .eq('form_id', form.id)
        .order('field_order', { ascending: true });

      const { data: logicRules = [] } = await supabase
        .from('logic_rules')
        .select('*')
        .eq('form_id', form.id)
        .order('rule_order', { ascending: true });

      return {
        ...form,
        fields,
        logic_rules: logicRules
      };
    })
  );

  return formsWithRelations;
}

export async function getForm(id: string): Promise<Form | null> {
  const supabase = createClient();

  // Récupérer le formulaire
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching form:', error);
    throw error;
  }

  if (!form) return null;

  // Récupérer les champs
  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .select('*')
    .eq('form_id', id)
    .order('field_order', { ascending: true });

  if (fieldsError) {
    console.error('Error fetching fields:', fieldsError);
  }

  // Récupérer les règles logiques
  const { data: logicRules, error: logicError } = await supabase
    .from('logic_rules')
    .select('*')
    .eq('form_id', id)
    .order('rule_order', { ascending: true });

  if (logicError) {
    console.error('Error fetching logic rules:', logicError);
  }

  return {
    ...form,
    fields: fields || [],
    logic_rules: logicRules || []
  };
}

export async function createForm(title = 'Nouveau formulaire'): Promise<Form> {
  const supabase = createClient();
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  // 1. Lire d'abord le cookie actif
  const activeId = getActiveTeamId();
  let teamId = activeId;

  // Valider que l'ID de l'équipe active est un UUID valide et que l'utilisateur en est membre
  let isValidMember = false;
  if (teamId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    const { data: memberCheck } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (memberCheck) {
      isValidMember = true;
    }
  }

  if (!isValidMember) {
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
      console.error('Error fetching user team:', memberError);
      throw memberError;
    }

    if (!membership) {
      console.error('No team membership found for user:', user.id);
      throw new Error(`No team found for user ${user.id}`);
    }
    teamId = membership.team_id;
  }

  const formData = {
    team_id: teamId,
    created_by: user.id,
    title,
    slug: uniqueSlug(title),
    description: '',
    display_mode: 'scroll' as const,
    status: 'draft' as const,
    is_template: false,
    template_origin_id: null,
    theme: {
      bg: '#F7F0DC',
      accent: '#052139',
      font: 'Aktiv Grotesk',
      banner_url: null,
      dark_mode: false
    },
    access_type: 'public' as const,
    languages: ['fr'],
    default_language: 'fr',
    published_at: null,
    closes_at: null,
    created_at: now,
    updated_at: now
  };

  const { data: form, error } = await supabase
    .from('forms')
    .insert(formData)
    .select()
    .single();

  if (error) throw error;

  return {
    ...form,
    fields: [],
    logic_rules: [],
    save_and_resume: true,
    unique_email: true
  };
}

export async function updateForm(id: string, patch: Partial<Form>): Promise<Form | null> {
  const supabase = createClient();

  // Séparer les champs, logic_rules et workspace_id (non présent dans la BDD Supabase) du reste des données
  const { fields, logic_rules, workspace_id, ...formPatch } = patch;

  // Mettre à jour le formulaire principal
  const { data: form, error: formError } = await supabase
    .from('forms')
    .update({
      ...formPatch,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (formError) {
    if (formError.code === 'PGRST116') return null;
    throw formError;
  }

  // Mettre à jour les champs si fournis
  if (fields) {
    // Supprimer les anciens champs
    await supabase.from('fields').delete().eq('form_id', id);

    // Insérer les nouveaux champs
    if (fields.length > 0) {
      const { error: fieldsError } = await supabase
        .from('fields')
        .insert(fields.map(field => ({
          ...field,
          form_id: id
        })));

      if (fieldsError) throw fieldsError;
    }
  }

  // Mettre à jour les logic_rules si fournies
  if (logic_rules) {
    // Supprimer les anciennes règles
    await supabase.from('logic_rules').delete().eq('form_id', id);

    // Insérer les nouvelles règles
    if (logic_rules.length > 0) {
      const { error: rulesError } = await supabase
        .from('logic_rules')
        .insert(logic_rules.map(rule => ({
          ...rule,
          form_id: id
        })));

      if (rulesError) throw rulesError;
    }
  }

  // Retourner le formulaire complet mis à jour
  return await getForm(id);
}

export async function deleteForm(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Ajoute un champ à un formulaire et renvoie le formulaire à jour. */
export async function addField(
  formId: string,
  type: Field['type'],
  label = 'Nouvelle question',
  customField?: Field
): Promise<Form | null> {
  const supabase = createClient();

  const form = await getForm(formId);
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

  // INSERT atomique d'un seul champ
  const { error } = await supabase
    .from('fields')
    .insert([newField]);

  if (error) throw error;

  // Mettre à jour le formulaire avec un nouveau timestamp
  await supabase
    .from('forms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', formId);

  // Retourner le formulaire à jour
  return await getForm(formId);
}

export async function updateField(formId: string, fieldId: string, patch: Partial<Field>): Promise<Form | null> {
  const supabase = createClient();

  // UPDATE atomique d'un seul champ
  const { error } = await supabase
    .from('fields')
    .update(patch)
    .eq('id', fieldId)
    .eq('form_id', formId);

  if (error) throw error;

  // Mettre à jour le formulaire avec un nouveau timestamp
  await supabase
    .from('forms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', formId);

  // Retourner le formulaire à jour
  return await getForm(formId);
}

export async function deleteField(formId: string, fieldId: string): Promise<Form | null> {
  const supabase = createClient();

  const form = await getForm(formId);
  if (!form) return null;

  const fields = form.fields ?? [];
  const nextFields = fields
    .filter((f) => f.id !== fieldId)
    .map((f, i) => ({ ...f, field_order: i }));

  // Supprimer le champ de la base
  await supabase.from('fields').delete().eq('id', fieldId);

  // Mettre à jour l'ordre de tous les autres champs
  if (nextFields.length > 0) {
    const { error: upsertError } = await supabase
      .from('fields')
      .upsert(nextFields.map(f => ({ ...f, form_id: formId })));
    if (upsertError) throw upsertError;
  }

  // Mettre à jour le timestamp du formulaire
  await supabase
    .from('forms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', formId);

  return await getForm(formId);
}

/** Réordonne les champs selon la liste d'IDs fournie. */
export async function reorderFields(formId: string, orderedIds: string[]): Promise<Form | null> {
  const supabase = createClient();

  // UPDATE atomique du field_order de chaque champ individuellement
  const updatePromises = orderedIds.map((fieldId, newOrder) =>
    supabase
      .from('fields')
      .update({ field_order: newOrder })
      .eq('id', fieldId)
      .eq('form_id', formId)
  );

  // Exécuter tous les updates en parallèle
  const results = await Promise.all(updatePromises);

  // Vérifier s'il y a des erreurs
  for (const result of results) {
    if (result.error) throw result.error;
  }

  // Mettre à jour le formulaire avec un nouveau timestamp
  await supabase
    .from('forms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', formId);

  // Retourner le formulaire à jour
  return await getForm(formId);
}

/** Duplique un champ et l'insère juste après l'original. Renvoie l'ID du nouveau champ. */
export async function duplicateField(
  formId: string,
  fieldId: string,
  customField?: Field
): Promise<{ form: Form; newFieldId: string } | null> {
  const supabase = createClient();

  const form = await getForm(formId);
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

  const nextFields = [...fields];
  nextFields.splice(idx + 1, 0, copy);
  
  // Re-indexer l'ordre de tous les champs
  const finalFields = nextFields.map((f, i) => ({ ...f, field_order: i }));

  // Insérer / mettre à jour tous les champs
  const { error: upsertError } = await supabase
    .from('fields')
    .upsert(finalFields.map(f => ({ ...f, form_id: formId })));

  if (upsertError) throw upsertError;

  // Mettre à jour le formulaire avec un nouveau timestamp
  await supabase
    .from('forms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', formId);

  const updated = await getForm(formId);
  return updated ? { form: updated, newFieldId: newId } : null;
}

/** Helper utilisé par OptionsEditor pour gérer les options d'un champ. */
export function newOptionId(): string {
  return uuid();
}

/**
 * Duplique un formulaire entier (nouveau ID, nouveau slug, statut brouillon).
 */
export async function cloneForm(formId: string): Promise<Form | null> {
  const original = await getForm(formId);
  if (!original) return null;

  const user = await getCurrentUser();
  const now = new Date().toISOString();
  const newId = uuid();
  const supabase = createClient();

  // Récupérer le team_id réel de l'utilisateur depuis team_members
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single();

  const teamId = membership?.team_id || user.id;

  const clonedData = {
    team_id: teamId,
    created_by: user.id,
    title: `${original.title} (copie)`,
    slug: uniqueSlug(`${original.title}-copie`),
    description: original.description,
    display_mode: original.display_mode,
    status: 'draft' as const,
    is_template: false,
    template_origin_id: original.id,
    theme: original.theme,
    access_type: original.access_type,
    access_password: original.access_password,
    languages: original.languages,
    default_language: original.default_language,
    published_at: null,
    closes_at: null,
    created_at: now,
    updated_at: now
  };

  const { data: cloned, error } = await supabase
    .from('forms')
    .insert(clonedData)
    .select()
    .single();

  if (error) throw error;

  // Copier les champs
  if (original.fields && original.fields.length > 0) {
    const newFields = original.fields.map((f) => ({
      ...f,
      id: uuid(),
      form_id: cloned.id,
      options: f.options.map((o) => ({ ...o, id: uuid() }))
    }));

    const { error: fieldsError } = await supabase
      .from('fields')
      .insert(newFields);

    if (fieldsError) throw fieldsError;
  }

  // Copier les logic_rules
  if (original.logic_rules && original.logic_rules.length > 0) {
    const newRules = original.logic_rules.map((r) => ({
      ...r,
      id: uuid(),
      form_id: cloned.id
    }));

    const { error: rulesError } = await supabase
      .from('logic_rules')
      .insert(newRules);

    if (rulesError) throw rulesError;
  }

  return await getForm(cloned.id);
}

/** Archive un formulaire — passe le statut à `closed`. Réversible via `unarchiveForm`. */
export async function archiveForm(formId: string): Promise<Form | null> {
  return await updateForm(formId, { status: 'closed' });
}

/** Désarchive — repasse en brouillon. */
export async function unarchiveForm(formId: string): Promise<Form | null> {
  return await updateForm(formId, { status: 'draft' });
}

/**
 * Marque un formulaire comme modèle, ou l'inverse.
 */
export async function setAsTemplate(
  formId: string,
  isTemplate: boolean,
  scope: 'personal' | 'workspace' = 'personal'
): Promise<Form | null> {
  return await updateForm(formId, {
    is_template: isTemplate,
    scope: isTemplate ? scope : undefined
  });
}

// ============================================================================
// Logic rules (conditional display)
// ============================================================================

export async function listLogicRules(formId: string, sourceFieldId?: string): Promise<LogicRule[]> {
  const form = await getForm(formId);
  if (!form) return [];

  const rules = form.logic_rules ?? [];
  return sourceFieldId ? rules.filter((r) => r.source_field_id === sourceFieldId) : rules;
}

export async function addLogicRule(
  formId: string,
  rule: Omit<LogicRule, 'id' | 'form_id'>
): Promise<Form | null> {
  const form = await getForm(formId);
  if (!form) return null;

  const newRule: LogicRule = {
    ...rule,
    id: uuid(),
    form_id: formId
  };

  return await updateForm(formId, { logic_rules: [...(form.logic_rules ?? []), newRule] });
}

export async function updateLogicRule(
  formId: string,
  ruleId: string,
  patch: Partial<LogicRule>
): Promise<Form | null> {
  const form = await getForm(formId);
  if (!form) return null;

  const next = (form.logic_rules ?? []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r));
  return await updateForm(formId, { logic_rules: next });
}

export async function deleteLogicRule(formId: string, ruleId: string): Promise<Form | null> {
  const form = await getForm(formId);
  if (!form) return null;

  const next = (form.logic_rules ?? []).filter((r) => r.id !== ruleId);
  return await updateForm(formId, { logic_rules: next });
}

// ============================================================================
// Workspaces (Teams) & Member Management
// ============================================================================

import type { Team } from '@/types';

export async function createTeam(name: string): Promise<Team> {
  const supabase = createClient();
  const user = await getCurrentUser();

  // 1. Créer la team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, plan: 'free' })
    .select()
    .single();

  if (teamError) throw teamError;

  // 2. Associer l'utilisateur comme admin
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      user_id: user.id,
      team_id: team.id,
      role: 'admin'
    });

  if (memberError) throw memberError;

  // 3. Définir le cookie actif sur le client
  if (typeof document !== 'undefined') {
    document.cookie = `papyrus:active-team-id=${team.id}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return team;
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', teamId);

  if (error) throw error;
}

export async function listTeamMembers(teamId: string): Promise<any[]> {
  const supabase = createClient();

  // Récupérer les membres de l'équipe
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('user_id, role, joined_at')
    .eq('team_id', teamId);

  if (membersError) throw membersError;

  // Tenter de récupérer les emails des membres depuis la table profiles
  try {
    const userIds = members.map((m) => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const emailMap = new Map(profiles.map((p) => [p.id, p.email]));
    return members.map((m) => ({
      ...m,
      email: emailMap.get(m.user_id) || `Membre (ID: ${m.user_id.slice(0, 8)}...)`
    }));
  } catch (err) {
    // Si la table profiles n'existe pas encore ou qu'il y a une erreur RLS
    console.warn("Profiles table not available, falling back to user IDs:", err);
    return members.map((m) => ({
      ...m,
      email: `Membre (ID: ${m.user_id.slice(0, 8)}...)`
    }));
  }
}

export async function addTeamMember(teamId: string, email: string, role: 'admin' | 'member' | 'reader' = 'member'): Promise<void> {
  const supabase = createClient();

  // 1. Chercher l'utilisateur par email dans la table profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (profileError || !profile) {
    throw new Error("Aucun utilisateur inscrit sous cette adresse e-mail.");
  }

  // 2. Ajouter l'utilisateur à l'équipe
  const { error: insertError } = await supabase
    .from('team_members')
    .insert({
      user_id: profile.id,
      team_id: teamId,
      role
    });

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error("Cet utilisateur est déjà membre de cet espace de travail.");
    }
    throw insertError;
  }
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: 'admin' | 'member' | 'reader'): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteTeamMember(teamId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}