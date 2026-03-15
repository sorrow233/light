import { fetchWithRetry } from './http.js';

export async function sendEmailWithResend({ apiKey, from, replyTo, to, subject, html, text }) {
    if (!apiKey) {
        throw new Error('缺少 RESEND_API_KEY，无法发送登录邮件。');
    }

    const response = await fetchWithRetry('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
            text,
            ...(replyTo ? { replyTo } : {}),
        }),
    }, {
        retries: 2,
        baseDelayMs: 350,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.error?.message || '发送登录邮件失败。');
    }

    return payload;
}
