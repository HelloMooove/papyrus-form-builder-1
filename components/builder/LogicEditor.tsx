'use client';

import { Plus, Trash2, Award } from 'lucide-react';
import type { Field, Form, LogicCondition, LogicAction, LogicRule, DisplayMode } from '@/types';
import { addLogicRule, deleteLogicRule, updateLogicRule } from '@/lib/store';
import { FIELD_META } from '@/lib/field-meta';
import { getFieldsInSameSection, getSections } from '@/lib/sections';

interface Props {
  form: Form;
  field: Field;
}

const CONDITIONS: { value: LogicCondition; label: string; types: string[] }[] = [
  { value: 'equals', label: 'est égal à', types: ['*'] },
  { value: 'not_equals', label: 'est différent de', types: ['*'] },
  { value: 'contains', label: 'contient', types: ['short_text', 'long_text', 'email', 'url'] },
  { value: 'greater_than', label: 'est supérieur à', types: ['number', 'rating', 'nps'] },
  { value: 'less_than', label: 'est inférieur à', types: ['number', 'rating', 'nps'] }
];

const ALL_ACTIONS: { value: LogicAction; label: string; modes: DisplayMode[] }[] = [
  { value: 'show_field', label: 'Afficher', modes: ['scroll', 'sections'] },
  { value: 'hide_field', label: 'Masquer', modes: ['scroll', 'sections'] },
  { value: 'jump_to', label: 'Aller à', modes: ['scroll', 'sections', 'typeform'] },
  { value: 'end_form', label: 'Terminer le formulaire', modes: ['scroll', 'sections', 'typeform'] }
];

/**
 * Calcule le score de maturité d'un champ (points min/max disponibles).
 */
function getFieldScoreInfo(field: Field): { minPoints: number; maxPoints: number; hasScoring: boolean } {
  const options = field.options || [];
  const points = options.map(opt => opt.points || 0).filter(p => p > 0);

  if (points.length === 0) {
    return { minPoints: 0, maxPoints: 0, hasScoring: false };
  }

  switch (field.type) {
    case 'single_choice':
    case 'dropdown':
      return {
        minPoints: Math.min(...points),
        maxPoints: Math.max(...points),
        hasScoring: true
      };

    case 'multiple_choice':
      return {
        minPoints: Math.min(...points),
        maxPoints: points.reduce((sum, p) => sum + p, 0), // Somme de tous les points
        hasScoring: true
      };

    case 'matrix':
      const rows = field.rows || [];
      const maxPerRow = points.length > 0 ? Math.max(...points) : 0;
      return {
        minPoints: points.length > 0 ? Math.min(...points) : 0,
        maxPoints: maxPerRow * rows.length,
        hasScoring: true
      };

    case 'rating':
      return { minPoints: 1, maxPoints: 5, hasScoring: true };

    case 'nps':
      return { minPoints: 0, maxPoints: 10, hasScoring: true };

    default:
      return { minPoints: 0, maxPoints: 0, hasScoring: false };
  }
}

export function LogicEditor({ form, field }: Props) {
  const mode: DisplayMode = form.display_mode ?? 'scroll';
  const allFields = form.fields ?? [];
  const rules = (form.logic_rules ?? []).filter((r) => r.source_field_id === field.id);
  const scoreInfo = getFieldScoreInfo(field);
  const scoringEnabled = form?.scoring_enabled ?? false;

  // Actions disponibles selon le mode
  const availableActions = ALL_ACTIONS.filter((a) => a.modes.includes(mode));

  // Conditions disponibles selon le type du champ source
  const availableConditions = CONDITIONS.filter(
    (c) => c.types.includes('*') || c.types.includes(field.type)
  );

  /** Cibles disponibles selon l'action choisie et le mode. */
  function getTargetsForAction(action: LogicAction): Field[] {
    if (action === 'end_form') return [];

    if (action === 'jump_to') {
      if (mode === 'typeform') {
        // Toutes les questions sauf section_break
        return allFields.filter((f) => f.id !== field.id && f.type !== 'section_break');
      }
      // scroll / sections : uniquement les sections
      return getSections(allFields);
    }

    // show_field / hide_field
    if (mode === 'sections') {
      // Uniquement les champs de la même section
      return getFieldsInSameSection(allFields, field.id).filter(
        (f) => f.type !== 'section_break'
      );
    }
    // scroll : tous les autres champs
    return allFields.filter(
      (f) => f.id !== field.id && f.type !== 'section_break' && f.type !== 'image' && f.type !== 'video'
    );
  }

  const isChoice = ['single_choice', 'multiple_choice', 'dropdown'].includes(field.type);

  function handleAdd() {
    const defaultAction = availableActions[0]?.value ?? 'end_form';
    const initialTargets = getTargetsForAction(defaultAction);
    addLogicRule(form.id, {
      source_field_id: field.id,
      condition: 'equals',
      condition_value: (field.options || [])[0]?.id ?? '',
      action_type: defaultAction,
      target_field_id: initialTargets[0]?.id,
      rule_order: rules.length
    });
  }

  // Texte d'aide selon le mode
  const modeHint =
    mode === 'typeform'
      ? 'Mode Typeform : seules les actions « Aller à » et « Terminer » sont disponibles.'
      : mode === 'sections'
        ? 'Mode Pages : Afficher/Masquer s\'applique aux champs de la même section. « Aller à » cible une autre section.'
        : 'Mode Défilement : toutes les actions disponibles.';

  return (
    <div className="space-y-4">
      <div>
        <div className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Logique conditionnelle</div>
        <p className="mt-1 text-xs text-text-tertiary">{modeHint}</p>
      </div>

      {/* Score de maturité de la question */}
      {scoringEnabled && scoreInfo.hasScoring && (
        <div className="rounded-md border border-mooove-electric/30 bg-mooove-electric/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-3.5 w-3.5 text-mooove-electric" />
            <span className="text-xs font-medium text-mooove-electric uppercase tracking-wide">
              Score de maturité
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Cette question rapporte entre <strong>{scoreInfo.minPoints}</strong> et{' '}
            <strong>{scoreInfo.maxPoints} points</strong> selon la réponse.
          </p>
          {field.type === 'multiple_choice' && (
            <p className="mt-1 text-[10px] text-text-tertiary">
              Mode multiple : les points se cumulent si plusieurs options sont sélectionnées.
            </p>
          )}
        </div>
      )}

      {rules.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-bg-base p-4 text-center">
          <p className="text-xs text-text-tertiary">Aucune règle pour l&apos;instant</p>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={i}
            sourceField={field}
            availableConditions={availableConditions}
            availableActions={availableActions}
            getTargetsForAction={getTargetsForAction}
            isChoice={isChoice}
            onChange={(patch) => updateLogicRule(form.id, rule.id, patch)}
            onDelete={() => deleteLogicRule(form.id, rule.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-xs text-text-secondary transition hover:border-accent hover:text-text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une règle
      </button>
    </div>
  );
}

interface RuleCardProps {
  rule: LogicRule;
  index: number;
  sourceField: Field;
  availableConditions: { value: LogicCondition; label: string }[];
  availableActions: { value: LogicAction; label: string }[];
  getTargetsForAction: (action: LogicAction) => Field[];
  isChoice: boolean;
  onChange: (patch: Partial<LogicRule>) => void;
  onDelete: () => void;
}

function RuleCard({
  rule,
  index,
  sourceField,
  availableConditions,
  availableActions,
  getTargetsForAction,
  isChoice,
  onChange,
  onDelete
}: RuleCardProps) {
  const showTarget = rule.action_type !== 'end_form';
  const targets = getTargetsForAction(rule.action_type);

  return (
    <div className="space-y-2 rounded-md border border-border bg-bg-base p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">Règle {index + 1}</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-text-tertiary transition hover:text-danger"
          aria-label="Supprimer la règle"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="Si la réponse">
          <Select
            value={rule.condition}
            onChange={(v) => onChange({ condition: v as LogicCondition })}
            options={availableConditions.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Row>

        <Row label="">
          {isChoice ? (
            <Select
              value={rule.condition_value}
              onChange={(v) => onChange({ condition_value: v })}
              options={(sourceField.options || []).map((o) => ({
                value: o.id,
                label: o.label.fr || 'Option sans titre'
              }))}
            />
          ) : (
            <input
              value={rule.condition_value}
              onChange={(e) => onChange({ condition_value: e.target.value })}
              placeholder="Valeur"
              className="h-8 w-full rounded-md border border-border-strong bg-bg-surface px-2 text-sm focus:border-accent focus:outline-none"
            />
          )}
        </Row>

        <Row label="Alors">
          <Select
            value={rule.action_type}
            onChange={(v) => {
              const newAction = v as LogicAction;
              // Quand on change d'action, réinitialise la cible vers le premier candidat valide
              const newTargets = getTargetsForAction(newAction);
              onChange({
                action_type: newAction,
                target_field_id: newAction === 'end_form' ? undefined : newTargets[0]?.id
              });
            }}
            options={availableActions.map((a) => ({ value: a.value, label: a.label }))}
          />
        </Row>

        {showTarget && (
          <Row label="Cible">
            {targets.length === 0 ? (
              <span className="text-xs italic text-text-tertiary">
                Aucune cible disponible
              </span>
            ) : (
              <Select
                value={rule.target_field_id ?? ''}
                onChange={(v) => onChange({ target_field_id: v })}
                options={targets.map((f) => {
                  const meta = FIELD_META[f.type];
                  return {
                    value: f.id,
                    label: f.label.fr || `${meta.label} sans titre`
                  };
                })}
                placeholder="Choisir"
              />
            )}
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <span className="text-xs text-text-tertiary">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-md border border-border-strong bg-bg-surface px-2 text-xs focus:border-accent focus:outline-none"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
