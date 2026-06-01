'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Layers, Palette, Sparkles, Upload, X } from 'lucide-react';
import type {
  BackgroundType,
  DisplayMode,
  Form,
  FormTheme,
  BannerFit,
  BannerPosition,
  FieldStyle
} from '@/types';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { BACKGROUND_PRESETS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { StyleControls } from './StyleControls';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

interface Props {
  form: Form;
  onChange: (patch: Partial<FormTheme>) => void;
  onFormChange: (patch: Partial<Form>) => void;
  onModeChange: (mode: DisplayMode) => void;
}

type Tab = 'background' | 'style' | 'colors' | 'settings';

export function FormDesignPanel({ form, onChange, onFormChange, onModeChange }: Props) {
  const [tab, setTab] = useState<Tab>('background');
  const currentMode = form.display_mode ?? 'sections';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border pb-3">
        <div className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Apparence du formulaire</div>
        <p className="mt-1 text-xs text-text-tertiary">
          Mode d&apos;affichage, couleurs, bannière…
        </p>
      </div>

      {/* Sélecteur de mode d'affichage */}
      <div className="border-b border-border py-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Mode d&apos;affichage
        </h4>
        <div className="space-y-1.5">
          {(
            [
              {
                value: 'sections' as DisplayMode,
                label: 'Pages',
                hint: 'Une section = une page (défaut)'
              },
              {
                value: 'scroll' as DisplayMode,
                label: 'Défilement',
                hint: 'Tout sur une page (scroll)'
              },
              {
                value: 'typeform' as DisplayMode,
                label: 'Une à une',
                hint: 'Plein écran, façon Typeform'
              }
            ]
          ).map((m) => {
            const active = currentMode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onModeChange(m.value)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition',
                  active
                    ? 'border-accent bg-accent/5'
                    : 'border-border-strong hover:border-accent'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 h-3 w-3 shrink-0 rounded-full border-2',
                    active ? 'border-accent bg-accent' : 'border-border-strong'
                  )}
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-text-primary">{m.label}</span>
                  <span className="block text-[11px] text-text-tertiary">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-5 flex border-b border-border bg-bg-surface">
        <TabButton active={tab === 'background'} onClick={() => setTab('background')}>
          Fond
        </TabButton>
        <TabButton active={tab === 'style'} onClick={() => setTab('style')}>
          Style
        </TabButton>
        <TabButton active={tab === 'colors'} onClick={() => setTab('colors')}>
          Accent
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          Réglages
        </TabButton>
      </div>

      <div className="flex-1 pt-5">
        {tab === 'background' && <BackgroundTab theme={form.theme} onChange={onChange} />}
        {tab === 'style' && <FormStyleTab theme={form.theme} onChange={onChange} />}
        {tab === 'colors' && <AccentTab theme={form.theme} onChange={onChange} />}
        {tab === 'settings' && <SettingsTab form={form} onFormChange={onFormChange} />}
      </div>
    </div>
  );
}

// ============================================================================
// Settings tab — comportement du formulaire (save & resume, unique email…)
// ============================================================================

function SettingsTab({ form, onFormChange }: { form: Form; onFormChange: (patch: Partial<Form>) => void }) {
  const hasEmailField = (form.fields ?? []).some((f) => f.type === 'email');
  const uniqueEmail = form.unique_email ?? false;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Icônes du formulaire
        </h4>
        <Switch
          checked={form.theme.fields_icons_enabled ?? false}
          onChange={(v) => onFormChange({ theme: { ...form.theme, fields_icons_enabled: v } })}
          label="Afficher les icônes"
          description="Ajoute une icône à gauche de chaque question"
        />
      </div>

      <div className="space-y-3 border-t border-dashed border-border pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Système de scoring
        </h4>
        <Switch
          checked={form.scoring_enabled ?? false}
          onChange={(scoring_enabled) => onFormChange({ scoring_enabled })}
          label="Activer le système de points"
          description="Permet d'attribuer des points aux réponses pour calculer un score de maturité."
        />
        {form.scoring_enabled && (
          <>
            <Switch
              checked={form.show_score_to_respondent ?? false}
              onChange={(show_score_to_respondent) => onFormChange({ show_score_to_respondent })}
              label="Afficher le score final au répondant"
              description="Le répondant verra son score total à la fin du formulaire."
            />
            <div className="mt-3 gap-2 space-y-2">
              <div>
                <label className="block text-xs text-text-secondary mb-1" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Nom du score
                </label>
                <Input
                  value={form.theme.score_label ?? ''}
                  onChange={(e) => onFormChange({ theme: { ...form.theme, score_label: e.target.value } })}
                  placeholder="Score"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <Input
                  value={form.theme.score_description ?? ''}
                  onChange={(e) => onFormChange({ theme: { ...form.theme, score_description: e.target.value } })}
                  placeholder="Basé sur vos réponses à ce formulaire"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-3 border-t border-dashed border-border pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Anti-doublon
        </h4>
        <Switch
          checked={uniqueEmail}
          onChange={(unique_email) => onFormChange({ unique_email })}
          label="Un seul envoi par personne (email)"
          description="Avant l'envoi final, on vérifie que cet email n'a pas déjà répondu à ce formulaire."
        />
        {uniqueEmail && !hasEmailField && (
          <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
            i. Cette option nécessite un champ <strong>Email</strong> dans le formulaire. Ajoutes-en un depuis la palette de gauche.
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-dashed border-border pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Sauvegarde et reprise
        </h4>
        <Switch
          checked={form.save_and_resume ?? false}
          onChange={(save_and_resume) => onFormChange({ save_and_resume })}
          label="Permettre la reprise d'une réponse en cours"
          description="Les réponses en cours sont enregistrées dans le navigateur. Si le répondant revient, on lui propose de reprendre où il s'était arrêté. Aucune donnée n'est envoyée tant que le formulaire n'est pas soumis."
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition',
        active ? 'border-accent text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Background tab
// ============================================================================

const BG_TYPES: { value: BackgroundType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'preset', label: 'Preset', icon: Sparkles },
  { value: 'color', label: 'Couleur', icon: Palette },
  { value: 'gradient', label: 'Dégradé', icon: Layers },
  { value: 'image', label: 'Image', icon: ImageIcon }
];

const BLOCK_PRESETS: { value: string | undefined; label: string; preview: string }[] = [
  { value: undefined, label: 'Crème', preview: '#FFFDF5' },
  { value: '#FFFFFF', label: 'Blanc', preview: '#FFFFFF' },
  { value: '#F7F0DC', label: 'Parchemin', preview: '#F7F0DC' },
  { value: '#EFF9FE', label: 'Ice', preview: '#EFF9FE' },
  { value: 'transparent', label: 'Transparent', preview: 'transparent' },
  { value: '#0A3050', label: 'Sombre', preview: '#0A3050' }
];

function BackgroundTab({ theme, onChange }: { theme: FormTheme; onChange: (patch: Partial<FormTheme>) => void }) {
  const type: BackgroundType = theme.bg_type ?? 'color';
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Image trop lourde (${Math.round(file.size / 1024)} Ko). En mode local, max 1,5 Mo.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      onChange({ bg_type: 'image', bg_image_url: url, bg: `url(${url})` });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      {/* === SECTION 1 : ARRIÈRE-PLAN DE LA PAGE === */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Arrière-plan de la page
        </h4>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {BG_TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ bg_type: t.value })}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border p-2 transition',
                active
                  ? 'border-accent bg-accent/5'
                  : 'border-border-strong text-text-secondary hover:border-accent'
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-text-primary')} />
              <span className="text-[10px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* PRESET */}
      {type === 'preset' && (
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUND_PRESETS.map((p) => {
            const active = theme.bg_preset === p.id;
            const previewStyle = p.apply.bg_type === 'gradient'
              ? {
                  backgroundImage: `linear-gradient(${p.apply.bg_gradient_angle ?? 135}deg, ${p.apply.bg_gradient_from}, ${p.apply.bg_gradient_to})`
                }
              : { backgroundColor: p.apply.bg_color ?? p.apply.bg };
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ ...p.apply, bg_preset: p.id })}
                className={cn(
                  'overflow-hidden rounded-md border transition',
                  active ? 'border-accent ring-2 ring-accent/30' : 'border-border-strong hover:border-accent'
                )}
              >
                <div className="h-14" style={previewStyle} />
                <div className="px-2 py-1.5 text-left text-xs text-text-secondary">{p.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* COLOR */}
      {type === 'color' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.bg_color ?? theme.bg ?? '#F7F0DC'}
              onChange={(e) => onChange({ bg_color: e.target.value, bg: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-bg-base"
            />
            <Input
              value={theme.bg_color ?? theme.bg ?? ''}
              onChange={(e) => onChange({ bg_color: e.target.value, bg: e.target.value })}
              placeholder="#F7F0DC"
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* GRADIENT */}
      {type === 'gradient' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Couleur 1</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.bg_gradient_from ?? '#F7F0DC'}
                onChange={(e) => onChange({ bg_gradient_from: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-bg-base"
              />
              <Input
                value={theme.bg_gradient_from ?? ''}
                onChange={(e) => onChange({ bg_gradient_from: e.target.value })}
                placeholder="#F7F0DC"
                className="flex-1 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Couleur 2</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.bg_gradient_to ?? '#EFF9FE'}
                onChange={(e) => onChange({ bg_gradient_to: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-bg-base"
              />
              <Input
                value={theme.bg_gradient_to ?? ''}
                onChange={(e) => onChange({ bg_gradient_to: e.target.value })}
                placeholder="#EFF9FE"
                className="flex-1 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
              <span>Angle</span>
              <span className="font-mono text-text-tertiary">{theme.bg_gradient_angle ?? 135}°</span>
            </label>
            <input
              type="range"
              min={0}
              max={360}
              value={theme.bg_gradient_angle ?? 135}
              onChange={(e) => onChange({ bg_gradient_angle: Number(e.target.value) })}
              className="w-full accent-mooove-navy"
            />
          </div>
        </div>
      )}

      {/* IMAGE */}
      {type === 'image' && (
        <div className="space-y-3">
          {theme.bg_image_url ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.bg_image_url}
                alt="Aperçu fond"
                className="h-24 w-full rounded-md border border-border object-cover"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-text-secondary hover:underline"
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ bg_image_url: undefined })}
                  className="flex items-center gap-1 text-xs text-danger hover:underline"
                >
                  <X className="h-3 w-3" /> Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent"
            >
              <Upload className="h-5 w-5" />
              Téléverser une image de fond
              <span className="text-xs text-text-tertiary">PNG, JPG · max 1,5 Mo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f);
              e.target.value = '';
            }}
          />

          <Input
            label="… ou coller une URL"
            value={theme.bg_image_url?.startsWith('data:') ? '' : theme.bg_image_url ?? ''}
            onChange={(e) => onChange({ bg_image_url: e.target.value || undefined })}
            placeholder="https://…"
          />

          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
              <span>Voile parchemin (lisibilité)</span>
              <span className="font-mono text-text-tertiary">{theme.bg_image_opacity ?? 0}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              value={theme.bg_image_opacity ?? 0}
              onChange={(e) => onChange({ bg_image_opacity: Number(e.target.value) })}
              className="w-full accent-mooove-navy"
            />
            <p className="mt-1 text-[10px] text-text-tertiary">
              Adoucit l&apos;image pour que le texte reste lisible.
            </p>
          </div>
        </div>
      )}

      {/* === SECTION 2 : COULEUR DES BLOCS === */}
      <div className="border-t border-dashed border-border pt-5">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Couleur des blocs
        </h4>
        <p className="mb-3 text-xs text-text-tertiary">
          Couleur de fond des cartes contenant les questions.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {BLOCK_PRESETS.map((p) => {
            const active = (theme.field_bg_color ?? undefined) === p.value;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ field_bg_color: p.value })}
                className={cn(
                  'overflow-hidden rounded-md border transition',
                  active ? 'border-accent ring-2 ring-accent/30' : 'border-border-strong hover:border-accent'
                )}
              >
                <div
                  className="h-10 border-b border-border"
                  style={{
                    backgroundColor: p.preview === 'transparent' ? undefined : p.preview,
                    backgroundImage:
                      p.preview === 'transparent'
                        ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)'
                        : undefined,
                    backgroundSize: p.preview === 'transparent' ? '8px 8px' : undefined,
                    backgroundPosition: p.preview === 'transparent' ? '0 0, 4px 4px' : undefined
                  }}
                />
                <div className="px-2 py-1 text-left text-[11px] text-text-secondary">{p.label}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="color"
            value={theme.field_bg_color ?? '#FFFDF5'}
            onChange={(e) => onChange({ field_bg_color: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-bg-base"
          />
          <Input
            value={theme.field_bg_color ?? ''}
            onChange={(e) => onChange({ field_bg_color: e.target.value || undefined })}
            placeholder="par défaut"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Form style tab — applique à TOUTES les questions du formulaire
// ============================================================================

function FormStyleTab({
  theme,
  onChange
}: {
  theme: FormTheme;
  onChange: (patch: Partial<FormTheme>) => void;
}) {
  const current = theme.field_style ?? {};
  const hasStyle = Object.keys(current).length > 0;

  function handleChange(next: FieldStyle) {
    onChange({ field_style: Object.keys(next).length === 0 ? undefined : next });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-mooove-cyan/30 bg-mooove-cyan/5 px-3 py-2 text-xs text-text-secondary">
        Le style choisi ici s&apos;applique à <strong>toutes les questions</strong> du formulaire. Vous pouvez toujours
        le surcharger champ par champ via l&apos;onglet « Style » d&apos;un champ sélectionné.
      </div>

      <StyleControls style={current} onChange={handleChange} />

      <div className="space-y-3 border-t border-dashed border-border pt-5">
        <Switch
          checked={theme.fields_icons_enabled ?? false}
          onChange={(v) => onChange({ fields_icons_enabled: v })}
          label="Afficher les icônes"
          description="Ajoute une icône à gauche de chaque question"
        />
      </div>

      {hasStyle && (
        <button
          type="button"
          onClick={() => onChange({ field_style: undefined })}
          className="w-full rounded-md border border-dashed border-border-strong py-2 text-xs text-text-secondary hover:border-danger hover:text-danger mt-3"
        >
          Réinitialiser le style global
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Accent tab — restreint à l'identité Mooove
// ============================================================================

const MOOOVE_ACCENTS = [
  { value: '#052139', name: 'Navy', description: 'Identité principale Mooove' },
  { value: '#3C5EAB', name: 'Electric Blue', description: 'Audace, affirmation' },
  { value: '#2AC2DE', name: 'Cyan', description: 'Énergie, mouvement (CTA)' }
];

const PRESET_ACCENTS = [
  '#052139', // Navy
  '#3C5EAB', // Electric Blue
  '#2AC2DE', // Cyan
  '#F6923E', // Amber
  '#C0392B', // Coral
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899'  // Pink
];

function AccentTab({ theme, onChange }: { theme: FormTheme; onChange: (patch: Partial<FormTheme>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-tertiary">
        Couleur d&apos;identité Mooove pour les boutons et les éléments actifs. Choisissez l&apos;un de nos presets
        ou configurez votre propre couleur personnalisée.
      </p>
      <div className="space-y-2">
        {MOOOVE_ACCENTS.map((c) => {
          const active = theme.accent === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ accent: c.value })}
              className={cn(
                'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition',
                active ? 'border-accent bg-accent/5' : 'border-border-strong hover:border-accent'
              )}
            >
              <span
                className="h-7 w-7 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: c.value }}
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-text-primary">{c.name}</span>
                <span className="block text-[11px] text-text-tertiary">{c.description}</span>
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">{c.value}</span>
            </button>
          );
        })}
      </div>

      {/* Couleur personnalisée */}
      <div className="border-t border-dashed border-border pt-4 mt-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
          Couleur personnalisée
        </label>
        
        {/* Palette rapide */}
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {PRESET_ACCENTS.map((c) => {
            const active = theme.accent === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ accent: c })}
                className={cn(
                  'h-7 w-7 rounded-md border transition',
                  active ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg-surface' : 'border-border'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={theme.accent ?? '#052139'}
            onChange={(e) => onChange({ accent: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-bg-base"
            aria-label="Sélecteur de couleur d'accent"
          />
          <Input
            value={theme.accent ?? ''}
            onChange={(e) => onChange({ accent: e.target.value })}
            placeholder="#052139"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
