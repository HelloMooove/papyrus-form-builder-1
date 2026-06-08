'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleEmailConfirmation() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Récupérer les paramètres de l'URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (token_hash && type) {
          // Vérifier le token de confirmation
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            console.error('Erreur de confirmation:', error);
            setError('Lien de confirmation invalide ou expiré');
          } else {
            setConfirmed(true);
            // Redirection automatique après 3 secondes
            setTimeout(() => {
              // Vérifier s'il y a une redirection personnalisée (invitation)
              const redirectUrl = searchParams.get('redirect');
              if (redirectUrl) {
                router.push(decodeURIComponent(redirectUrl));
              } else {
                router.push('/dashboard');
              }
            }, 3000);
          }
        } else {
          setError('Paramètres de confirmation manquants');
        }
      } catch (err) {
        console.error('Erreur lors de la confirmation:', err);
        setError('Une erreur est survenue lors de la confirmation');
      } finally {
        setLoading(false);
      }
    }

    handleEmailConfirmation();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mooove-cyan/10">
          <svg className="h-8 w-8 text-mooove-cyan animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="font-display text-2xl">Confirmation en cours...</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Vérification de votre adresse email
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl">Erreur de confirmation</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {error}
        </p>
        <div className="mt-6 space-y-3">
          <Link href="/signup" className="w-full">
            <Button className="w-full">
              Créer un nouveau compte
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full">
              Se connecter
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl">Email confirmé !</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Votre compte a été activé avec succès.
        </p>
        <p className="mt-4 text-sm text-text-secondary">
          Redirection automatique dans 3 secondes...
        </p>
        <div className="mt-6">
          <Link href="/dashboard" className="w-full">
            <Button className="w-full">
              Accéder à Papyrus
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function LoadingFallback() {
  return (
    <div className="mx-auto w-full max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mooove-cyan/10">
        <svg className="h-8 w-8 text-mooove-cyan animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h1 className="font-display text-2xl">Chargement...</h1>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmContent />
    </Suspense>
  );
}