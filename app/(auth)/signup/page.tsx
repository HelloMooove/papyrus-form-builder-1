'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IS_LOCAL_MODE } from '@/lib/mode';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (IS_LOCAL_MODE) router.replace('/dashboard');
  }, [router]);

  if (IS_LOCAL_MODE) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <p className="papyrus-meta text-sm">i. Mode local — redirection en cours…</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { team_name: companyName || 'Mon équipe' },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Sauvegarder le nom d'entreprise en localStorage si renseigné
    if (companyName.trim()) {
      localStorage.setItem('papyrus_user_company', companyName.trim());
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl">Créez votre Papyrus.</h1>
        <p className="papyrus-meta mt-2 text-sm not-italic">i. Une équipe sera créée automatiquement</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            name="companyName"
            label="Nom de votre entreprise"
            placeholder="ex : Mooove Studio, Freelance, ..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-text-tertiary italic">
            Optionnel — laissez vide si vous utilisez Papyrus à titre perso
          </p>
        </div>
        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          placeholder="vous@mooove.live"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="8 caractères minimum"
          minLength={8}
        />
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" variant="cta" className="w-full" loading={loading}>
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-accent-bold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
