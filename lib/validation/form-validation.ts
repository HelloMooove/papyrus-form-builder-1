// lib/validation/form-validation.ts — Validation des formulaires avant publication

import type { Field, Form } from '@/types';

export interface FormValidationError {
  fieldId: string;
  fieldLabel: string;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Valide un formulaire avant publication/sauvegarde
 */
export function validateForm(form: Form): FormValidationError[] {
  const errors: FormValidationError[] = [];

  if (!form.fields) return errors;

  // Validation des champs Media (image, vidéo, fichier)
  for (const field of form.fields) {
    if (field.type === 'image' || field.type === 'video' || field.type === 'file') {
      const mediaErrors = validateMediaField(field);
      errors.push(...mediaErrors);
    }
  }

  return errors;
}

/**
 * Valide un champ Media (image, vidéo, fichier)
 */
function validateMediaField(field: Field): FormValidationError[] {
  const errors: FormValidationError[] = [];
  const creatorModeEnabled = field.validation?.creator_mode_enabled ?? false;
  const respondentModeEnabled = field.validation?.respondent_mode_enabled ?? false;

  // Aucun mode activé
  if (!creatorModeEnabled && !respondentModeEnabled) {
    const typeLabels = {
      image: 'Image',
      video: 'Vidéo',
      file: 'Fichier'
    };

    errors.push({
      fieldId: field.id,
      fieldLabel: field.label?.fr || `${typeLabels[field.type as keyof typeof typeLabels]} sans titre`,
      error: `Veuillez choisir au moins un mode (Créateur ou Répondant) pour ce champ ${typeLabels[field.type as keyof typeof typeLabels]}.`,
      severity: 'error'
    });
  }

  // Mode créateur activé mais pas de contenu pour image/vidéo
  if (creatorModeEnabled && !field.validation?.media_url && (field.type === 'image' || field.type === 'video')) {
    const typeLabel = field.type === 'image' ? 'image' : 'vidéo';
    errors.push({
      fieldId: field.id,
      fieldLabel: field.label?.fr || `${field.type} sans titre`,
      error: `Mode Créateur activé mais aucune ${typeLabel} n'a été ajoutée.`,
      severity: 'warning'
    });
  }

  return errors;
}

/**
 * Vérifie si un formulaire peut être publié (pas d'erreurs critiques)
 */
export function canPublishForm(form: Form): boolean {
  const errors = validateForm(form);
  return !errors.some(error => error.severity === 'error');
}

/**
 * Formatage des erreurs pour l'affichage
 */
export function formatValidationErrors(errors: FormValidationError[]): string {
  if (errors.length === 0) return '';

  const errorMessages = errors.map(error => `• ${error.fieldLabel}: ${error.error}`);
  return errorMessages.join('\n');
}