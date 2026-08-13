import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@noma/ui/foundations.css';
import '@noma/ui/components.css';
import '@noma/ui/commerce.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Noma',
    template: '%s | Noma',
  },
  description: 'Noma marketplace for the controlled Covenant University pilot.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
