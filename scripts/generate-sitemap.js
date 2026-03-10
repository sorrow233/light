import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import seoConfig from '../seo-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

function generateSitemap() {
    console.log('Generating sitemap...');

    const urls = [];
    const pages = Object.keys(seoConfig.pages);

    pages.forEach(pagePath => {
        seoConfig.supportedLangs.forEach(lang => {
            const canonicalUrl = seoConfig.getCanonicalUrl(pagePath, lang);
            const alternates = seoConfig.getAlternateLinks(pagePath);

            const xhtmlLinks = alternates.map(link => {
                return `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${link.href}"/>`;
            }).join('\n');

            const urlEntry = `
  <url>
    <loc>${canonicalUrl}</loc>
${xhtmlLinks}
    <changefreq>weekly</changefreq>
    <priority>${pagePath === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
            urls.push(urlEntry);
        });
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('')}
</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, sitemapContent);
    console.log(`Sitemap generated at: ${SITEMAP_PATH}`);
}

generateSitemap();
