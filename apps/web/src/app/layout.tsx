import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@noma/ui/foundations.css';
import '@noma/ui/components.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Noma',
  description: 'Controlled Covenant University marketplace pilot runtime scaffold.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
