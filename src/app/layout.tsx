import type { Metadata, Viewport } from 'next';
import { Alegreya_Sans, Grenze, Grenze_Gotisch } from 'next/font/google';
import './globals.css';

const gothic = Grenze_Gotisch({
  weight: ['700', '800'],
  subsets: ['latin'],
  variable: '--font-grenze-gotisch',
  display: 'swap',
});

const roman = Grenze({
  weight: ['700', '800'],
  subsets: ['latin'],
  variable: '--font-grenze',
  display: 'swap',
});

const sans = Alegreya_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-alegreya-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forja',
  description: 'Temporada 1: Operação Réveillon. Estudo, academia e cardio até 23/12.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EAE0CA' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1612' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${gothic.variable} ${roman.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
