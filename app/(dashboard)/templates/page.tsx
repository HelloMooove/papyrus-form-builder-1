'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Eye, Globe, LayoutTemplate, Search, Sparkles, Star, User, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { Form, FormScope } from '@/types';
import { useForms } from '@/lib/store/use-forms';
import { cloneTemplate, listTemplatesByScope } from '@/lib/store/templates';
import { FAVORITES_EVENT, listFavorites, toggleFavorite } from '@/lib/store/favorites';
import { cn } from '@/lib/utils';
import { PreviewModal } from '@/components/builder/PreviewModal';

type Tab = 'global' | 'workspace' | 'personal';

const TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { value: 'personal', label: 'Mes modèles', icon: User, hint: 'Ce que vous avez créé' },
  { value: 'workspace', label: 'Modèles de l\'équipe', icon: Building2, hint: 'Partagés dans votre workspace' },
  { value: 'global', label: 'Modèles Mooove', icon: Globe, hint: 'Bibliothèque officielle' }
];

export default function TemplatesPage() {
  const router = useRouter();
  const forms = useForms();
  const [tab, setTab] = useState<Tab>('global');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  /** Modèle actuellement ouvert dans l'aperçu (modal). null = aucun aperçu. */
  const [previewing, setPreviewing] = useState<Form | null>(null);

  // Synchronisation des favoris avec localStorage
  useEffect(() => {
    function refresh() {
      setFavorites(new Set(listFavorites()));
    }
    refresh();
    window.addEventListener(FAVORITES_EVENT, refresh);
    return () => window.removeEventListener(FAVORITES_EVENT, refresh);
  }, []);

  const buckets = useMemo(() => listTemplatesByScope(forms), [forms]);

  // Filtrage par recherche : on cherche dans titre + description + catégorie
  const matchesSearch = (t: Form): boolean => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.template_description ?? '').toLowerCase().includes(q) ||
      (t.template_category ?? '').toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
  };

  const list = buckets[tab].filter(matchesSearch);
  const favList = useMemo(() => {
    const all = [...buckets.global, ...buckets.workspace, ...buckets.personal];
    return all.filter((t) => favorites.has(t.id) && matchesSearch(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, favorites, search]);

  async function handleUse(template: Form) {
    try {
      const cloned = await cloneTemplate(template);
      router.push(`/forms/${cloned.id}/edit`);
    } catch (error) {
      console.error('Failed to clone template:', error);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
  }

  function handleToggleFav(id: string) {
    toggleFavorite(id);
    setFavorites(new Set(listFavorites()));
  }

  function handlePreview(template: Form) {
    setPreviewing(template);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* En-tête + barre de recherche */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <LayoutTemplate className="h-7 w-7 text-text-secondary" />
            <h1 className="font-display text-4xl">Modèles</h1>
          </div>
          <p className="papyrus-meta mt-1 text-sm not-italic">
            i. Partez d&apos;un modèle prêt à l&apos;emploi, ou créez le vôtre.
          </p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un modèle…" />
      </div>

      {/* Bande Favoris — visible seulement si au moins un favori */}
      {favList.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-mooove-amber text-mooove-amber" />
            <h2 className="font-display text-xl">Vos favoris</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {favList.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                favorite
                onUse={() => handleUse(t)}
                onPreview={() => handlePreview(t)}
                onToggleFavorite={() => handleToggleFav(t.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Onglets — compteurs reflètent la recherche en cours */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            const count = buckets[value].filter(matchesSearch).length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
                  active
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-accent/10 text-accent' : 'bg-bg-elevated text-text-tertiary'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint sous l'onglet actif */}
      <p className="papyrus-meta -mt-4 text-xs">i. {TABS.find((t) => t.value === tab)?.hint}</p>

      {/* Grille de modèles */}
      {list.length === 0 ? (
        <EmptyState tab={tab} search={search} onClearSearch={() => setSearch('')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              favorite={favorites.has(t.id)}
              onUse={() => handleUse(t)}
              onPreview={() => handlePreview(t)}
              onToggleFavorite={() => handleToggleFav(t.id)}
            />
          ))}
        </div>
      )}

      {/* Aperçu du modèle — réutilise la PreviewModal du builder, en lecture seule */}
      {previewing && (
        <PreviewModal form={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}

// ============================================================================
// Carte modèle
// ============================================================================

function TemplateCard({
  template,
  favorite,
  onUse,
  onPreview,
  onToggleFavorite
}: {
  template: Form;
  favorite: boolean;
  onUse: () => void;
  onPreview: () => void;
  onToggleFavorite: () => void;
}) {
  const Icon = resolveIcon(template.template_icon);
  const fieldsCount = template.fields?.length ?? 0;

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-bg-surface p-5 transition hover:border-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={cn(
            'rounded p-1.5 transition',
            favorite
              ? 'text-mooove-amber'
              : 'text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-mooove-amber'
          )}
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className={cn('h-4 w-4', favorite && 'fill-mooove-amber')} />
        </button>
      </div>

      <h3 className="mt-3 font-display text-lg leading-tight text-text-primary">{template.title}</h3>
      {template.template_description && (
        <p className="papyrus-meta mt-1 text-xs">{template.template_description}</p>
      )}

      <div className="mt-3 flex items-center gap-2 text-[11px] text-text-tertiary">
        {template.template_category && (
          <span className="rounded-full bg-bg-elevated px-2 py-0.5">{template.template_category}</span>
        )}
        <span>
          {fieldsCount} champ{fieldsCount > 1 ? 's' : ''}
        </span>
        <span>·</span>
        <span>{modeLabel(template.display_mode)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <ScopeBadge scope={template.scope ?? 'personal'} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPreview}
            aria-label="Voir le modèle"
            title="Voir le modèle (aperçu)"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1.5 text-xs text-text-primary transition hover:border-accent hover:bg-bg-elevated"
          >
            <Eye className="h-3.5 w-3.5" />
            Voir
          </button>
          <button
            type="button"
            onClick={onUse}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-mooove-ice transition hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Utiliser
          </button>
        </div>
      </div>
    </div>
  );
}

function ScopeBadge({ scope }: { scope: FormScope }) {
  const styles: Record<FormScope, { label: string; color: string; bg: string }> = {
    personal: { label: 'Perso', color: '#3C5EAB', bg: 'rgba(60, 94, 171, 0.1)' },
    workspace: { label: 'Équipe', color: '#F6923E', bg: 'rgba(246, 146, 62, 0.1)' },
    global: { label: 'Mooove', color: '#052139', bg: 'rgba(5, 33, 57, 0.08)' }
  };
  const s = styles[scope];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}

function EmptyState({ tab, search, onClearSearch }: { tab: Tab; search: string; onClearSearch: () => void }) {
  if (search.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <Search className="mx-auto h-8 w-8 text-text-tertiary" />
        <h3 className="mt-3 font-display text-lg">Aucun résultat</h3>
        <p className="papyrus-meta mt-1 text-sm">i. Aucun modèle ne correspond à votre recherche dans cet onglet.</p>
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <X className="h-3.5 w-3.5" /> Effacer la recherche
        </button>
      </div>
    );
  }

  const messages: Record<Tab, { title: string; hint: string }> = {
    personal: {
      title: 'Aucun modèle personnel',
      hint: 'Depuis un formulaire existant, marquez-le comme modèle pour le réutiliser plus tard.'
    },
    workspace: {
      title: 'Aucun modèle d\'équipe',
      hint: 'Les administrateurs peuvent élever un modèle perso au scope workspace (bientôt).'
    },
    global: {
      title: 'Aucun modèle Mooove',
      hint: 'La bibliothèque officielle est en cours de construction.'
    }
  };
  const m = messages[tab];
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
      <LayoutTemplate className="mx-auto h-10 w-10 text-text-tertiary" />
      <h3 className="mt-4 font-display text-xl">{m.title}</h3>
      <p className="papyrus-meta mt-1 text-sm">i. {m.hint}</p>
    </div>
  );
}

// ============================================================================
// Barre de recherche
// ============================================================================
function SearchBar({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-bg-surface pl-8 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary transition hover:bg-bg-elevated hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function modeLabel(mode: string): string {
  return mode === 'typeform' ? 'Une à une' : mode === 'scroll' ? 'Défilement' : 'Pages';
}

/** Résout un nom d'icône Lucide (string) en composant. Fallback : LayoutTemplate. */
function resolveIcon(name?: string): React.ComponentType<{ className?: string }> {
  if (!name) return LayoutTemplate;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib = Icons as any;
  return (lib[name] as React.ComponentType<{ className?: string }>) ?? LayoutTemplate;
}
