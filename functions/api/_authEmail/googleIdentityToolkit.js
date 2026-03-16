import { AUTH_EMAIL_CONFIG, buildEmailLinkContinueUrl, getAuthEmailEnv } from './config.js';
import { fetchWithRetry } from './http.js';
import { getGoogleCloudAccessToken } from '../_googleServiceAccount.js';

export async function generateEmailSignInLink({ env, email }) {
    const accessToken = await getGoogleCloudAccessToken(env);
    const { linkDomain, serviceAccountJson } = getAuthEmailEnv(env);
    if (!serviceAccountJson) {
        throw new Error('缺少 FIREBASE_SERVICE_ACCOUNT_JSON，无法生成登录链接。');
    }

    const response = await fetchWithRetry(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(AUTH_EMAIL_CONFIG.firebaseWebApiKey)}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestType: 'EMAIL_SIGNIN',
                email,
                continueUrl: buildEmailLinkContinueUrl(),
                canHandleCodeInApp: true,
                returnOobLink: true,
                targetProjectId: AUTH_EMAIL_CONFIG.projectId,
                ...(linkDomain ? { linkDomain } : {}),
            }),
        },
        {
            retries: 2,
            baseDelayMs: 350,
        }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.oobLink) {
        const errorMessage = payload?.error?.message || '生成邮箱登录链接失败。';
        throw new Error(errorMessage);
    }

    return payload.oobLink;
}
