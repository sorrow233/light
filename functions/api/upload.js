import { authorizeImageAccess } from './_imageAccess.js';
import { buildStoragePublicUrl, resolveR2Storage, uploadToR2Storage } from './_r2Storage.js';

/**
 * R2 图片上传 API
 *
 * 功能：
 * 1. 接收前端上传的图片
 * 2. 验证用户 UID 白名单
 * 3. 上传到 Cloudflare R2
 * 4. 返回公开访问 URL
 *
 * 环境变量（在 Cloudflare Pages Dashboard 配置）:
 * - R2_CONFIG: JSON 字符串，包含所有 R2 配置
 *   格式: {"accessKeyId":"xxx","secretAccessKey":"xxx","bucket":"flowstudio","endpoint":"https://xxx.r2.cloudflarestorage.com","publicUrl":"https://pub-xxx.r2.dev"}
 * - UPLOAD_WHITELIST: 允许上传的用户 UID 列表，逗号分隔
 *   格式: "uid1,uid2,uid3"
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Access-Token'
};

/**
 * 生成唯一文件名
 */
function generateFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    return `inspiration/${timestamp}-${random}.${ext}`;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 解析 R2 配置
        let r2Storage;
        try {
            r2Storage = resolveR2Storage(env);
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

        // 3. 解析上传的文件
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({ error: 'Invalid file type. Only images allowed.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. 限制文件大小 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return new Response(JSON.stringify({ error: 'File too large. Max 10MB.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 6. 生成文件名并上传到 R2
        const fileName = generateFileName(file.name);
        const fileBuffer = await file.arrayBuffer();
        const uploadResponse = await uploadToR2Storage(r2Storage, {
            objectKey: fileName,
            body: fileBuffer,
            contentType: file.type,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('R2 upload failed:', errorText);
            return new Response(JSON.stringify({
                error: 'Upload to R2 failed',
                details: errorText.slice(0, 500),
                status: uploadResponse.status
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 7. 返回公开 URL
        const imageUrl = buildStoragePublicUrl(r2Storage, fileName);

        return new Response(JSON.stringify({
            success: true,
            url: imageUrl,
            fileName
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload API error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
