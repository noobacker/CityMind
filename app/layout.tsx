import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import './globals.css';
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
  title: 'CityMind — A living city interface',
  description: 'A living city interface that speaks in first person. Now for any city on Earth.',
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
