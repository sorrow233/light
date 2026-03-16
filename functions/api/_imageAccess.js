const FIREBASE_WEB_API_KEY = 'AIzaSyCrwCk7d5msWwhavu_kni8wpR07Km0GjIQ';
const TOKEN_SECRET = '57f911cc6cfb5e36b5386740f51dffb235cc4d08a54e9109da428b3fa7c70e70';
const TOKEN_SCOPE = 'image_upload';
const textEncoder = new TextEncoder();

const MEMBER_KEY_HASHES = new Set([
    'ab3abcddda390c86f8516bbe9b3df433d84288218d152d5dfa55bd705474656a',
    '488f4009511b471467bd73030fe96d3b90a149610f430f0c4be1d70ec2ca74bf',
    '3ac542c726296e1927528c72c643e5a52dca5078836cf9784cce41fb2051adfa',
    'ee4b677939887536559b55fedf7dc6d35b0b6756da953d0addb7dcb299db17af',
    '5bf8dc6ec03c0b816ff337650d1eecd69756e0c758c8aa9fe1e08d76033fb8a0',
]);

function normalizeValue(value) {
    return String(value || '').trim();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, init = {}, retries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(url, init);
            if ((response.status < 500 && response.status !== 429) || attempt === retries) {
                return response;
            }
        } catch (error) {
            lastError = error;
            if (attempt === retries) {
                throw error;
            }
        }

        await sleep(250 * (attempt + 1));
    }

    throw lastError || new Error('Request failed');
}

function getBearerValue(request) {
    const authHeader = request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return normalizeValue(match ? match[1] : '');
}

function toBase64Url(value) {
    const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(normalized + padding);
    return binary;
}

async function sha256Hex(value) {
    const data = typeof value === 'string' ? textEncoder.encode(value) : value;
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret, value) {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(value));
    return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyFirebaseIdToken(idToken) {
    const normalizedIdToken = normalizeValue(idToken);
    if (!normalizedIdToken) {
        throw new Error('Missing Firebase ID token');
    }

    const response = await fetchWithRetry(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: normalizedIdToken }),
        },
        2
    );

    const payload = await response.json().catch(() => ({}));
    const userId = payload?.users?.[0]?.localId;

    if (!response.ok || !userId) {
        const reason = payload?.error?.message || 'Invalid Firebase ID token';
        const error = new Error(reason);
        error.status = response.status === 400 ? 401 : response.status;
        throw error;
    }

    return userId;
}

export async function isValidMembershipKey(rawKey) {
    const normalizedKey = normalizeValue(rawKey).toUpperCase();
    if (!normalizedKey) return false;

    const keyHash = await sha256Hex(normalizedKey);
    return MEMBER_KEY_HASHES.has(keyHash);
}

export async function issueImageAccessToken(userId) {
    const payload = {
        uid: normalizeValue(userId),
        scope: TOKEN_SCOPE,
        iat: Date.now(),
        version: 1,
    };

    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = await hmacSha256Hex(TOKEN_SECRET, encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export async function verifyImageAccessToken(token) {
    const normalizedToken = normalizeValue(token);
    const [encodedPayload, signature] = normalizedToken.split('.');

    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSignature = await hmacSha256Hex(TOKEN_SECRET, encodedPayload);
    if (signature !== expectedSignature) {
        return null;
    }

    try {
        const payload = JSON.parse(fromBase64Url(encodedPayload));
        if (payload?.scope !== TOKEN_SCOPE || !normalizeValue(payload?.uid)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

export async function authorizeImageAccess(request, env) {
    const rawUserId = getBearerValue(request);
    const whitelist = (env.UPLOAD_WHITELIST || '').split(',').map((item) => item.trim()).filter(Boolean);

    if (rawUserId && whitelist.includes(rawUserId)) {
        return {
            authorized: true,
            userId: rawUserId,
            mode: 'whitelist',
        };
    }

    const accessToken = normalizeValue(request.headers.get('X-Upload-Access-Token'));
    if (!accessToken) {
        return {
            authorized: false,
            reason: 'Unauthorized: Upload access token missing',
        };
    }

    const payload = await verifyImageAccessToken(accessToken);
    if (!payload) {
        return {
            authorized: false,
            reason: 'Unauthorized: Invalid upload access token',
        };
    }

    if (!rawUserId) {
        return {
            authorized: false,
            reason: 'Unauthorized: Current user id missing',
        };
    }

    if (rawUserId !== payload.uid) {
        return {
            authorized: false,
            reason: 'Unauthorized: Upload access token does not match current user',
        };
    }

    return {
        authorized: true,
        userId: payload.uid,
        mode: 'member_token',
    };
}

export function getFirebaseIdTokenFromRequest(request) {
    return getBearerValue(request);
}
