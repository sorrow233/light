import { normalizeAuthEmail } from './authEmailDomains';

export async function requestEmailLoginLink({ email, language }) {
    const normalizedEmail = normalizeAuthEmail(email);
    const response = await fetch('/api/auth-email-link', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: normalizedEmail,
            language,
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || '发送登录邮件失败，请稍后重试。');
    }

    return normalizedEmail;
}
