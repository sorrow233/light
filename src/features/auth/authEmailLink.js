import { normalizeAuthEmail } from './authEmailDomains';

const EMAIL_LINK_STORAGE_KEY = 'light_auth_email_link_email';
const EMAIL_LINK_QUERY_KEYS = ['apiKey', 'mode', 'oobCode', 'continueUrl', 'lang', 'tenantId'];

export function buildEmailLinkActionSettings() {
    if (typeof window === 'undefined') {
        throw new Error('邮箱免密登录只能在浏览器中使用。');
    }

    const redirectUrl = new URL('/inspiration', window.location.origin);
    redirectUrl.searchParams.set('authFlow', 'email-link');

    return {
        url: redirectUrl.toString(),
        handleCodeInApp: true,
    };
}

export function rememberEmailLinkEmail(email) {
    if (typeof window === 'undefined') return;

    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) return;

    window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, normalizedEmail);
}

export function getRememberedEmailLinkEmail() {
    if (typeof window === 'undefined') return '';
    return normalizeAuthEmail(window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) || '');
}

export function clearRememberedEmailLinkEmail() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
}

export function clearEmailLinkUrl() {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    EMAIL_LINK_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

    if (url.searchParams.get('authFlow') === 'email-link') {
        url.searchParams.delete('authFlow');
    }

    const search = url.searchParams.toString();
    const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
}
