'use client';

import { useState } from 'react';
import '@/styles/globals.css';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TableOfContents from '@/components/TableOfContents';
import Footer from '@/components/Footer';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Agentic Playbook</title>
        <meta name="description" content="Agentic Playbook — tested guides for setting up and running AI agent systems. Covers OpenClaw, Paperclip, LangSmith Fleet, and more." />
        <meta property="og:title" content="Agentic Playbook" />
        <meta property="og:description" content="Tested guides for setting up and running AI agent systems in production." />
        <meta property="og:type" content="website" />
      </head>
      <body>
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 flex">
              <article className="flex-1 min-w-0 px-6 py-8 lg:px-10 lg:py-10 max-w-3xl mx-auto prose prose-invert prose-sm lg:prose-base">
                {children}
              </article>
              <TableOfContents />
            </div>
            <Footer />
          </main>
        </div>
      </body>
    </html>
  );
}
