'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  FileText,
  LayoutTemplate,
  Pencil,
  Plus,
  Sparkles,
  Star,
  TrendingUp
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCount } from '@/lib/utils';
import { useForms } from '@/lib/store/use-forms';
import { createForm } from '@/lib/store';
import { getWorkspaces } from '@/lib/store/local-workspaces';
import { cloneTemplate, listTemplatesByScope } from '@/lib/store/templates';
import { FAVORITES_EVENT, listFavorites } from '@/lib/store/favorites';
import type { Form } from '@/types';

export default function DashboardHome() {
  const forms = useForms();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Synchro favoris
  useEffect(() => {
    function refresh() {
      setFavorites(new Set(listFavorites()));
    }
    refresh();
    window.addEventListener(FAVORITES_EVENT, refresh);
    return () => window.removeEventListener(FAVORITES_EVENT, refresh);
  }, []);

  // Données dérivées
  const totalForms = forms.filter((f) => !f.is_template).length;
  const drafts = forms.filter((f) => !f.is_template && f.status === 'draft');
  const published = forms.filter((f) => !f.is_template && f.status === 'published');
  const recentForms = useMemo(
    () =>
      [...forms]
        .filter((f) => !f.is_template)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    [forms]
  );

  const favoriteTemplates = useMemo(() => {
    const buckets = listTemplatesByScope(forms);
    const all = [...buckets.global, ...buckets.workspace, ...buckets.personal];
    return all.filter((t) => favorites.has(t.id)).slice(0, 4);
  }, [forms, favorites]);

  // Réponses du mois — placeholder en attendant la collecte
  const responsesThisMonth = '—';

  async function handleNew() {
    try {
      // S'assurer que le workspace personnel existe
      const { initDefaultWorkspace } = await import('@/lib/store/local-workspaces');
      initDefaultWorkspace('local-user');

      // Récupérer le workspace personnel pour associer le formulaire
      const workspaces = getWorkspaces();
      const personalWorkspace = workspaces.find(w => w.scope === 'personal');

      if (!personalWorkspace) {
        console.error('Aucun workspace personnel trouvé');
        // Créer le formulaire sans workspace en fallback
        const f = await createForm('Nouveau formulaire');
        router.push(`/forms/${f.id}/edit`);
        return;
      }

      const f = await createForm('Nouveau formulaire', personalWorkspace.id);
      router.push(`/forms/${f.id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
  }

  async function handleUseTemplate(template: Form) {
    try {
      const cloned = await cloneTemplate(template);
      router.push(`/forms/${cloned.id}/edit`);
    } catch (error) {
      console.error('Failed to clone template:', error);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Bonjour.</h1>
          <p className="papyrus-meta mt-1 text-sm not-italic">
            i. Voici l&apos;état de vos formulaires aujourd&apos;hui
          </p>
        </div>
        <Button variant="cta" iconLeft={<Plus className="h-4 w-4" />} onClick={handleNew}>
          Nouveau formulaire
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Formulaires" value={formatCount(totalForms)} icon={<FileText className="h-4 w-4" />} />
        <StatCard
          label="Publiés"
          value={formatCount(published.length)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Brouillons"
          value={formatCount(drafts.length)}
          icon={<Pencil className="h-4 w-4" />}
        />
        <StatCard
          label="Réponses (mois)"
          value={responsesThisMonth}
          icon={<Sparkles className="h-4 w-4" />}
          hint="bientôt"
        />
      </div>

      {/* Modèles favoris */}
      <section>
        <SectionHeader
          title="Vos modèles favoris"
          icon={<Star className="h-4 w-4 fill-mooove-amber text-mooove-amber" />}
          linkHref="/templates"
          linkLabel="Voir tous les modèles"
        />
        {favoriteTemplates.length === 0 ? (
          <FavoritesEmpty />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {favoriteTemplates.map((t) => (
              <FavoriteTemplateCard key={t.id} template={t} onUse={() => handleUseTemplate(t)} />
            ))}
          </div>
        )}
      </section>

      {/* Formulaires récents */}
      <section>
        <SectionHeader
          title="Formulaires récents"
          icon={<FileText className="h-4 w-4 text-text-secondary" />}
          linkHref="/forms"
          linkLabel="Tout voir"
        />
        {recentForms.length === 0 ? (
          <EmptyForms onCreate={handleNew} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recentForms.map((f) => (
              <FormCard key={f.id} form={f} />
            ))}
          </div>
        )}
      </section>

      {/* Brouillons inachevés — n'affiche que s'il y en a, et qu'ils ne sont pas déjà tous dans Récents */}
      {drafts.length > 0 && (
        <section>
          <SectionHeader
            title={`Brouillons inachevés (${drafts.length})`}
            icon={<Pencil className="h-4 w-4 text-text-secondary" />}
          />
          <div className="space-y-1.5">
            {drafts.slice(0, 5).map((f) => (
              <Link
                key={f.id}
                href={`/forms/${f.id}/edit`}
                className="flex items-center justify-between rounded-md border border-border bg-bg-surface px-4 py-2.5 transition hover:border-border-strong hover:bg-bg-elevated"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span className="truncate text-sm text-text-primary">{f.title}</span>
                </div>
                <span className="papyrus-meta shrink-0 text-xs">
                  Édité {new Date(f.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Bandeau de section avec lien optionnel "Voir tout"
// ============================================================================
function SectionHeader({
  title,
  icon,
  linkHref,
  linkLabel
}: {
  title: string;
  icon: React.ReactNode;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1 text-xs text-text-secondary transition hover:text-text-primary"
        >
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5">
      <div className="flex items-center gap-2 text-text-secondary">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      {hint && <div className="papyrus-meta mt-1 text-xs">{hint}</div>}
    </div>
  );
}

function FormCard({ form }: { form: Form }) {
  return (
    <Link
      href={`/forms/${form.id}`}
      className="group block rounded-lg border border-border bg-bg-surface p-4 transition hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="font-display text-lg">{form.title}</div>
        <StatusBadge status={form.status} />
      </div>
      <div className="papyrus-meta mt-1 text-xs">
        Mis à jour {new Date(form.updated_at).toLocaleDateString('fr-FR')} ·{' '}
        {form.fields?.length ?? 0} champ{(form.fields?.length ?? 0) > 1 ? 's' : ''}
      </div>
    </Link>
  );
}

function FavoriteTemplateCard({ template, onUse }: { template: Form; onUse: () => void }) {
  const Icon = resolveIcon(template.template_icon);
  return (
    <button
      type="button"
      onClick={onUse}
      className="group flex flex-col items-start gap-2 rounded-lg border border-border bg-bg-surface p-4 text-left transition hover:border-accent hover:shadow-sm"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-elevated text-text-secondary group-hover:bg-accent/10 group-hover:text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-base leading-tight text-text-primary">{template.title}</div>
      {template.template_category && (
        <div className="papyrus-meta text-[11px]">i. {template.template_category}</div>
      )}
      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent opacity-0 transition group-hover:opacity-100">
        Utiliser <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function FavoritesEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-6 text-center">
      <LayoutTemplate className="mx-auto h-7 w-7 text-text-tertiary" />
      <p className="papyrus-meta mt-2 text-sm">
        i. Aucun modèle favori. Cliquez sur l&apos;étoile d&apos;un modèle pour l&apos;épingler ici.
      </p>
      <Link
        href="/templates"
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Explorer la bibliothèque
      </Link>
    </div>
  );
}

function EmptyForms({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
      <FileText className="mx-auto h-10 w-10 text-text-tertiary" />
      <h3 className="mt-4 font-display text-xl">Aucun formulaire pour l&apos;instant</h3>
      <p className="papyrus-meta mt-1 text-sm">i. Commencez par créer votre premier Papyrus</p>
      <Button variant="cta" className="mt-5" iconLeft={<Plus className="h-4 w-4" />} onClick={onCreate}>
        Créer un formulaire
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="published">Publié</Badge>;
  if (status === 'closed') return <Badge variant="closed">Clos</Badge>;
  return <Badge variant="draft">Brouillon</Badge>;
}

/** Résout un nom d'icône Lucide en composant. */
function resolveIcon(name?: string): React.ComponentType<{ className?: string }> {
  if (!name) return LayoutTemplate;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib = Icons as any;
  return (lib[name] as React.ComponentType<{ className?: string }>) ?? LayoutTemplate;
}
