import type { LogicRule, Field, LogicCondition } from '@/types';

/**
 * Évalue toutes les règles logiques d'un formulaire et retourne les champs visibles
 */
export function evaluateLogicRules(
  rules: LogicRule[],
  responses: Record<string, any>,
  fields: Field[]
): Set<string> {
  // Commencer avec tous les champs visibles par défaut
  const visibleFields = new Set(fields.map(f => f.id));

  // Trier les règles par rule_order pour un ordre d'évaluation cohérent
  const sortedRules = [...rules].sort((a, b) => (a.rule_order || 0) - (b.rule_order || 0));

  for (const rule of sortedRules) {
    const sourceValue = responses[rule.source_field_id];
    const conditionMet = evaluateCondition(rule.condition, sourceValue, rule.condition_value);

    if (conditionMet) {
      applyAction(rule, visibleFields);
    }
  }

  return visibleFields;
}

/**
 * Évalue une condition logique
 */
function evaluateCondition(
  condition: LogicCondition,
  sourceValue: any,
  conditionValue: string
): boolean {
  // Normaliser les valeurs en string pour la comparaison
  const sourceStr = String(sourceValue || '').toLowerCase().trim();
  const conditionStr = conditionValue.toLowerCase().trim();

  switch (condition) {
    case 'equals':
      return sourceStr === conditionStr;

    case 'not_equals':
      return sourceStr !== conditionStr;

    case 'contains':
      return sourceStr.includes(conditionStr);

    case 'greater_than':
      const sourceNum = parseFloat(sourceStr);
      const conditionNum = parseFloat(conditionStr);
      return !isNaN(sourceNum) && !isNaN(conditionNum) && sourceNum > conditionNum;

    case 'less_than':
      const sourceNum2 = parseFloat(sourceStr);
      const conditionNum2 = parseFloat(conditionStr);
      return !isNaN(sourceNum2) && !isNaN(conditionNum2) && sourceNum2 < conditionNum2;

    default:
      return false;
  }
}

/**
 * Applique une action logique
 */
function applyAction(rule: LogicRule, visibleFields: Set<string>): void {
  switch (rule.action_type) {
    case 'show_field':
      if (rule.target_field_id) {
        visibleFields.add(rule.target_field_id);
      }
      break;

    case 'hide_field':
      if (rule.target_field_id) {
        visibleFields.delete(rule.target_field_id);
      }
      break;

    case 'jump_to':
      // Pour jump_to, dans une vraie implémentation on gérerait la navigation
      // Pour l'instant on ne fait rien, cela sera géré dans les composants typeform/sections
      break;

    case 'end_form':
      // Pour end_form, dans une vraie implémentation on terminerait le formulaire
      // Pour l'instant on ne fait rien, cela sera géré dans les composants typeform/sections
      break;
  }
}