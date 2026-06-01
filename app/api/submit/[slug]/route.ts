import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Form, Field } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function uuid(): string {
  return crypto.randomUUID();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { responses, language = 'fr' } = body;

    // Récupérer le formulaire par slug
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        fields(*)
      `)
      .eq('slug', slug)
      .single();

    if (formError) {
      console.error('Erreur récupération formulaire:', formError);
      return NextResponse.json(
        { error: 'Formulaire introuvable' },
        { status: 404 }
      );
    }

    // Vérifier que le formulaire est publié
    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'Formulaire non accessible' },
        { status: 403 }
      );
    }

    // Valider les champs obligatoires
    const requiredFields = form.fields?.filter((f: Field) =>
      f.required &&
      f.type !== 'section_break' &&
      f.type !== 'statement' &&
      f.type !== 'image' &&
      f.type !== 'video'
    ) || [];

    const missingFields = requiredFields.filter((f: Field) => {
      const value = responses[f.id];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Champs obligatoires manquants',
          missingFields: missingFields.map((f: Field) => f.label.fr || f.id)
        },
        { status: 400 }
      );
    }

    // Extraire les métadonnées de la requête
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || '';

    // Hash simple de l'IP pour la confidentialité
    const ipHash = ip ? await hashString(ip) : null;

    // Créer la soumission
    const submissionId = uuid();
    const { error: submitError } = await supabase
      .from('submissions')
      .insert({
        id: submissionId,
        form_id: form.id,
        responses: responses,
        respondent_language: language,
        ip_hash: ipHash,
        user_agent: userAgent,
        completed_at: new Date().toISOString(),
        actions_triggered: []
      });

    if (submitError) {
      console.error('Erreur insertion soumission:', submitError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission_id: submissionId
    });

  } catch (error) {
    console.error('Erreur API submit:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/** Hash simple d'une chaîne pour anonymiser les IPs */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + 'papyrus-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}