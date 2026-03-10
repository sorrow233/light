/**
 * R2 图片删除服务
 * 用于在删除灵感卡片时清理关联的图片
 */

// 图片 URL 正则匹配（与 InspirationUtils 保持一致）
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)/gi;
const R2_IMAGE_REGEX = /(https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+)/gi;

/**
 * 从文本内容中提取所有图片 URL
 */
export function extractImageUrls(content) {
    if (!content) return [];

    const matches1 = content.match(IMAGE_URL_REGEX) || [];
    const matches2 = content.match(R2_IMAGE_REGEX) || [];

    // 只返回 R2 的图片 URL（我们只能删除自己的图片）
    return [...new Set([...matches1, ...matches2])].filter(url =>
        url.includes('.r2.dev/')
    );
}

/**
 * 删除 R2 中的图片
 * @param {string} url - 图片的公开 URL
 * @param {string} userId - 用户 UID（用于权限验证）
 * @returns {Promise<boolean>} - 是否删除成功
 */
export async function deleteImage(url, userId) {
    if (!url || !userId) return false;

    // 只处理 R2 图片
    if (!url.includes('.r2.dev/')) return true;

    try {
        const response = await fetch('/api/delete-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const result = await response.json();
            console.warn('Failed to delete image:', result.error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Delete image error:', err);
        return false;
    }
}

/**
 * 删除内容中的所有 R2 图片
 * @param {string} content - 卡片内容
 * @param {string} userId - 用户 UID
 * @returns {Promise<number>} - 成功删除的图片数量
 */
export async function deleteImagesInContent(content, userId) {
    const urls = extractImageUrls(content);

    if (urls.length === 0) return 0;

    // 并发删除所有图片
    const results = await Promise.allSettled(
        urls.map(url => deleteImage(url, userId))
    );

    return results.filter(r => r.status === 'fulfilled' && r.value === true).length;
}
