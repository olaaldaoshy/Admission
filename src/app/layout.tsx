import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: 'Admissions CRM',
  description: 'School admissions and interview management system',
  openGraph: {
    title: 'Admissions CRM',
    description: 'School admissions and interview management system',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&family=Noto+Sans+Arabic:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function handleChunkError(err) {
                  var message = (err && (err.message || (err.reason && err.reason.message))) || '';
                  if (message.indexOf('ChunkLoadError') !== -1 || message.indexOf('Loading chunk') !== -1) {
                    var key = 'chunk_reload_retry';
                    var now = Date.now();
                    var last = parseInt(sessionStorage.getItem(key) || '0', 10);
                    if (now - last > 5000) {
                      sessionStorage.setItem(key, String(now));
                      window.location.reload();
                    }
                  }
                }
                window.addEventListener('error', handleChunkError);
                window.addEventListener('unhandledrejection', handleChunkError);
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-[#f8f9fa]">
        <FirebaseClientProvider>
          <LanguageProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 w-full py-10 px-4 md:px-10">
                {children}
              </main>
            </div>
            <Toaster />
          </LanguageProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
