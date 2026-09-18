import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';

export const metadataBase = new URL('https://uvi-uvi1.vercel.app');

export const metadata = {
  metadataBase,
  title: {
    default: "Uvi — Australia's Outdoor Adventure Hub | Camp · 4WD · Caravan · Explore",
    template: '%s · Uvi'
  },
  description:
    'Everything for the Australian outdoor lifestyle in one place — find free camps, caravan parks, 4WD tracks, dump points and fuel; plan trips with fuel and packing tools; share trips and reviews; and connect with the adventure community.',
  applicationName: 'Uvi',
  alternates: { canonical: '/' },
  icons: { icon: '/images/icon.svg', apple: '/images/apple-touch-icon.png' },
  openGraph: {
    type: 'website',
    siteName: 'Uvi',
    title: "Uvi — Australia's Outdoor Adventure Hub",
    description:
      'Camping, 4WD, caravanning, fishing and road trips — discover, plan, explore and connect, all in one place.',
    url: '/',
    images: ['/images/og-image.png']
  },
  twitter: {
    card: 'summary_large_image',
    title: "Uvi — Australia's Outdoor Adventure Hub",
    description: 'Camping, 4WD, caravanning, fishing and road trips — all in one place.',
    images: ['/images/og-image.png']
  }
};

export const viewport = {
  themeColor: '#0f1c1a',
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <head>
        {/* Add the js class before paint so reveal animations don't flash */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Uvi',
              url: 'https://uvi-uvi1.vercel.app/',
              description:
                "Australia's outdoor adventure hub for camping, 4WD, caravanning, fishing and road trips.",
              inLanguage: 'en-AU'
            })
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <AuthProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AuthProvider>
        <Reveal />
      </body>
    </html>
  );
}
