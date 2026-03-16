const STORAGE_KEY = 'light_image_upload_access';

function canUseStorage() {
    return typeof window !== 'undefined' && !!window.localStorage;
}

function toPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function normalizeUploadAccessState(source = {}) {
    return {
        enabled: source.imageUploadAccessEnabled === true || source.enabled === true,
        token: typeof source.imageUploadAccessToken === 'string'
            ? source.imageUploadAccessToken
            : typeof source.token === 'string'
                ? source.token
                : '',
        ownerId: typeof source.imageUploadAccessOwnerId === 'string'
            ? source.imageUploadAccessOwnerId
            : typeof source.ownerId === 'string'
                ? source.ownerId
                : '',
        activatedAt: toPositiveNumber(
            source.imageUploadAccessActivatedAt ?? source.activatedAt
        ),
    };
}

export function getStoredUploadAccessState() {
    if (!canUseStorage()) {
        return normalizeUploadAccessState();
    }

    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) {
            return normalizeUploadAccessState();
        }

        return normalizeUploadAccessState(JSON.parse(rawValue));
    } catch {
        return normalizeUploadAccessState();
    }
}

export function persistUploadAccessState(source = {}) {
    if (!canUseStorage()) return;

    const normalized = normalizeUploadAccessState(source);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function clearStoredUploadAccessState() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(STORAGE_KEY);
}

export function buildUploadAccessHeaders(userId, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (userId) {
        headers.Authorization = `Bearer ${userId}`;
    }

    const accessState = getStoredUploadAccessState();
    if (
        accessState.enabled
        && accessState.token
        && accessState.ownerId
        && accessState.ownerId === userId
    ) {
        headers['X-Upload-Access-Token'] = accessState.token;
    }

    return headers;
}

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return await response.json();
    }

    return {
        error: (await response.text()).slice(0, 200) || `请求失败 (${response.status})`
    };
}

export async function activateUploadAccess({ user, membershipKey }) {
    if (!user) {
        throw new Error('请先登录再激活同步上传权限');
    }

    const normalizedKey = String(membershipKey || '').trim().toUpperCase();
    if (!normalizedKey) {
        throw new Error('请输入兑换码');
    }

    const idToken = await user.getIdToken();
    const response = await fetch('/api/upload-access', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ membershipKey: normalizedKey })
    });

    const result = await parseApiResponse(response);
    if (!response.ok) {
        const rawError = String(result?.error || '激活失败');
        if (rawError.includes('Invalid membership key')) {
            throw new Error('兑换码无效，请检查后重试');
        }
        if (rawError.includes('Firebase ID token') || rawError.includes('INVALID_ID_TOKEN')) {
            throw new Error('登录态已失效，请重新登录后再试');
        }
        throw new Error(rawError);
    }

    return {
        token: String(result.token || ''),
        userId: String(result.userId || user.uid || ''),
        activatedAt: toPositiveNumber(result.activatedAt) || Date.now(),
    };
}
