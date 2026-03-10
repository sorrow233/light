/**
 * R2 图片删除 API
 * 
 * 功能：删除 R2 中的图片文件
 * 复用 upload.js 中的签名逻辑
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// 复用签名函数
async function signRequest(method, url, headers, body, credentials) {
    const { accessKeyId, secretAccessKey, region = 'auto' } = credentials;
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const urlObj = new URL(url);
    const canonicalUri = urlObj.pathname;
    const canonicalQueryString = urlObj.search.slice(1);

    headers['x-amz-date'] = amzDate;
    headers['x-amz-content-sha256'] = body ? await sha256Hex(body) : 'UNSIGNED-PAYLOAD';
    headers['host'] = urlObj.host;

    const signedHeadersList = Object.keys(headers)
        .filter(k => k.toLowerCase().startsWith('x-amz-') || k.toLowerCase() === 'host' || k.toLowerCase() === 'content-type')
        .sort();
    const canonicalHeaders = signedHeadersList
        .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
        .join('\n') + '\n';
    const signedHeaders = signedHeadersList.map(k => k.toLowerCase()).join(';');

    const payloadHash = headers['x-amz-content-sha256'];
    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        await sha256Hex(canonicalRequest)
    ].join('\n');

    const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signature = await hmacSha256Hex(kSigning, stringToSign);

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
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
        // URL 格式: https://pub-xxx.r2.dev/inspiration/xxx.webp
        const urlPath = url.replace(publicUrl, '').replace(/^\//, '');

        if (!urlPath || !urlPath.startsWith('inspiration/')) {
            return new Response(JSON.stringify({ error: 'Invalid image URL' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. 调用 R2 删除 API
        const deleteUrl = `${endpoint}/${bucket}/${urlPath}`;
        const headers = {};

        const signedHeaders = await signRequest('DELETE', deleteUrl, headers, null, {
            accessKeyId,
            secretAccessKey
        });

        const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: signedHeaders
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
