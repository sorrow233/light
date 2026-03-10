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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/**
 * 生成 AWS Signature V4 签名
 * R2 使用 S3 兼容 API，需要 AWS V4 签名
 */
async function signRequest(method, url, headers, body, credentials) {
    const { accessKeyId, secretAccessKey, region = 'auto' } = credentials;
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const urlObj = new URL(url);
    const canonicalUri = urlObj.pathname;
    const canonicalQueryString = urlObj.search.slice(1);

    // 添加必要的 headers
    headers['x-amz-date'] = amzDate;
    headers['x-amz-content-sha256'] = body ? await sha256Hex(body) : 'UNSIGNED-PAYLOAD';
    headers['host'] = urlObj.host;

    // 生成 canonical headers
    const signedHeadersList = Object.keys(headers)
        .filter(k => k.toLowerCase().startsWith('x-amz-') || k.toLowerCase() === 'host' || k.toLowerCase() === 'content-type')
        .sort();
    const canonicalHeaders = signedHeadersList
        .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
        .join('\n') + '\n';
    const signedHeaders = signedHeadersList.map(k => k.toLowerCase()).join(';');

    // Canonical request
    const payloadHash = headers['x-amz-content-sha256'];
    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        await sha256Hex(canonicalRequest)
    ].join('\n');

    // Signing key
    const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');

    // Signature
    const signature = await hmacSha256Hex(kSigning, stringToSign);

    // Authorization header
    headers['Authorization'] = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
}

async function sha256Hex(data) {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, data) {
    const encoder = new TextEncoder();
    const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer));
}

async function hmacSha256Hex(key, data) {
    const result = await hmacSha256(key, data);
    return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
        let r2Config;
        try {
            r2Config = JSON.parse(env.R2_CONFIG || '{}');
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid R2_CONFIG' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { accessKeyId, secretAccessKey, bucket, endpoint, publicUrl } = r2Config;
        if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
            return new Response(JSON.stringify({ error: 'Missing R2 configuration' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. 验证用户白名单
        const whitelist = (env.UPLOAD_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean);
        const authHeader = request.headers.get('Authorization') || '';
        const userId = authHeader.replace('Bearer ', '').trim();

        if (!userId || !whitelist.includes(userId)) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not in whitelist' }), {
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
        const uploadUrl = `${endpoint}/${bucket}/${fileName}`;

        const headers = {
            'Content-Type': file.type,
            'Content-Length': file.size.toString()
        };

        const signedHeaders = await signRequest('PUT', uploadUrl, headers, new Uint8Array(fileBuffer), {
            accessKeyId,
            secretAccessKey
        });

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: signedHeaders,
            body: fileBuffer
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('R2 upload failed:', errorText);
            return new Response(JSON.stringify({ error: 'Upload to R2 failed', details: errorText }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 7. 返回公开 URL
        const imageUrl = `${publicUrl}/${fileName}`;

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
