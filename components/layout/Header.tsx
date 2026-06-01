'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  forms: 'Formulaires',
  templates: 'Modèles',
  settings: 'Paramètres',
  edit: 'Édition',
  share: 'Partage'
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Construire le chemin pour chaque segment
  const buildPath = (index: number) => {
    return '/' + segments.slice(0, index + 1).join('/');
  };

  return (
    <header className="flex h-14 items-center border-b border-border bg-bg-base px-8">
      <nav className="flex items-center gap-1.5 text-xl">
        {segments.length === 0 && <span className="text-text-primary">Accueil</span>}
        {segments.map((seg, i) => {
          const label = LABELS[seg] ?? seg;
          const isLast = i === segments.length - 1;
          const path = buildPath(i);

          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
              {isLast ? (
                <span className="text-text-primary">{label}</span>
              ) : (
                <Link
                  href={path}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </header>
  );
}
