#!/usr/bin/env node

/**
 * Sitemap Generator
 * 读取 seo-config.js 配置，自动生成包含 4 语种 hreflang 标签的 sitemap.xml
 * 
 * 使用: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

// 从根目录加载 SEO 配置
// 注意：由于 seo-config.js 使用了 ES Module export，需要特殊处理
const configPath = path.resolve(__dirname, '../seo-config.js');
const configContent = fs.readFileSync(configPath, 'utf-8');

// 提取 seoConfig 对象（简化处理，直接内联配置）
const seoConfig = {
    siteUrl: 'https://flowstudio.catzz.work',
    defaultLang: 'zh',
    supportedLangs: ['zh', 'en', 'ja', 'ko'],
    pages: {
        '/': {},
        '/inspiration': {},
        '/pending': {},
        '/primary': {},
        '/advanced': {},
        '/final': {},
        '/commercial': {},
        '/commands': {},
    },
};

/**
 * 获取规范 URL
 */
function getCanonicalUrl(pagePath, lang) {
    const basePath = pagePath === '/' ? '' : pagePath;
    if (lang === seoConfig.defaultLang) {
        return `${seoConfig.siteUrl}${basePath || '/'}`;
    }
    return `${seoConfig.siteUrl}/${lang}${basePath || ''}`;
}

/**
 * 生成单个 URL 的 XML 块
 */
function generateUrlEntry(pagePath) {
    const lastmod = new Date().toISOString().split('T')[0];

    // 生成 hreflang 链接
    const xhtmlLinks = seoConfig.supportedLangs
        .map(lang => `      <xhtml:link rel="alternate" hreflang="${lang}" href="${getCanonicalUrl(pagePath, lang)}" />`)
        .join('\n');

    // x-default 指向默认语言版本
    const xDefaultLink = `      <xhtml:link rel="alternate" hreflang="x-default" href="${getCanonicalUrl(pagePath, seoConfig.defaultLang)}" />`;

    // 为每种语言生成独立的 URL 条目
    const urlEntries = seoConfig.supportedLangs.map(lang => {
        const loc = getCanonicalUrl(pagePath, lang);
        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${pagePath === '/' ? '1.0' : '0.8'}</priority>
${xhtmlLinks}
${xDefaultLink}
  </url>`;
    });

    return urlEntries.join('\n');
}

/**
 * 生成完整的 sitemap.xml
 */
function generateSitemap() {
    const pages = Object.keys(seoConfig.pages);

    const urlEntries = pages.map(page => generateUrlEntry(page)).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;

    return sitemap;
}

/**
 * 主函数
 */
function main() {
    console.log('🗺️  Generating sitemap.xml...\n');

    const sitemap = generateSitemap();

    // 输出到 public/sitemap.xml
    const outputDir = path.resolve(__dirname, '../public');
    const outputPath = path.join(outputDir, 'sitemap.xml');

    // 确保 public 目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sitemap, 'utf-8');

    // 统计信息
    const pageCount = Object.keys(seoConfig.pages).length;
    const langCount = seoConfig.supportedLangs.length;
    const totalUrls = pageCount * langCount;

    console.log(`✅ Sitemap generated successfully!`);
    console.log(`   📄 Pages: ${pageCount}`);
    console.log(`   🌍 Languages: ${seoConfig.supportedLangs.join(', ')}`);
    console.log(`   🔗 Total URLs: ${totalUrls}`);
    console.log(`   📁 Output: ${outputPath}\n`);

    // 显示预览
    console.log('📋 Preview (first 50 lines):');
    console.log('─'.repeat(60));
    const lines = sitemap.split('\n').slice(0, 50);
    console.log(lines.join('\n'));
    if (sitemap.split('\n').length > 50) {
        console.log('... (truncated)');
    }
    console.log('─'.repeat(60));
}

// 运行
main();
