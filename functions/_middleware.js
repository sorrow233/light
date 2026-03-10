
import seoConfig from '../seo-config.js';

export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 跳过静态资源 (简单的扩展名检查)
    if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|json|map|woff|woff2|ttf)$/)) {
        return context.next();
    }

    // 2. 语言探测
    let lang = seoConfig.defaultLang;

    // 检查 URL 是否以支持的语言开头
    for (const supportedLang of seoConfig.supportedLangs) {
        if (path.startsWith(`/${supportedLang}/`) || path === `/${supportedLang}`) {
            lang = supportedLang;
            break;
        }
    }

    // 3. 获取 SEO 数据
    // getPageSeo 内部会处理移除语言前缀的逻辑
    const seoData = seoConfig.getPageSeo(path, lang);
    const canonical = seoConfig.getCanonicalUrl(path, lang);
    const alternates = seoConfig.getAlternateLinks(path);

    // 4. 获取原始响应 (可能是 index.html)
    // 注意：如果访问 /en/foo，Pages 可能会返回 404，如果没配 fallback。
    // 这里假设 default setup 会 fallback 到 index.html 或者我们需要手动处理
    let response = await context.next();

    // 如果是 404 并且是 HTML 请求，可能需要手动 fetch index.html (SPA Fallback)
    // 但通常 CF Pages 的 _routes.json 或者默认行为会处理 SPA
    // 简单起见，我们转换返回的任何 HTML 内容

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        return new HTMLRewriter()
            .on('title', {
                element(e) {
                    e.setInnerContent(seoData.title);
                }
            })
            .on('meta[name="description"]', {
                element(e) {
                    e.setAttribute('content', seoData.description);
                }
            })
            // 注入 Hreflang 和 Canonical
            .on('head', {
                element(e) {
                    let tags = '';

                    // Canonical
                    tags += `<link rel="canonical" href="${canonical}" />\n`;

                    // Hreflangs
                    alternates.forEach(link => {
                        tags += `<link rel="alternate" hreflang="${link.hreflang}" href="${link.href}" />\n`;
                    });

                    // OG Tags
                    tags += `<meta property="og:title" content="${seoData.title}" />\n`;
                    tags += `<meta property="og:description" content="${seoData.description}" />\n`;
                    tags += `<meta property="og:url" content="${canonical}" />\n`;
                    tags += `<meta property="og:site_name" content="${seoConfig.site[lang].name}" />\n`;
                    tags += `<meta property="og:locale" content="${lang}" />\n`;

                    e.append(tags, { html: true });
                }
            })
            // 注入 html lang 属性
            .on('html', {
                element(e) {
                    e.setAttribute('lang', lang);
                }
            })
            .transform(response);
    }

    return response;
}
