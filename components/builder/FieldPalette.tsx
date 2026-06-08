'use client';

import { Plus } from 'lucide-react';
import { FIELD_CATEGORIES, FIELD_META } from '@/lib/field-meta';
import type { FieldType } from '@/types';
import { toast } from '@/components/ui/Toast';
import { LIMITS } from '@/lib/constants/limits';

interface Props {
  onAdd: (type: FieldType) => void;
  disabled?: boolean;
  fieldsCount?: number;
}

export function FieldPalette({ onAdd, disabled = false, fieldsCount = 0 }: Props) {
  const handleClick = (type: FieldType) => {
    if (disabled) {
      toast.error(`Limite de ${LIMITS.FORM_FIELDS_MAX} champs atteinte`);
      return;
    }
    onAdd(type);
  };

  return (
    <div className={disabled ? 'space-y-3 opacity-60' : 'space-y-3'}>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Ajouter un champ</h2>
          <span className="text-xs font-mono text-text-tertiary">
            {fieldsCount}/{LIMITS.FORM_FIELDS_MAX}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-text-tertiary">Cliquez pour ajouter au formulaire</p>
      </div>

      {FIELD_CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <div className="px-1 pb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {cat.title}
          </div>
          <div className="space-y-0.5">
            {cat.types.map((type) => {
              const meta = FIELD_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleClick(type)}
                  className={`group flex w-full items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-left transition ${
                    disabled
                      ? 'cursor-not-allowed hover:bg-transparent'
                      : 'hover:border-border hover:bg-bg-elevated'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-text-secondary transition ${
                    !disabled && 'group-hover:bg-mooove-navy group-hover:text-mooove-ice'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text-primary truncate">{meta.label}</span>
                    <span className="block text-xs text-text-tertiary truncate">{meta.description}</span>
                  </span>
                  {!disabled && (
                    <Plus className="h-3 w-3 shrink-0 text-text-tertiary opacity-0 transition group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
