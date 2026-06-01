'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Plus, Search, Send, SquareSlash, Trash2, User, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useForms } from '@/lib/store/use-forms';
import { createForm, deleteForm } from '@/lib/store';
import { CURRENT_USER_ID } from '@/lib/mode';
import { cn } from '@/lib/utils';
import type { Form, FormStatus } from '@/types';

type OwnerFilter = 'mine' | 'shared';
type StatusFilter = 'all' | FormStatus;

const OWNER_FILTERS: { value: OwnerFilter; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { value: 'mine', label: 'Mes formulaires', icon: User, hint: 'Ceux que vous avez créés' },
  { value: 'shared', label: 'Partagés', icon: Users, hint: 'Ceux de votre équipe' }
];

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'Tous', icon: FileText },
  { value: 'draft', label: 'Brouillon', icon: Pencil },
  { value: 'published', label: 'Publié', icon: Send },
  { value: 'closed', label: 'Clos', icon: SquareSlash }
];

export default function FormsListPage() {
  const allForms = useForms();
  const router = useRouter();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('mine');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>(CURRENT_USER_ID);

  // Charger l'ID utilisateur réel si en mode Supabase
  useEffect(() => {
    const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
    if (!isLocal) {
      const loadUser = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setCurrentUserId(user.id);
          }
        } catch (error) {
          console.error('Failed to load user session:', error);
        }
      };
      loadUser();
    }
  }, []);

  // On exclut les templates de la liste des formulaires.
  const userForms = useMemo(() => allForms.filter((f) => !f.is_template), [allForms]);

  // Compteurs propriété (mine / shared) — indépendants du filtre statut
  const ownerCounts = useMemo(() => {
    let mine = 0;
    let shared = 0;
    for (const f of userForms) {
      if (f.created_by === currentUserId) mine++;
      else shared++;
    }
    return { mine, shared };
  }, [userForms, currentUserId]);

  // Forms restreints au filtre propriétaire — utilisé pour les compteurs de statut + filtrage final
  const ownedForms = useMemo(
    () =>
      userForms.filter((f) =>
        ownerFilter === 'mine' ? f.created_by === currentUserId : f.created_by !== currentUserId
      ),
    [userForms, ownerFilter, currentUserId]
  );

  // Compteurs par statut (sur la sous-liste owner) — reflètent ce que l'utilisateur va voir
  const statusCounts = useMemo(() => {
    const c = { all: ownedForms.length, draft: 0, published: 0, closed: 0 };
    for (const f of ownedForms) c[f.status]++;
    return c;
  }, [ownedForms]);

  // Filtrage final = propriétaire + statut + recherche
  const filtered = useMemo(() => {
    const byStatus = ownedForms.filter((f) => statusFilter === 'all' || f.status === statusFilter);
    if (!search.trim()) return byStatus;
    const q = search.trim().toLowerCase();
    return byStatus.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q)
    );
  }, [ownedForms, statusFilter, search]);

  async function handleNew() {
    try {
      const f = await createForm();
      router.push(`/forms/${f.id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
  }

  async function handleDelete(id: string, title: string) {
    if (confirm(`Supprimer "${title}" ?`)) {
      try {
        await deleteForm(id);
      } catch (error) {
        console.error('Failed to delete form:', error);
        // TODO: Afficher une notification d'erreur à l'utilisateur
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* En-tête */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Formulaires</h1>
          <p className="papyrus-meta mt-1 text-sm not-italic">
            i. {userForms.length} formulaire{userForms.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Button variant="cta" iconLeft={<Plus className="h-4 w-4" />} onClick={handleNew}>
          Nouveau formulaire
        </Button>
      </div>

      {/* Filtres + recherche */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filtre propriétaire — en pill (segmented) */}
          <div className="flex gap-1 rounded-md border border-border bg-bg-surface p-0.5">
            {OWNER_FILTERS.map(({ value, label, icon: Icon }) => {
              const active = ownerFilter === value;
              const count = ownerCounts[value];
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOwnerFilter(value)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm transition',
                    active
                      ? 'bg-bg-elevated text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
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

          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un formulaire…" />
        </div>

        {/* Filtre statut — chips libres */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-text-tertiary">Statut :</span>
          {STATUS_FILTERS.map(({ value, label, icon: Icon }) => {
            const active = statusFilter === value;
            const count = statusCounts[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                  active
                    ? 'border-accent bg-accent/5 text-text-primary'
                    : 'border-border-strong text-text-secondary hover:border-accent'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
                <span className={cn('text-[10px]', active ? 'text-accent' : 'text-text-tertiary')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="papyrus-meta -mt-3 text-xs">
        i. {OWNER_FILTERS.find((f) => f.value === ownerFilter)?.hint}
      </p>

      {/* Contenu */}
      {filtered.length === 0 ? (
        <EmptyState
          isSearch={!!search.trim()}
          ownerFilter={ownerFilter}
          statusFilter={statusFilter}
          onCreate={handleNew}
          onClearSearch={() => setSearch('')}
          onClearStatus={() => setStatusFilter('all')}
        />
      ) : (
        <FormsTable forms={filtered} onDelete={handleDelete} />
      )}
    </div>
  );
}

// ============================================================================
// Barre de recherche réutilisable
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

// ============================================================================
// Tableau
// ============================================================================
function FormsTable({
  forms,
  onDelete
}: {
  forms: Form[];
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
      <table className="w-full">
        <thead className="border-b border-border bg-bg-elevated/50 text-left text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-4 py-3 font-medium">Titre</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Mis à jour</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {forms.map((f, i) => (
            <tr key={f.id} className={i < forms.length - 1 ? 'border-b border-dashed border-border' : ''}>
              <td className="px-4 py-3">
                <Link href={`/forms/${f.id}`} className="font-display text-base hover:underline">
                  {f.title}
                </Link>
                <div className="text-xs text-text-tertiary">/{f.slug}</div>
              </td>
              <td className="px-4 py-3">
                {f.status === 'published' && <Badge variant="published">Publié</Badge>}
                {f.status === 'draft' && <Badge variant="draft">Brouillon</Badge>}
                {f.status === 'closed' && <Badge variant="closed">Clos</Badge>}
              </td>
              <td className="px-4 py-3 text-sm capitalize text-text-secondary">{f.display_mode}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {new Date(f.updated_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDelete(f.id, f.title)}
                  className="text-text-tertiary transition hover:text-danger"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Empty states
// ============================================================================
function EmptyState({
  isSearch,
  ownerFilter,
  statusFilter,
  onCreate,
  onClearSearch,
  onClearStatus
}: {
  isSearch: boolean;
  ownerFilter: OwnerFilter;
  statusFilter: StatusFilter;
  onCreate: () => void;
  onClearSearch: () => void;
  onClearStatus: () => void;
}) {
  if (isSearch) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <Search className="mx-auto h-8 w-8 text-text-tertiary" />
        <h3 className="mt-3 font-display text-lg">Aucun résultat</h3>
        <p className="papyrus-meta mt-1 text-sm">i. Aucun formulaire ne correspond à votre recherche.</p>
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

  if (statusFilter !== 'all') {
    const statusLabel = STATUS_FILTERS.find((s) => s.value === statusFilter)?.label.toLowerCase() ?? '';
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <SquareSlash className="mx-auto h-8 w-8 text-text-tertiary" />
        <h3 className="mt-3 font-display text-lg">Aucun formulaire en {statusLabel}</h3>
        <p className="papyrus-meta mt-1 text-sm">
          i. Rien à afficher avec ce filtre dans {ownerFilter === 'mine' ? 'vos formulaires' : 'les partagés'}.
        </p>
        <button
          type="button"
          onClick={onClearStatus}
          className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <X className="h-3.5 w-3.5" /> Voir tous les statuts
        </button>
      </div>
    );
  }

  if (ownerFilter === 'shared') {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
        <Users className="mx-auto h-8 w-8 text-text-tertiary" />
        <h3 className="mt-3 font-display text-lg">Aucun formulaire partagé</h3>
        <p className="papyrus-meta mt-1 text-sm">
          i. Quand un membre de votre équipe partagera un formulaire, il apparaîtra ici.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-16 text-center">
      <FileText className="mx-auto h-10 w-10 text-text-tertiary" />
      <h3 className="mt-4 font-display text-xl">Aucun formulaire pour l&apos;instant</h3>
      <p className="papyrus-meta mt-1 text-sm">i. Commencez par créer votre premier Papyrus</p>
      <Button variant="cta" className="mt-5" iconLeft={<Plus className="h-4 w-4" />} onClick={onCreate}>
        Créer un formulaire
      </Button>
    </div>
  );
}
