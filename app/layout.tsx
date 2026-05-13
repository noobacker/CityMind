import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CityProvider } from '@/components/CityProvider';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CityMind — A Living City Interface by Noobacker',
  description: 'CityMind by Noobacker: A neural-geographic operating system that gives cities a voice. Experience real-time urban intelligence for any city on Earth.',
  keywords: ['City Mind', 'Noobacker', 'Neural Grid', 'Urban Intelligence', 'Smart City', 'Living City', 'Real-time Geography', 'Geospatial AI'],
  authors: [{ name: 'Noobacker' }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body>
        <CityProvider>{children}</CityProvider>
      </body>
    </html>
  );
}
