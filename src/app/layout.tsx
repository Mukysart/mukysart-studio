import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { getGoogleFontUrl, localFonts } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Mukysart Studio',
  description: 'A production-ready graphics design web application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontFaceStyles = localFonts.map(font => 
    font.variants.map(variant => `
      @font-face {
        font-family: '${font.family}';
        src: url('${variant.url}') format('woff2');
        font-weight: ${variant.weight};
        font-style: ${variant.style};
        font-display: swap;
      }
    `).join('')
  ).join('');

  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href={getGoogleFontUrl()}
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: fontFaceStyles }} />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
