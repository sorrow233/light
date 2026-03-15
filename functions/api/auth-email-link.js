import { getAuthEmailEnv } from './_authEmail/config.js';
import { buildMagicLinkEmail } from './_authEmail/emailTemplates.js';
import { generateEmailSignInLink } from './_authEmail/googleIdentityToolkit.js';
import { jsonResponse } from './_authEmail/http.js';
import { sendEmailWithResend } from './_authEmail/resendEmail.js';

function normalizeEmail(email = '') {
    return String(email || '').trim().toLowerCase();
}

function normalizeLanguage(language = '') {
    const normalized = String(language || '').trim().toLowerCase();

    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('ja')) return 'ja';
    if (normalized.startsWith('ko')) return 'ko';
    return 'en';
}

function isAllowedOrigin(request) {
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get('Origin');

    if (!origin) return true;
    return origin === requestOrigin;
}

export async function onRequestPost(context) {
    const { request, env } = context;

    if (!isAllowedOrigin(request)) {
        return jsonResponse({ error: '当前来源不允许请求登录邮件接口。' }, 403);
    }

    let payload = null;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: '请求体不是有效的 JSON。' }, 400);
    }

    const email = normalizeEmail(payload?.email);
    const language = normalizeLanguage(payload?.language);

    if (!email || !email.includes('@')) {
        return jsonResponse({ error: '请输入有效的邮箱地址。' }, 400);
    }

    try {
        const emailLink = await generateEmailSignInLink({ env, email });
        const { resendApiKey, fromEmail, replyTo } = getAuthEmailEnv(env);
        const message = buildMagicLinkEmail({
            email,
            link: emailLink,
            language,
        });

        await sendEmailWithResend({
            apiKey: resendApiKey,
            from: fromEmail,
            replyTo,
            to: email,
            subject: message.subject,
            html: message.html,
            text: message.text,
        });

        return jsonResponse({ ok: true });
    } catch (error) {
        const rawMessage = typeof error?.message === 'string' ? error.message : '发送登录邮件失败。';

        if (rawMessage.includes('EMAIL_NOT_FOUND')) {
            return jsonResponse({ error: '这个邮箱还没有注册，请先使用密码注册一次。' }, 400);
        }

        if (rawMessage.includes('OPERATION_NOT_ALLOWED')) {
            return jsonResponse({ error: 'Firebase 还没有开启邮箱免密登录。' }, 400);
        }

        if (rawMessage.includes('INVALID_CONTINUE_URI') || rawMessage.includes('UNAUTHORIZED_DOMAIN')) {
            return jsonResponse({ error: '登录回跳域名还没有在 Firebase 里授权。' }, 400);
        }

        console.error('[auth-email-link] Failed to send email sign-in link:', error);
        return jsonResponse({ error: '发送登录邮件失败，请稍后重试。' }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            Allow: 'POST, OPTIONS',
        },
    });
}
