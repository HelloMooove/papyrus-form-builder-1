import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/components/ui/Toast';

// DM Sans = le substitut libre d'Aktiv Grotesk (la police de l'identité Mooove).
// Aktiv Grotesk est sur Adobe Fonts (paywall). Si un kit Typekit est chargé côté projet,
// le navigateur prendra Aktiv Grotesk en priorité grâce au fallback CSS — sinon DM Sans.
const aktivSub = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-aktiv',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Papyrus — Form Builder',
  description: 'Créez des formulaires beaux, simples et puissants. Le successeur de Tally et Typeform.',
  icons: { icon: '/favicon.ico' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={aktivSub.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

