import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Form } from '@/types';
import { FormPublicView } from '@/components/public/FormPublicView';

interface PageProps {
  params: {
    slug: string;
  };
}

/** Récupère un formulaire publié par son slug depuis Supabase (lecture publique) */
async function getPublishedForm(slug: string): Promise<Form | null> {
  const supabase = createClient();

  const { data: form, error } = await supabase
    .from('forms')
    .select(`
      *,
      fields(*),
      logic_rules(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
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
  const form = await getPublishedForm(params.slug);

  if (!form) {
    notFound();
  }

  return <FormPublicView form={form} />;
}

export async function generateMetadata({ params }: PageProps) {
  const form = await getPublishedForm(params.slug);

  if (!form) {
    return {
      title: 'Formulaire introuvable',
    };
  }

  return {
    title: form.title,
    description: form.description || `Répondre au formulaire ${form.title}`,
  };
}