const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

let cachedGoogleToken = {
    accessToken: '',
    expiresAt: 0,
    cacheKey: '',
};

let cachedPrivateKey = {
    cacheKey: '',
    cryptoKey: null,
};

function encodeBase64Url(input) {
    const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
    let binary = '';

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem) {
    const normalizedPem = String(pem || '')
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');

    const binary = atob(normalizedPem);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
}

async function importPrivateKey(privateKey, cacheKey) {
    if (cachedPrivateKey.cacheKey === cacheKey && cachedPrivateKey.cryptoKey) {
        return cachedPrivateKey.cryptoKey;
    }

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToArrayBuffer(privateKey),
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        false,
        ['sign']
    );

    cachedPrivateKey = {
        cacheKey,
        cryptoKey,
    };

    return cryptoKey;
}

async function fetchWithRetry(url, init = {}, options = {}) {
    const {
        retries = 2,
        baseDelayMs = 300,
    } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(url, init);
            if (response.status < 500 && response.status !== 429) {
                return response;
            }

            if (attempt >= retries) {
                return response;
            }
        } catch (error) {
            lastError = error;
            if (attempt >= retries) {
                throw error;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (2 ** attempt)));
    }

    throw lastError || new Error('Request failed');
}

export function readGoogleServiceAccount(env = {}) {
    const rawJson = String(env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
    if (!rawJson) {
        throw new Error('缺少 FIREBASE_SERVICE_ACCOUNT_JSON，无法访问会员兑换记录。');
    }

    try {
        return JSON.parse(rawJson);
    } catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON 不是有效的 JSON。');
    }
}

export async function getGoogleCloudAccessToken(env, scope = CLOUD_PLATFORM_SCOPE) {
    const serviceAccount = readGoogleServiceAccount(env);
    const cacheKey = `${serviceAccount.client_email}:${serviceAccount.private_key_id}:${scope}`;
    const now = Math.floor(Date.now() / 1000);

    if (
        cachedGoogleToken.cacheKey === cacheKey &&
        cachedGoogleToken.accessToken &&
        cachedGoogleToken.expiresAt - 60 > now
    ) {
        return cachedGoogleToken.accessToken;
    }

    const header = encodeBase64Url(JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
    }));
    const payload = encodeBase64Url(JSON.stringify({
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        scope,
        iat: now,
        exp: now + 3600,
    }));
    const signingInput = `${header}.${payload}`;
    const privateKey = await importPrivateKey(
        serviceAccount.private_key,
        `${serviceAccount.client_email}:${serviceAccount.private_key_id}`
    );
    const signatureBuffer = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(signingInput)
    );
    const assertion = `${signingInput}.${encodeBase64Url(new Uint8Array(signatureBuffer))}`;

    const response = await fetchWithRetry('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }).toString(),
    }, {
        retries: 2,
        baseDelayMs: 350,
    });

    const payloadJson = await response.json().catch(() => ({}));
    if (!response.ok || !payloadJson.access_token) {
        throw new Error(payloadJson.error_description || payloadJson.error || '获取 Google 访问令牌失败。');
    }

    cachedGoogleToken = {
        accessToken: payloadJson.access_token,
        expiresAt: now + Number(payloadJson.expires_in || 3600),
        cacheKey,
    };

    return payloadJson.access_token;
}
