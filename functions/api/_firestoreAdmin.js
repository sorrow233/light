import { getGoogleCloudAccessToken, readGoogleServiceAccount } from './_googleServiceAccount.js';

const DEFAULT_FIREBASE_PROJECT_ID = 'light-7b409';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

        await sleep(baseDelayMs * (2 ** attempt));
    }

    throw lastError || new Error('Request failed');
}

function getFirestoreProjectId(env = {}) {
    try {
        return String(readGoogleServiceAccount(env)?.project_id || DEFAULT_FIREBASE_PROJECT_ID).trim();
    } catch {
        return DEFAULT_FIREBASE_PROJECT_ID;
    }
}

function encodeDocumentPath(documentPath) {
    return String(documentPath || '')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function buildFirestoreDocumentName(env, documentPath) {
    const projectId = getFirestoreProjectId(env);
    return `projects/${projectId}/databases/(default)/documents/${encodeDocumentPath(documentPath)}`;
}

function buildDocumentUrl(env, documentPath) {
    return `https://firestore.googleapis.com/v1/${buildFirestoreDocumentName(env, documentPath)}`;
}

function buildCommitUrl(env) {
    const projectId = getFirestoreProjectId(env);
    return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
}

function toFirestoreValue(value) {
    if (value === null || value === undefined) {
        return { nullValue: null };
    }

    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((item) => toFirestoreValue(item)),
            },
        };
    }

    if (typeof value === 'boolean') {
        return { booleanValue: value };
    }

    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return { integerValue: String(value) };
        }

        return { doubleValue: value };
    }

    if (typeof value === 'object') {
        return {
            mapValue: {
                fields: Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])
                ),
            },
        };
    }

    return { stringValue: String(value) };
}

function fromFirestoreValue(fieldValue) {
    if (!fieldValue || typeof fieldValue !== 'object') return undefined;

    if (Object.prototype.hasOwnProperty.call(fieldValue, 'stringValue')) return fieldValue.stringValue;
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'integerValue')) return Number(fieldValue.integerValue);
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'doubleValue')) return Number(fieldValue.doubleValue);
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'booleanValue')) return Boolean(fieldValue.booleanValue);
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'nullValue')) return null;

    if (fieldValue.mapValue?.fields) {
        return Object.fromEntries(
            Object.entries(fieldValue.mapValue.fields).map(([key, value]) => [key, fromFirestoreValue(value)])
        );
    }

    if (Array.isArray(fieldValue.arrayValue?.values)) {
        return fieldValue.arrayValue.values.map((item) => fromFirestoreValue(item));
    }

    return undefined;
}

function parseFirestoreDocument(document) {
    return Object.fromEntries(
        Object.entries(document?.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])
    );
}

function createFirestoreError(status, payload, fallbackMessage) {
    const message = payload?.error?.message || fallbackMessage;
    const error = new Error(message);
    error.status = status;
    error.payload = payload;
    return error;
}

export function createDocumentWrite(env, documentPath, fields, options = {}) {
    const write = {
        update: {
            name: buildFirestoreDocumentName(env, documentPath),
            fields: Object.fromEntries(
                Object.entries(fields).map(([key, value]) => [key, toFirestoreValue(value)])
            ),
        },
    };

    if (typeof options.exists === 'boolean') {
        write.currentDocument = { exists: options.exists };
    }

    return write;
}

export async function getFirestoreDocument(env, documentPath) {
    const accessToken = await getGoogleCloudAccessToken(env);
    const response = await fetchWithRetry(buildDocumentUrl(env, documentPath), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }, {
        retries: 2,
        baseDelayMs: 350,
    });

    if (response.status === 404) {
        return null;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw createFirestoreError(response.status, payload, '读取 Firestore 会员记录失败。');
    }

    return {
        name: payload.name,
        updateTime: payload.updateTime || '',
        data: parseFirestoreDocument(payload),
    };
}

export async function commitFirestoreWrites(env, writes = []) {
    const accessToken = await getGoogleCloudAccessToken(env);
    const response = await fetchWithRetry(buildCommitUrl(env), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ writes }),
    }, {
        retries: 2,
        baseDelayMs: 350,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw createFirestoreError(response.status, payload, '提交 Firestore 会员记录失败。');
    }

    return payload;
}
