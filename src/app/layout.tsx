import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, IBM_Plex_Sans } from 'next/font/google';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import './globals.css';

const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-arabic',
  display: 'swap',
});

const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Eagle Eye — عين النسر',
  description: 'منصة إدارة الطلبات والعلاقات الحكومية',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmArabic.variable} ${ibmSans.variable}`}>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
