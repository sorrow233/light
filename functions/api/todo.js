import * as Y from 'yjs';
import { base64ToUint8Array, getStateChunkDocId } from '../../src/features/sync/syncStateCodec.js';
import { normalizeIdeaTextForExport } from '../../src/features/lifecycle/components/inspiration/categoryTransferUtils.js';

const FIREBASE_PROJECT_ID = 'flow-7ffad';
const FIREBASE_WEB_API_KEY = 'AIzaSyA20FrNmdIPE2Sb9r97s7cj2w6MLYgcB_M';
const DEFAULT_DOC_ID = 'flowstudio_v1';

const TODO_MODES = new Set(['all', 'unclassified', 'ai_done', 'ai_high', 'ai_mid', 'self']);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-Refresh-Token',
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, init = {}, options = {}) {
    const {
        retries = 2,
        baseDelayMs = 250,
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

        const waitMs = baseDelayMs * (2 ** attempt);
        await sleep(waitMs);
    }

    throw lastError || new Error('Request failed');
}

function getBearerToken(request) {
    const authHeader = request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function getRefreshTokenFromHeader(request) {
    const headerValue = request.headers.get('X-Firebase-Refresh-Token') || '';
    return headerValue.trim();
}

function resolveAuthInput(request) {
    const idToken = getBearerToken(request);
    if (idToken) {
        return {
            authMode: 'id_token',
            token: idToken,
        };
    }

    const refreshToken = getRefreshTokenFromHeader(request);
    if (refreshToken) {
        return {
            authMode: 'refresh_token',
            token: refreshToken,
        };
    }

    return null;
}

function decodeBase64Url(value = '') {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return atob(normalized + padding);
}

function getUidFromFirebaseIdToken(idToken) {
    if (!idToken) return null;

    const parts = idToken.split('.');
    if (parts.length < 2) return null;

    try {
        const payload = JSON.parse(decodeBase64Url(parts[1]));
        return payload.user_id || payload.sub || null;
    } catch {
        return null;
    }
}

async function exchangeRefreshTokenForIdToken(refreshToken, apiKey) {
    const tokenApiUrl = `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`;
    const response = await fetchWithRetry(tokenApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }).toString(),
    }, {
        retries: 3,
        baseDelayMs: 350,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.id_token) {
        const reason = payload?.error?.message || payload?.error?.errors?.[0]?.message || 'Refresh token exchange failed';
        const error = new Error(reason);
        error.status = response.status === 400 ? 401 : response.status;
        throw error;
    }

    return {
        idToken: payload.id_token,
        userId: payload.user_id || null,
        expiresIn: Number(payload.expires_in) || null,
    };
}

function parseInteger(rawValue, fallback, min, max) {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsed)) return fallback;
    const clamped = Math.max(min, parsed);
    return Number.isFinite(max) ? Math.min(clamped, max) : clamped;
}

function parseFirestoreField(fieldValue) {
    if (!fieldValue || typeof fieldValue !== 'object') return undefined;

    if (Object.prototype.hasOwnProperty.call(fieldValue, 'stringValue')) return fieldValue.stringValue;
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'integerValue')) return Number(fieldValue.integerValue);
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'doubleValue')) return Number(fieldValue.doubleValue);
    if (Object.prototype.hasOwnProperty.call(fieldValue, 'booleanValue')) return Boolean(fieldValue.booleanValue);

    return undefined;
}

function isCompleted(project) {
    const value = project?.completed;
    return value === true || value === 1 || value === '1' || value === 'true';
}

function shouldIncludeByMode(project, mode) {
    if (mode === 'all') return true;

    const aiAssistClass = project?.aiAssistClass || 'unclassified';

    if (mode === 'unclassified') {
        return aiAssistClass === 'unclassified';
    }

    return aiAssistClass === mode;
}

function extractTodoIdeas(allProjects, mode) {
    return allProjects
        .filter((project) => (project?.stage || 'inspiration') === 'inspiration')
        .filter((project) => (project?.category || 'note') === 'todo')
        .filter((project) => !isCompleted(project))
        .filter((project) => shouldIncludeByMode(project, mode))
        .sort((a, b) => (a?.timestamp || 0) - (b?.timestamp || 0));
}

function formatTodoItem(project, index) {
    const normalizedContent = normalizeIdeaTextForExport(project?.content || '');

    return {
        index,
        id: project?.id || null,
        content: project?.content || '',
        normalizedContent,
        timestamp: Number.isFinite(Number(project?.timestamp)) ? Number(project.timestamp) : null,
        createdAt: Number.isFinite(Number(project?.createdAt)) ? Number(project.createdAt) : null,
        aiAssistClass: project?.aiAssistClass || 'unclassified',
        category: project?.category || 'note',
        stage: project?.stage || 'inspiration',
        completed: isCompleted(project),
    };
}

function getFirestoreDocUrl(userId, roomId) {
    const encodedUserId = encodeURIComponent(userId);
    const encodedRoomId = encodeURIComponent(roomId);
    return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodedUserId}/rooms/${encodedRoomId}`;
}

async function fetchFirestoreDoc({ token, userId, roomId }) {
    const url = getFirestoreDocUrl(userId, roomId);
    const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 404) {
        return null;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMessage = payload?.error?.message || `Firestore request failed (${response.status})`;
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
    }

    return payload;
}

async function loadBase64State({ token, userId, roomId, stateDoc }) {
    const fields = stateDoc?.fields || {};
    const stateEncoding = parseFirestoreField(fields.stateEncoding) || 'inline-base64';
    const stateChunkCount = Number(parseFirestoreField(fields.stateChunkCount)) || 0;

    if (stateEncoding !== 'chunked-base64') {
        return parseFirestoreField(fields.state) || '';
    }

    if (stateChunkCount <= 0) {
        return '';
    }

    const chunkDocs = await Promise.all(
        Array.from({ length: stateChunkCount }, (_, index) => {
            const chunkDocId = getStateChunkDocId(roomId, index);
            return fetchFirestoreDoc({ token, userId, roomId: chunkDocId });
        })
    );

    const chunks = chunkDocs.map((chunkDoc, index) => {
        if (!chunkDoc?.fields) {
            throw new Error(`Missing sync state chunk: ${index + 1}/${stateChunkCount}`);
        }

        const value = parseFirestoreField(chunkDoc.fields.value);
        if (typeof value !== 'string') {
            throw new Error(`Invalid sync state chunk: ${index + 1}/${stateChunkCount}`);
        }

        return value;
    });

    return chunks.join('');
}

function readAllProjectsFromState(base64State) {
    if (!base64State || typeof base64State !== 'string') {
        return [];
    }

    const yDoc = new Y.Doc();
    const update = base64ToUint8Array(base64State);

    if (update.byteLength === 0) {
        return [];
    }

    Y.applyUpdate(yDoc, update, 'remote');
    return yDoc.getArray('all_projects').toJSON();
}

function buildJsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

export async function onRequestGet({ request, env }) {
    try {
        const authInput = resolveAuthInput(request);
        if (!authInput) {
            return buildJsonResponse({
                error: 'Missing auth credential. Provide Authorization: Bearer <ID Token> or X-Firebase-Refresh-Token.',
            }, 401);
        }

        let token = authInput.token;
        let userId = null;

        if (authInput.authMode === 'refresh_token') {
            const apiKey = (env?.FIREBASE_WEB_API_KEY || FIREBASE_WEB_API_KEY || '').trim();
            if (!apiKey) {
                return buildJsonResponse({ error: 'Missing Firebase Web API key for refresh token flow.' }, 500);
            }

            const exchanged = await exchangeRefreshTokenForIdToken(authInput.token, apiKey);
            token = exchanged.idToken;
            userId = exchanged.userId;
        }

        if (!userId) {
            userId = getUidFromFirebaseIdToken(token);
        }

        if (!userId) {
            return buildJsonResponse({ error: 'Invalid Firebase auth token.' }, 401);
        }

        const url = new URL(request.url);
        const docId = (url.searchParams.get('docId') || DEFAULT_DOC_ID).trim();
        const mode = (url.searchParams.get('mode') || 'unclassified').trim();
        const cursor = parseInteger(url.searchParams.get('cursor'), 0, 0, Number.POSITIVE_INFINITY);
        const limit = parseInteger(url.searchParams.get('limit'), 1, 1, 100);

        if (!/^[a-zA-Z0-9_-]{1,120}$/.test(docId)) {
            return buildJsonResponse({ error: 'Invalid docId.' }, 400);
        }

        if (!TODO_MODES.has(mode)) {
            return buildJsonResponse({
                error: 'Invalid mode.',
                allowedModes: Array.from(TODO_MODES),
            }, 400);
        }

        const stateDoc = await fetchFirestoreDoc({ token, userId, roomId: docId });
        if (!stateDoc) {
            return buildJsonResponse({
                success: true,
                userId,
                docId,
                mode,
                cursor,
                limit,
                total: 0,
                hasMore: false,
                nextCursor: null,
                items: [],
                item: null,
                numberedText: '',
            });
        }

        const base64State = await loadBase64State({ token, userId, roomId: docId, stateDoc });
        const allProjects = readAllProjectsFromState(base64State);
        const todoIdeas = extractTodoIdeas(allProjects, mode);

        const pagedIdeas = todoIdeas.slice(cursor, cursor + limit);
        const items = pagedIdeas.map((project, index) => formatTodoItem(project, cursor + index));
        const numberedText = items
            .map((item, index) => `${cursor + index + 1}. ${item.normalizedContent || '（空）'}`)
            .join('\n');

        const nextCursor = cursor + items.length;
        const hasMore = nextCursor < todoIdeas.length;

        return buildJsonResponse({
            success: true,
            userId,
            authMode: authInput.authMode,
            docId,
            mode,
            cursor,
            limit,
            total: todoIdeas.length,
            hasMore,
            nextCursor: hasMore ? nextCursor : null,
            items,
            item: items[0] || null,
            numberedText,
        });
    } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 500;
        const message = error?.message || 'Failed to fetch todo list.';
        return buildJsonResponse({ error: message }, status);
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
