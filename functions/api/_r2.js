const DEFAULT_REGION = 'auto';
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const RETRYABLE_STATUS = new Set([408, 425, 429]);
const textEncoder = new TextEncoder();

function trimSlashes(value) {
    return String(value || '').replace(/^\/+|\/+$/g, '');
}

function normalizeBaseUrl(value) {
    return String(value || '').replace(/\/+$/g, '');
}

function encodeRfc3986(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeObjectKey(objectKey) {
    const trimmed = trimSlashes(objectKey);
    if (!trimmed) {
        throw new Error('Missing object key');
    }

    return trimmed
        .split('/')
        .map((segment) => encodeRfc3986(segment))
        .join('/');
}

function buildCanonicalQueryString(urlObj) {
    return Array.from(urlObj.searchParams.entries())
        .sort(([keyA, valueA], [keyB, valueB]) => {
            if (keyA === keyB) {
                return valueA.localeCompare(valueB);
            }
            return keyA.localeCompare(keyB);
        })
        .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
        .join('&');
}

function toUint8Array(body) {
    if (body == null) {
        return new Uint8Array();
    }

    if (body instanceof Uint8Array) {
        return body;
    }

    if (body instanceof ArrayBuffer) {
        return new Uint8Array(body);
    }

    if (typeof body === 'string') {
        return textEncoder.encode(body);
    }

    throw new Error('Unsupported body type');
}

export function parseR2Config(env) {
    let config;
    try {
        config = JSON.parse(env.R2_CONFIG || '{}');
    } catch {
        throw new Error('Invalid R2_CONFIG');
    }

    const {
        accessKeyId,
        secretAccessKey,
        bucket,
        endpoint,
        publicUrl,
        region = DEFAULT_REGION
    } = config;

    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
        throw new Error('Missing R2 configuration');
    }

    return {
        accessKeyId,
        secretAccessKey,
        bucket,
        endpoint: normalizeBaseUrl(endpoint),
        publicUrl: normalizeBaseUrl(publicUrl),
        region
    };
}

export function buildR2ObjectUrl(config, objectKey) {
    const endpointUrl = new URL(config.endpoint);
    const encodedBucket = encodeRfc3986(config.bucket);
    const encodedObjectKey = normalizeObjectKey(objectKey);
    const baseSegments = endpointUrl.pathname.split('/').filter(Boolean);
    const bucketInHost = endpointUrl.hostname === config.bucket || endpointUrl.hostname.startsWith(`${config.bucket}.`);
    const bucketInPath = baseSegments[0] === config.bucket;
    const finalSegments = [...baseSegments];

    if (!bucketInHost && !bucketInPath) {
        finalSegments.push(encodedBucket);
    }

    finalSegments.push(...encodedObjectKey.split('/'));
    endpointUrl.pathname = `/${finalSegments.join('/')}`;
    endpointUrl.search = '';
    endpointUrl.hash = '';

    return endpointUrl.toString();
}

export function buildR2PublicUrl(config, objectKey) {
    return `${config.publicUrl}/${trimSlashes(objectKey)}`;
}

export function extractObjectKeyFromPublicUrl(fileUrl, publicUrl) {
    const normalizedPublicUrl = normalizeBaseUrl(publicUrl);
    if (!fileUrl || !fileUrl.startsWith(normalizedPublicUrl)) {
        return '';
    }

    return trimSlashes(fileUrl.slice(normalizedPublicUrl.length));
}

async function sha256Hex(data) {
    const dataBuffer = typeof data === 'string' ? textEncoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, data) {
    const keyBuffer = typeof key === 'string' ? textEncoder.encode(key) : key;
    const dataBuffer = typeof data === 'string' ? textEncoder.encode(data) : data;
    const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer));
}

async function hmacSha256Hex(key, data) {
    const result = await hmacSha256(key, data);
    return Array.from(result).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signRequest(method, requestUrl, headers, bodyBytes, credentials) {
    const { accessKeyId, secretAccessKey, region = DEFAULT_REGION } = credentials;
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const urlObj = new URL(requestUrl);
    const canonicalUri = urlObj.pathname || '/';
    const canonicalQueryString = buildCanonicalQueryString(urlObj);
    const payloadHash = bodyBytes.byteLength > 0 ? await sha256Hex(bodyBytes) : EMPTY_SHA256;

    headers['x-amz-content-sha256'] = payloadHash;
    headers['x-amz-date'] = amzDate;
    headers.host = urlObj.host;

    const signedHeaderNames = Object.keys(headers)
        .map((key) => key.toLowerCase())
        .sort();

    const canonicalHeaders = signedHeaderNames
        .map((headerName) => `${headerName}:${String(headers[headerName]).trim()}`)
        .join('\n') + '\n';

    const signedHeaders = signedHeaderNames.join(';');
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

    headers.authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return headers;
}

function shouldRetry(status) {
    return RETRYABLE_STATUS.has(status) || status >= 500;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function signedR2Fetch({
    method,
    config,
    objectKey,
    body = null,
    contentType = '',
    retries = 2
}) {
    const requestUrl = buildR2ObjectUrl(config, objectKey);
    const bodyBytes = toUint8Array(body);
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const headers = {};
        if (contentType) {
            headers['content-type'] = contentType;
        }

        try {
            const signedHeaders = await signRequest(method, requestUrl, headers, bodyBytes, config);
            const response = await fetch(requestUrl, {
                method,
                headers: signedHeaders,
                body: bodyBytes.byteLength > 0 ? bodyBytes : null
            });

            if (response.ok || !shouldRetry(response.status) || attempt === retries) {
                return response;
            }

            const preview = (await response.clone().text()).slice(0, 300);
            console.warn(`[R2] ${method} retry ${attempt + 1}/${retries}`, response.status, preview);
        } catch (error) {
            lastError = error;
            if (attempt === retries) {
                throw error;
            }
            console.warn(`[R2] ${method} network retry ${attempt + 1}/${retries}`, error);
        }

        await sleep(250 * (attempt + 1));
    }

    throw lastError || new Error('R2 request failed');
}
