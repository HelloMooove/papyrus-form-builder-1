'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, Eye, Send } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  addField,
  deleteField,
  duplicateField,
  reorderFields,
  updateField,
  updateForm,
  getForm
} from '@/lib/store';
import type { Field, FieldType, Form } from '@/types';
import { LIMITS } from '@/lib/constants/limits';
import { toast } from '@/components/ui/Toast';
import { validateForm, canPublishForm, formatValidationErrors } from '@/lib/validation/form-validation';

import { FieldPalette } from '@/components/builder/FieldPalette';
import { SortableFieldCard } from '@/components/builder/FieldCard';
import { FieldSettings } from '@/components/builder/FieldSettings';
import { FormDesignPanel } from '@/components/builder/FormDesignPanel';
import { FormHeader } from '@/components/builder/FormHeader';
import { FormHeaderSettings } from '@/components/builder/FormHeaderSettings';
import { PreviewModal } from '@/components/builder/PreviewModal';
import { getBackgroundStyle } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { FormTheme } from '@/types';

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedHeaderElement, setSelectedHeaderElement] = useState<'banner' | 'logo' | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Indicateur d'état de sauvegarde (Google Forms / Tally style)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave global déboucé (1.5s) du document
  const triggerAutosave = useCallback((updatedForm: Form) => {
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateForm(updatedForm.id, {
          fields: updatedForm.fields,
          theme: updatedForm.theme,
          title: updatedForm.title,
          description: updatedForm.description,
          display_mode: updatedForm.display_mode,
          scoring_enabled: updatedForm.scoring_enabled,
          status: updatedForm.status,
          published_at: updatedForm.published_at
        });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to autosave form:', error);
        toast.error('Erreur lors de la sauvegarde automatique');
        setSaveStatus('unsaved');
      }
    }, 1500);
  }, []);

  // Nettoyer le minuteur au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Capteur pointer avec un seuil pour ne pas déclencher le drag sur un simple clic
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Charger le formulaire initial
  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      try {
        const result = await getForm(params.id);
        setForm(result);
        if (result) setTitleDraft(result.title);
      } catch (error) {
        console.error('Failed to load form:', error);
        setForm(null);
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [params.id]);

  useEffect(() => {
    if (form) setTitleDraft(form.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id]);

  if (loading) return null;
  if (!form) {
    return (
      <div className="p-20 text-center">
        <h1 className="font-display text-2xl">Formulaire introuvable</h1>
        <Link href="/forms" className="mt-4 inline-block text-accent-bold underline-offset-4 hover:underline">
          ← Retour
        </Link>
      </div>
    );
  }

  const fields = form?.fields ?? [];
  const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

  // Helper pour créer un ID unique
  function generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // Helper pour créer un champ optimiste
  function createOptimisticField(type: FieldType, formId: string): Field {
    return {
      id: generateId(),
      form_id: formId,
      type,
      label: { fr: 'Nouvelle question' },
      description: { fr: '' },
      placeholder: { fr: '' },
      options:
        type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown'
          ? [
              { id: generateId(), label: { fr: '' } },
              { id: generateId(), label: { fr: '' } }
            ]
          : type === 'matrix'
            ? [
                { id: generateId(), label: { fr: 'Pas du tout' } },
                { id: generateId(), label: { fr: 'Plutôt non' } },
                { id: generateId(), label: { fr: 'Neutre' } },
                { id: generateId(), label: { fr: 'Plutôt oui' } },
                { id: generateId(), label: { fr: 'Tout à fait' } }
              ]
            : [],
      rows:
        type === 'matrix'
          ? [
              { id: generateId(), label: { fr: 'Critère 1' } },
              { id: generateId(), label: { fr: 'Critère 2' } },
              { id: generateId(), label: { fr: 'Critère 3' } }
            ]
          : undefined,
      required: false,
      field_order: fields.length,
      validation: type === 'matrix' ? { matrix_mode: 'single' } : {}
    };
  }

  function handleAdd(type: FieldType) {
    if (!form || fields.length >= LIMITS.FORM_FIELDS_MAX) {
      toast.error(`Limite de ${LIMITS.FORM_FIELDS_MAX} champs atteinte`);
      return;
    }

    const optimisticField = createOptimisticField(type, form.id);
    const updatedForm = {
      ...form,
      fields: [...fields, optimisticField]
    };

    // Update optimiste immédiat
    setForm(updatedForm);
    setSelectedFieldId(optimisticField.id);
    triggerAutosave(updatedForm);
  }

  /** Cliquer sur un champ le sélectionne. Pour revenir au design global, cliquer dans le vide du canvas. */
  function selectField(id: string) {
    setSelectedFieldId(id);
    setSelectedHeaderElement(null);
  }

  function selectHeaderElement(element: 'banner' | 'logo') {
    setSelectedHeaderElement(element);
    setSelectedFieldId(null);
  }

  function clearSelection() {
    setSelectedFieldId(null);
    setSelectedHeaderElement(null);
  }

  function handleFieldChange(fieldId: string, patch: Partial<Field>) {
    if (!form) return;

    const updatedForm = {
      ...form,
      fields: fields.map(f => f.id === fieldId ? { ...f, ...patch } : f)
    };

    // Update optimiste immédiat côté React
    setForm(updatedForm);
    triggerAutosave(updatedForm);
  }

  function handleDuplicate(fieldId: string) {
    if (!form || fields.length >= LIMITS.FORM_FIELDS_MAX) {
      toast.error(`Limite de ${LIMITS.FORM_FIELDS_MAX} champs atteinte`);
      return;
    }

    const originalField = fields.find(f => f.id === fieldId);
    if (!originalField) return;

    const idx = fields.findIndex(f => f.id === fieldId);

    // Créer la copie optimiste
    const duplicatedField = {
      ...originalField,
      id: generateId(),
      options: originalField.options?.map(o => ({ ...o, id: generateId() })) ?? [],
      field_order: idx + 1
    };

    // Update optimiste immédiat
    const newFields = [...fields];
    newFields.splice(idx + 1, 0, duplicatedField);
    const reindexed = newFields.map((f, i) => ({ ...f, field_order: i }));

    const updatedForm = {
      ...form,
      fields: reindexed
    };

    setForm(updatedForm);
    setSelectedFieldId(duplicatedField.id);
    triggerAutosave(updatedForm);
  }

  function handleDelete(fieldId: string) {
    if (!form) return;

    // Update optimiste immédiat
    const updatedForm = {
      ...form,
      fields: fields.filter(f => f.id !== fieldId)
        .map((f, i) => ({ ...f, field_order: i }))
    };

    setForm(updatedForm);
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    triggerAutosave(updatedForm);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !form) return;

    const ids = fields.map((f) => f.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedFields = arrayMove(fields, oldIdx, newIdx)
      .map((f, i) => ({ ...f, field_order: i }));

    // Update optimiste immédiat
    const updatedForm = {
      ...form,
      fields: reorderedFields
    };

    setForm(updatedForm);
    triggerAutosave(updatedForm);
  }

  async function handleTitleBlur() {
    if (!form || !titleDraft || titleDraft === form.title) return;

    const previousForm = form;

    // Update optimiste immédiat
    setForm(prev => prev ? { ...prev, title: titleDraft } : prev);

    // Sauvegarde en arrière-plan
    try {
      const saved = await updateForm(form.id, { title: titleDraft });
      if (saved) setForm(saved);
    } catch (error) {
      console.error('Failed to update title:', error);
      // Rollback en cas d'erreur
      setForm(previousForm);
      setTitleDraft(previousForm.title);
      toast.error('Erreur lors de la modification du titre');
    }
  }

  async function handlePublish() {
    if (!form) return;

    const previousForm = form;

    // Si on dépublie
    if (form.status === 'published') {
      // Update optimiste immédiat
      setForm(prev => prev ? {
        ...prev,
        status: 'draft' as const,
        published_at: null
      } : prev);

      // Sauvegarde en arrière-plan
      try {
        const saved = await updateForm(form.id, {
          status: 'draft',
          published_at: null
        });
        if (saved) setForm(saved);
      } catch (error) {
        console.error('Failed to unpublish:', error);
        setForm(previousForm);
        toast.error('Erreur lors de la dépublication');
      }
      return;
    }

    // Validation avant publication
    const validationErrors = validateForm(form);

    if (!canPublishForm(form)) {
      // Afficher les erreurs dans un toast
      const errorMessage = formatValidationErrors(validationErrors.filter(e => e.severity === 'error'));
      toast.error(`Impossible de publier :\n${errorMessage}`);

      // Scroll vers le premier champ en erreur
      const firstError = validationErrors.find(e => e.severity === 'error');
      if (firstError) {
        setSelectedFieldId(firstError.fieldId);
        // Scroll vers l'élément après un court délai
        setTimeout(() => {
          const element = document.querySelector(`[data-field-id="${firstError.fieldId}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }

    // Afficher les avertissements (warnings) s'il y en a
    const warnings = validationErrors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
      const warningMessage = formatValidationErrors(warnings);
      toast.warning(`Formulaire publié avec des avertissements :\n${warningMessage}`);
    }

    const publishedAt = new Date().toISOString();

    // Update optimiste immédiat
    setForm(prev => prev ? {
      ...prev,
      status: 'published' as const,
      published_at: publishedAt
    } : prev);

    // Sauvegarde en arrière-plan
    try {
      const saved = await updateForm(form.id, {
        status: 'published',
        published_at: publishedAt
      });
      if (saved) setForm(saved);
      toast.success('Formulaire publié avec succès !');
    } catch (error) {
      console.error('Failed to publish:', error);
      setForm(previousForm);
      toast.error('Erreur lors de la publication');
    }
  }

  async function handleThemeChange(patch: Partial<FormTheme>) {
    if (!form) return;

    const previousForm = form;
    let updatedFields = form.fields;

    if (patch.fields_icons_enabled === true && form.fields) {
      updatedFields = form.fields.map(f => {
        if (f.style && 'icon_enabled' in f.style) {
          const { icon_enabled, ...restStyle } = f.style;
          return { ...f, style: restStyle };
        }
        return f;
      });
    }

    const updateData = {
      theme: { ...form.theme, ...patch },
      ...(patch.fields_icons_enabled === true ? { fields: updatedFields } : {})
    };

    // Update optimiste immédiat
    setForm(prev => prev ? { ...prev, ...updateData } : prev);

    // Sauvegarde en arrière-plan
    try {
      const saved = await updateForm(form.id, updateData);
      if (saved) setForm(saved);
    } catch (error) {
      console.error('Failed to update theme:', error);
      setForm(previousForm);
      toast.error('Erreur lors de la modification du thème');
    }
  }

  async function handleFormChange(patch: Partial<Form>) {
    if (!form) return;

    const previousForm = form;
    let updatedFields = patch.fields ?? form.fields;

    if (patch.theme?.fields_icons_enabled === true && updatedFields) {
      updatedFields = updatedFields.map(f => {
        if (f.style && 'icon_enabled' in f.style) {
          const { icon_enabled, ...restStyle } = f.style;
          return { ...f, style: restStyle };
        }
        return f;
      });
      patch = { ...patch, fields: updatedFields };
    }

    // Update optimiste immédiat
    setForm(prev => prev ? { ...prev, ...patch } : prev);

    // Sauvegarde en arrière-plan
    try {
      const saved = await updateForm(form.id, patch);
      if (saved) setForm(saved);
    } catch (error) {
      console.error('Failed to update form:', error);
      setForm(previousForm);
      toast.error('Erreur lors de la modification');
    }
  }

  async function handleModeChange(display_mode: import('@/types').DisplayMode) {
    if (!form) return;

    const previousForm = form;

    // Update optimiste immédiat
    setForm(prev => prev ? { ...prev, display_mode } : prev);

    // Sauvegarde en arrière-plan
    try {
      const saved = await updateForm(form.id, { display_mode });
      if (saved) setForm(saved);
    } catch (error) {
      console.error('Failed to update display mode:', error);
      setForm(previousForm);
      toast.error('Erreur lors du changement de mode');
    }
  }

  return (
    <div className="-mx-8 -my-6 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between bg-bg-surface px-6 overflow-hidden transition-all duration-300"
        style={{
          height: isPreviewOpen ? '0px' : '3.5rem',
          minHeight: isPreviewOpen ? '0px' : '3.5rem',
          paddingTop: isPreviewOpen ? '0px' : undefined,
          paddingBottom: isPreviewOpen ? '0px' : undefined,
          borderBottom: isPreviewOpen ? 'none' : '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/forms')}
            className="text-text-secondary transition hover:text-text-primary"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative flex items-center">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              maxLength={LIMITS.FORM_TITLE_MAX}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="min-w-[200px] bg-transparent font-display text-lg outline-none transition focus:border-b focus:border-accent pr-12"
            />
            {titleDraft.length > 0 && (
              <span className={cn(
                "absolute right-2 text-[10px] font-mono pointer-events-none select-none",
                titleDraft.length > LIMITS.FORM_TITLE_MAX * 0.8 ? "text-red-500 font-semibold" : "text-text-tertiary"
              )}>
                {titleDraft.length}/{LIMITS.FORM_TITLE_MAX}
              </span>
            )}
          </div>
          {form.status === 'draft' && <Badge variant="draft">Brouillon</Badge>}
          {form.status === 'published' && <Badge variant="published">Publié</Badge>}
          <span className="papyrus-meta ml-2 text-xs">i. {fields.length} champ{fields.length > 1 ? 's' : ''}</span>
          <span className={cn(
            "ml-3 text-[11px] font-medium transition-all duration-300 flex items-center gap-1.5",
            saveStatus === 'saved' ? "text-green-600 dark:text-green-400 opacity-80" :
            saveStatus === 'saving' ? "text-amber-500 dark:text-amber-400 font-semibold animate-pulse" :
            "text-text-tertiary"
          )}>
            {saveStatus === 'saved' && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Sauvegardé
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                Sauvegarde en cours...
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Modifié (en attente...)
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            style={{
              border: '1.5px solid #2AC2DE',
              color: '#052139',
              background: 'transparent',
              borderRadius: '8px',
              padding: '5px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Eye size={14} /> Aperçu
          </button>
          <Button variant="cta" size="sm" iconLeft={<Send className="h-4 w-4" />} onClick={handlePublish}>
            {form.status === 'published' ? 'Dépublier' : 'Publier'}
          </Button>
        </div>
      </div>

      {/* Conteneur des vues avec transition glissante */}
      <div className="relative flex-1 overflow-hidden" id="preview-container">
        {/* Vue éditeur */}
        <div
          className="absolute inset-0 flex"
          style={{
            ...getBackgroundStyle(form.theme),
            transform: isPreviewOpen ? 'translateY(-100%)' : 'translateY(0)',
            transition: 'transform 0.45s cubic-bezier(0.77, 0, 0.175, 1)'
          }}
        >
          {/* Palette */}
          <aside className="w-72 overflow-y-auto border-r border-border bg-bg-surface p-5">
            <FieldPalette onAdd={handleAdd} disabled={fields.length >= LIMITS.FORM_FIELDS_MAX} />
          </aside>

          {/* Canvas — clic dans le vide désélectionne (retour au panneau de design) */}
          <div
            className="flex-1 overflow-y-auto px-12 py-10 transition-colors"
            style={{ ['--accent' as string]: form.theme.accent }}
            onClick={(e) => {
              // Ne désélectionner que si on clique vraiment sur le canvas, pas sur ses enfants
              if (e.target === e.currentTarget) {
                clearSelection();
              }
            }}
          >
            <div className="mx-auto max-w-2xl">
              {/* Header fixe avec bannière et logo */}
              <FormHeader
                theme={form.theme}
                selectedElement={selectedHeaderElement}
                onSelectBanner={() => selectHeaderElement('banner')}
                onSelectLogo={() => selectHeaderElement('logo')}
                onThemeChange={handleThemeChange}
              />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
                  {fields.length === 0 ? (
                    <EmptyCanvas />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map((field, i) => (
                        <SortableFieldCard
                          key={field.id}
                          field={field}
                          index={i}
                          selected={selectedFieldId === field.id}
                          globalStyle={form.theme.field_style}
                          cardBg={form.theme.field_bg_color}
                          theme={form.theme}
                          scoringEnabled={form.scoring_enabled}
                          onSelect={() => selectField(field.id)}
                          onChange={(patch) => handleFieldChange(field.id, patch)}
                          onDuplicate={() => handleDuplicate(field.id)}
                          onDelete={() => handleDelete(field.id)}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Settings */}
          <aside className="w-80 overflow-y-auto border-l border-border bg-bg-surface p-5">
            {selected ? (
              <FieldSettings
                form={form}
                field={selected}
                globalStyle={form.theme.field_style}
                onChange={(patch) => handleFieldChange(selected.id, patch)}
              />
            ) : selectedHeaderElement ? (
              <FormHeaderSettings
                theme={form.theme}
                selectedElement={selectedHeaderElement}
                onChange={handleThemeChange}
              />
            ) : (
              <FormDesignPanel
                form={form}
                onChange={handleThemeChange}
                onFormChange={handleFormChange}
                onModeChange={handleModeChange}
              />
            )}
          </aside>
        </div>

        {/* VUE APERÇU — monte depuis le bas */}
        <div
          className="absolute inset-0"
          style={{
            transform: isPreviewOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.45s cubic-bezier(0.77, 0, 0.175, 1)'
          }}
        >
          <PreviewModal form={form} onClose={() => setIsPreviewOpen(false)} />
        </div>

      </div>

    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-16 text-center">
      <h3 className="font-display text-2xl">Commencez votre Papyrus</h3>
      <p className="papyrus-meta mt-2 text-sm">i. Choisissez un champ dans la palette de gauche</p>
      <div className="mx-auto mt-6 papyrus-divider w-24" />
      <p className="mt-4 text-xs text-text-tertiary">
        14 types disponibles · réorganisez par drag &amp; drop · sauvegarde auto
      </p>
    </div>
  );
}
