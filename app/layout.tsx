import type { Metadata } from 'next';
import '../styles/globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { ChatProvider } from '@/components/ChatProvider';

export const metadata: Metadata = {
  title: 'opensource.manager',
  description: 'Local-first open source project management suite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          const t = localStorage.getItem('theme');
          if (t) document.documentElement.setAttribute('data-theme', t);
        `}} />
      </head>
      <body>
        <AppShell>
          <ChatProvider>{children}</ChatProvider>
        </AppShell>
      </body>
    </html>
  );
}