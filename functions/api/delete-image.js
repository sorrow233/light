import { authorizeImageAccess } from './_imageAccess.js';
import { extractObjectKeyFromPublicUrl, parseR2Config, signedR2Fetch } from './_r2.js';

/**
 * R2 图片删除 API
 *
 * 功能：删除 R2 中的图片文件
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Access-Token'
};

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 解析 R2 配置
        let r2Config;
        try {
            r2Config = parseR2Config(env);
        } catch (configError) {
            return new Response(JSON.stringify({ error: configError.message || 'Missing R2 configuration' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. 验证用户白名单
        const accessResult = await authorizeImageAccess(request, env);
        if (!accessResult.authorized) {
            return new Response(JSON.stringify({ error: accessResult.reason || 'Unauthorized' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. 获取要删除的图片 URL
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return new Response(JSON.stringify({ error: 'No URL provided' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. 从 URL 提取文件路径
        const urlPath = extractObjectKeyFromPublicUrl(url, r2Config.publicUrl);

        if (!urlPath || !urlPath.startsWith('inspiration/')) {
            return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. 调用 R2 删除 API
        const deleteResponse = await signedR2Fetch({
            method: 'DELETE',
            config: r2Config,
            objectKey: urlPath,
            retries: 2
        });

        // R2 删除成功返回 204，文件不存在也返回 204
        if (!deleteResponse.ok && deleteResponse.status !== 204) {
            const errorText = await deleteResponse.text();
            console.error('R2 delete failed:', errorText);
            return new Response(JSON.stringify({ error: 'Delete failed', details: errorText }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            deleted: urlPath
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete API error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
