import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MINSTOCS CRM',
  description: 'Production Engineering Foundation — MINSTOCS CRM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
