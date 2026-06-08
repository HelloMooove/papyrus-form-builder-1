'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  LayoutTemplate,
  Link2,
  ListChecks,
  MoreHorizontal,
  Share2,
  TrendingUp,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useForm } from '@/lib/store/use-forms';
import {
  archiveForm,
  cloneForm,
  deleteForm,
  setAsTemplate,
  unarchiveForm,
  updateForm
} from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Form, Field } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/Toast';

type Tab = 'overview' | 'responses' | 'share';

function FormDashboardContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { form, loading } = useForm(params.id);
  const [tab, setTab] = useState<Tab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  // Charger le nom du workspace
  useEffect(() => {
    const fetchWorkspaceName = async () => {
      const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
      const wsId = isLocal ? form?.workspace_id : form?.team_id;
      if (!wsId) return;

      if (isLocal) {
        try {
          const { getWorkspace } = await import('@/lib/store/local-workspaces');
          const ws = getWorkspace(wsId);
          if (ws) setWorkspaceName(ws.name);
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          const res = await fetch('/api/teams');
          if (res.ok) {
            const list = await res.json();
            const ws = list.find((t: any) => t.id === wsId);
            if (ws) setWorkspaceName(ws.name);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    if (form) {
      fetchWorkspaceName();
    }
  }, [form?.workspace_id, form?.team_id, form]);

  useEffect(() => {
    const activeTab = searchParams.get('tab') as Tab;
    if (activeTab && ['overview', 'responses', 'share'].includes(activeTab)) {
      setTab(activeTab);
    }
  }, [searchParams]);

  if (loading) return null;

  if (!form) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <h1 className="font-display text-2xl">Formulaire introuvable</h1>
        <p className="papyrus-meta mt-2 text-sm not-italic">i. Ce Papyrus n&apos;existe pas (ou plus)</p>
        <Link href="/forms" className="mt-6 inline-block">
          <Button variant="secondary">← Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  async function handleClone() {
    if (!form) return;
    const cloned = await cloneForm(form.id);
    if (cloned) router.push(`/forms/${cloned.id}/edit`);
  }

  function handleArchiveToggle() {
    if (!form) return;
    if (form.status === 'closed') unarchiveForm(form.id);
    else archiveForm(form.id);
    setMenuOpen(false);
  }

  function handleToggleTemplate() {
    if (!form) return;
    setAsTemplate(form.id, !form.is_template, 'personal');
    setMenuOpen(false);
  }

  async function handleDelete() {
    if (!form) return;
    if (confirm(`Supprimer définitivement « ${form.title} » ?`)) {
      try {
        await deleteForm(form.id);
        router.push('/forms');
      } catch (error) {
        console.error('Failed to delete form:', error);
        toast.error('Impossible de supprimer le formulaire. Veuillez réessayer.');
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <Header
        form={form}
        workspaceName={workspaceName}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onClone={handleClone}
        onArchiveToggle={handleArchiveToggle}
        onToggleTemplate={handleToggleTemplate}
        onDelete={handleDelete}
      />

      {/* Stats — placeholder en attendant v0.2 */}
      <StatsRow />

      {/* Onglets */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={BarChart3}>
            Vue d&apos;ensemble
          </TabButton>
          <TabButton active={tab === 'responses'} onClick={() => setTab('responses')} icon={ListChecks}>
            Réponses
          </TabButton>
          <TabButton active={tab === 'share'} onClick={() => setTab('share')} icon={Share2}>
            Partage
          </TabButton>
        </div>
      </div>

      {/* Contenu de l'onglet */}
      {tab === 'overview' && <OverviewTab form={form} />}
      {tab === 'responses' && <ResponsesTab form={form} />}
      {tab === 'share' && <ShareTab form={form} />}
    </div>
  );
}

export default function FormDashboardPage() {
  return (
    <Suspense fallback={null}>
      <FormDashboardContent />
    </Suspense>
  );
}

// ============================================================================
// Header — titre + statut + actions
// ============================================================================
function Header({
  form,
  workspaceName,
  menuOpen,
  setMenuOpen,
  onClone,
  onArchiveToggle,
  onToggleTemplate,
  onDelete
}: {
  form: Form;
  workspaceName: string | null;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onClone: () => void;
  onArchiveToggle: () => void;
  onToggleTemplate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-4xl">{form.title}</h1>
          {form.is_template && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
              title="Ce formulaire est utilisé comme modèle"
            >
              <LayoutTemplate className="h-3 w-3" />
              Modèle
            </span>
          )}
          {form.status === 'published' && <Badge variant="published">Publié</Badge>}
          {form.status === 'draft' && <Badge variant="draft">Brouillon</Badge>}
          {form.status === 'closed' && <Badge variant="closed">Clos</Badge>}
        </div>
        <p className="papyrus-meta mt-1 text-sm not-italic flex flex-wrap items-center gap-1.5">
          <span>/{form.slug}</span>
          {workspaceName && (
            <>
              <span>·</span>
              <span className="font-semibold text-text-secondary">{workspaceName}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/forms/${form.id}/edit`}>
          <Button iconLeft={<Edit3 className="h-4 w-4" />}>Modifier</Button>
        </Link>

        {/* Menu déroulant pour les actions secondaires */}
        <div className="relative">
          <Button
            variant="secondary"
            iconLeft={<MoreHorizontal className="h-4 w-4" />}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            Actions
          </Button>
          {menuOpen && (
            <>
              {/* Fond invisible pour fermer en cliquant à côté */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-md border border-border bg-bg-surface shadow-lg">
                <MenuItem
                  icon={<Copy className="h-4 w-4" />}
                  label="Cloner"
                  hint="Crée une copie en brouillon"
                  onClick={onClone}
                />
                <MenuItem
                  icon={<LayoutTemplate className="h-4 w-4" />}
                  label={form.is_template ? 'Retirer des modèles' : 'Convertir en modèle'}
                  hint={form.is_template ? 'Repasser en formulaire normal' : 'Visible dans Mes modèles'}
                  onClick={onToggleTemplate}
                />
                <MenuItem
                  icon={
                    form.status === 'closed' ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )
                  }
                  label={form.status === 'closed' ? 'Désarchiver' : 'Archiver'}
                  hint={form.status === 'closed' ? 'Repasser en brouillon' : 'Ferme aux nouvelles réponses'}
                  onClick={onArchiveToggle}
                />
                <div className="border-t border-border" />
                <MenuItem
                  icon={<span className="block h-4 w-4 text-danger">×</span>}
                  label="Supprimer"
                  hint="Suppression définitive"
                  onClick={onDelete}
                  danger
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  danger
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-bg-elevated',
        danger ? 'text-danger hover:bg-danger/10' : 'text-text-primary'
      )}
    >
      <span className={cn('mt-0.5 shrink-0', danger ? 'text-danger' : 'text-text-secondary')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {hint && (
          <span className={cn('block text-[11px]', danger ? 'text-danger/80' : 'text-text-tertiary')}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

// ============================================================================
// Onglet boutons
// ============================================================================
function TabButton({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
        active ? 'border-accent text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// ============================================================================
// Stats (placeholder en attendant les vraies réponses — v0.2)
// ============================================================================
function StatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard label="Réponses" value="—" icon={<Users className="h-4 w-4" />} hint="bientôt" />
      <StatCard label="Vues" value="—" icon={<TrendingUp className="h-4 w-4" />} hint="bientôt" />
      <StatCard
        label="Taux complétion"
        value="—"
        icon={<BarChart3 className="h-4 w-4" />}
        hint="bientôt"
      />
      <StatCard label="Temps moyen" value="—" icon={<Clock className="h-4 w-4" />} hint="bientôt" />
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

// ============================================================================
// Onglet Vue d'ensemble — placeholder pour les graphiques par champ
// ============================================================================
function OverviewTab({ form }: { form: Form }) {
  const chartableFields = (form.fields ?? []).filter((f) =>
    ['single_choice', 'multiple_choice', 'dropdown', 'rating', 'nps', 'date'].includes(f.type)
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-10 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-text-tertiary" />
        <h3 className="mt-4 font-display text-xl">Pas encore de réponses à analyser</h3>
        <p className="papyrus-meta mx-auto mt-1 max-w-md text-sm">
          i. Quand les premières réponses arriveront (v0.2 — page publique), un graphique sera automatiquement
          généré pour chacun des {chartableFields.length} champ
          {chartableFields.length > 1 ? 's' : ''} mesurable
          {chartableFields.length > 1 ? 's' : ''} de ce formulaire.
        </p>
        {chartableFields.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {chartableFields.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="rounded-full bg-bg-elevated px-2 py-1 text-[11px] text-text-secondary"
              >
                {f.label.fr || 'Question sans titre'}
              </span>
            ))}
            {chartableFields.length > 6 && (
              <span className="text-[11px] text-text-tertiary">+{chartableFields.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Onglet Réponses — table brute + export
// ============================================================================
function ResponsesTab({ form }: { form: Form }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubmissions() {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('form_id', form.id)
          .order('completed_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setSubmissions(data || []);
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [form.id]);

  const fields = (form.fields ?? []).filter(
    (f) => f.type !== 'section_break' && f.type !== 'statement' && f.type !== 'image' && f.type !== 'video'
  );

  function renderResponseValue(field: Field, value: any) {
    if (value === undefined || value === null || value === '') return '—';

    // Résoudre les options pour les choix simples, multiples et dropdowns
    if (['single_choice', 'multiple_choice', 'dropdown'].includes(field.type)) {
      const getOptionLabel = (optId: string) => {
        const option = field.options?.find((o: any) => o.id === optId);
        return option ? (option.label.fr || option.label.en || optId) : optId;
      };

      if (Array.isArray(value)) {
        return value.map(getOptionLabel).join(', ');
      }
      if (typeof value === 'string') {
        // Au cas où les choix multiples sont stockés sous forme de chaîne à virgule
        if (value.includes(',') && !field.options?.some((o: any) => o.id === value)) {
          return value.split(',').map((v) => getOptionLabel(v.trim())).join(', ');
        }
        return getOptionLabel(value);
      }
    }

    // Résoudre pour les matrices
    if (field.type === 'matrix') {
      if (typeof value === 'object') {
        return Object.entries(value)
          .map(([rowId, colId]) => {
            const row = field.rows?.find((r: any) => r.id === rowId);
            const col = field.options?.find((c: any) => c.id === colId as string);
            const rowLabel = row ? (row.label.fr || row.label.en || rowId) : rowId;
            const colLabel = col ? (col.label.fr || col.label.en || colId) : colId;
            return `${rowLabel} : ${colLabel}`;
          })
          .join(' | ');
      }
    }

    // Fallback standard
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const data = submissions.map((sub) => {
        const row: Record<string, any> = {};
        fields.forEach((f) => {
          const headerName = f.label.fr || 'Champ sans nom';
          row[headerName] = renderResponseValue(f, sub.responses?.[f.id]);
        });
        row['Date de soumission'] = new Date(sub.completed_at).toLocaleString('fr-FR');
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Réponses');

      const slugTitle = form.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${slugTitle}-reponses-${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);
    });
  };

  if (loading) {
    return (
      <div className="py-12 text-center papyrus-meta text-sm">
        Chargement des réponses...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl">Réponses brutes</h2>
        <div className="rounded-lg border border-dashed border-border-strong bg-bg-surface p-12 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-text-tertiary" />
          <h3 className="mt-4 font-display text-xl">Aucune réponse pour l&apos;instant</h3>
          <p className="papyrus-meta mx-auto mt-1 max-w-md text-sm">
            i. Partagez le lien de votre formulaire pour commencer à collecter des réponses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">
          Réponses brutes ({submissions.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Download className="h-3.5 w-3.5" />}
            onClick={handleExportExcel}
          >
            Exporter Excel
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-border bg-bg-surface">
        <table className="w-full border-collapse text-left text-sm text-text-primary">
          <thead className="border-b border-border bg-bg-elevated text-xs font-semibold uppercase text-text-secondary">
            <tr>
              <th className="px-4 py-3 min-w-[150px]">Date de soumission</th>
              {fields.map((f) => (
                <th key={f.id} className="px-4 py-3 min-w-[200px] max-w-[350px] truncate">
                  {f.label.fr || 'Champ sans nom'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-bg-elevated transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-text-secondary">
                  {new Date(sub.completed_at).toLocaleString('fr-FR')}
                </td>
                {fields.map((f) => {
                  const val = sub.responses?.[f.id];
                  const renderedVal = renderResponseValue(f, val);
                  const isUrl = typeof renderedVal === 'string' && (renderedVal.startsWith('http://') || renderedVal.startsWith('https://'));

                  return (
                    <td key={f.id} className="px-4 py-3 max-w-[350px] truncate" title={renderedVal}>
                      {isUrl ? (
                        <a
                          href={renderedVal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          Ouvrir le fichier ↗
                        </a>
                      ) : (
                        renderedVal
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Onglet Partage — lien, QR code, embed
// ============================================================================
function ShareTab({ form }: { form: Form }) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);
  const [publishing, setPublishing] = useState(false);

  // En local mode ou production, on utilise la variable d'environnement ou le window.location
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const publicUrl = `${baseUrl}/f/${form.slug}`;

  // QR code via api.qrserver.com
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(publicUrl)}`;

  const embedSnippet = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;

  async function copy(text: string, kind: 'link' | 'embed') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      alert('Impossible de copier — copiez manuellement.');
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await updateForm(form.id, {
        status: 'published',
        published_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to publish form:', error);
      alert('Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  }

  if (form.status === 'draft') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-warning/40 bg-warning/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-warning font-medium">
            i. Publiez le formulaire pour partager le lien
          </div>
          <Button
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? 'Publication...' : 'Publier maintenant'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {form.status === 'closed' && (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          i. Ce formulaire est archivé. Il ne sera plus accessible au public à moins de le repasser en brouillon.
        </div>
      )}

      {/* Lien direct */}
      <section className="rounded-lg border border-border bg-bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-text-secondary" />
          <h3 className="font-display text-lg">Lien direct</h3>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={publicUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 flex-1 rounded-md border border-border-strong bg-bg-base px-3 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
          />
          <Button
            variant="secondary"
            iconLeft={copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            onClick={() => copy(publicUrl, 'link')}
          >
            {copied === 'link' ? 'Copié !' : 'Copier le lien'}
          </Button>
        </div>
        <p className="papyrus-meta mt-2 text-xs">
          i. Partagez ce lien — toute personne le recevant pourra remplir le formulaire (sauf si l&apos;accès est restreint).
        </p>
      </section>

      {/* QR Code + Embed côte à côte */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* QR Code */}
        <section className="rounded-lg border border-border bg-bg-surface p-5">
          <h3 className="mb-3 font-display text-lg">QR Code</h3>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-md border border-border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR code du formulaire" width={200} height={200} />
            </div>
            <a
              href={qrUrl}
              download={`papyrus-${form.slug}-qr.png`}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Télécharger le QR
            </a>
          </div>
          <p className="papyrus-meta mt-3 text-center text-xs">
            i. À imprimer ou afficher pour un événement / vitrine.
          </p>
        </section>

        {/* Embed */}
        <section className="rounded-lg border border-border bg-bg-surface p-5">
          <h3 className="mb-3 font-display text-lg">Intégration (embed)</h3>
          <textarea
            readOnly
            value={embedSnippet}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            className="w-full resize-none rounded-md border border-border-strong bg-bg-base px-3 py-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="papyrus-meta text-xs">
              i. Code à coller dans n&apos;importe quel site.
            </p>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={copied === 'embed' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              onClick={() => copy(embedSnippet, 'embed')}
            >
              {copied === 'embed' ? 'Copié' : 'Copier'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
