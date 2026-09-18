export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/privacy' }],
    sitemap: 'https://uvi-uvi1.vercel.app/sitemap.xml'
  };
}
