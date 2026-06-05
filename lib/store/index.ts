'use client';

// Store principal qui switche entre localStorage et Supabase selon NEXT_PUBLIC_LOCAL_MODE

import * as localStore from './local-forms';
import * as supabaseStore from './supabase-forms';

const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

// ============================================================================
// Export conditionnel : toutes les fonctions du store
// ============================================================================

export const listForms = isLocal ? localStore.listForms : supabaseStore.listForms;
export const getForm = isLocal ? localStore.getForm : supabaseStore.getForm;
export const createForm = isLocal ? localStore.createForm : supabaseStore.createForm;
export const updateForm = isLocal ? localStore.updateForm : supabaseStore.updateForm;
export const deleteForm = isLocal ? localStore.deleteForm : supabaseStore.deleteForm;
export const importForm = isLocal ? localStore.importForm : supabaseStore.importForm;

export const addField = isLocal ? localStore.addField : supabaseStore.addField;
export const updateField = isLocal ? localStore.updateField : supabaseStore.updateField;
export const deleteField = isLocal ? localStore.deleteField : supabaseStore.deleteField;
export const reorderFields = isLocal ? localStore.reorderFields : supabaseStore.reorderFields;
export const duplicateField = isLocal ? localStore.duplicateField : supabaseStore.duplicateField;

export const cloneForm = isLocal ? localStore.cloneForm : supabaseStore.cloneForm;
export const archiveForm = isLocal ? localStore.archiveForm : supabaseStore.archiveForm;
export const unarchiveForm = isLocal ? localStore.unarchiveForm : supabaseStore.unarchiveForm;
export const setAsTemplate = isLocal ? localStore.setAsTemplate : supabaseStore.setAsTemplate;

export const listLogicRules = isLocal ? localStore.listLogicRules : supabaseStore.listLogicRules;
export const addLogicRule = isLocal ? localStore.addLogicRule : supabaseStore.addLogicRule;
export const updateLogicRule = isLocal ? localStore.updateLogicRule : supabaseStore.updateLogicRule;
export const deleteLogicRule = isLocal ? localStore.deleteLogicRule : supabaseStore.deleteLogicRule;

export const newOptionId = isLocal ? localStore.newOptionId : supabaseStore.newOptionId;

export const createTeam = isLocal ? localStore.createTeam : supabaseStore.createTeam;
export const updateTeamName = isLocal ? localStore.updateTeamName : supabaseStore.updateTeamName;
export const listTeamMembers = isLocal ? localStore.listTeamMembers : supabaseStore.listTeamMembers;
export const addTeamMember = isLocal ? localStore.addTeamMember : supabaseStore.addTeamMember;
export const updateTeamMemberRole = isLocal ? localStore.updateTeamMemberRole : supabaseStore.updateTeamMemberRole;
export const deleteTeamMember = isLocal ? localStore.deleteTeamMember : supabaseStore.deleteTeamMember;