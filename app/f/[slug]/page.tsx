import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Form } from '@/types';
import { FormPublicView } from '@/components/public/FormPublicView';

interface PageProps {
  params: {
    slug: string;
  };
}

/** Récupère un formulaire par son slug depuis Supabase (lecture publique) */
async function getFormBySlug(slug: string): Promise<Form | null> {
  const supabase = createClient();

  const { data: form, error } = await supabase
    .from('forms')
    .select(`
      *,
      fields(*),
      logic_rules(*)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Tri des champs par field_order
  return {
    ...form,
    fields: form.fields?.sort((a: any, b: any) => a.field_order - b.field_order) || [],
    logic_rules: form.logic_rules || []
  };
}

export default async function FormPublicPage({ params }: PageProps) {
  const form = await getFormBySlug(params.slug);

  if (!form) {
    notFound();
  }

  const isExpired = form.closes_at ? new Date(form.closes_at) < new Date() : false;

  if (isExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-6 text-center">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Ce formulaire est fermé
          </h1>
          <p className="text-sm text-text-secondary">
            La date limite pour répondre à ce formulaire ({new Date(form.closes_at!).toLocaleString('fr-FR')}) est dépassée.
          </p>
        </div>
      </div>
    );
  }

  if (form.status !== 'published') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-6 text-center">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Ce formulaire n&apos;est plus disponible
          </h1>
          <p className="text-sm text-text-secondary">
            Le propriétaire de ce formulaire l&apos;a repassé en brouillon ou l&apos;a archivé.
          </p>
        </div>
      </div>
    );
  }

  return <FormPublicView form={form} />;
}

export async function generateMetadata({ params }: PageProps) {
  const form = await getFormBySlug(params.slug);
  const isExpired = form?.closes_at ? new Date(form.closes_at) < new Date() : false;

  if (!form || form.status !== 'published' || isExpired) {
    return {
      title: 'Formulaire indisponible',
    };
  }

  return {
    title: form.title,
    description: form.description || `Répondre au formulaire ${form.title}`,
  };
}