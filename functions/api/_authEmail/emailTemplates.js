function normalizeLanguageCode(language = '') {
    const normalized = String(language || '').trim().toLowerCase();

    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('ja')) return 'ja';
    if (normalized.startsWith('ko')) return 'ko';
    return 'en';
}

const COPY_BY_LANGUAGE = {
    'zh-CN': {
        subject: '登录 Light',
        preheader: '点击按钮即可完成登录。',
        title: '登录 Light',
        lead: '点击下面的按钮，继续在 Light 中同步你的灵感与数据。',
        button: '继续登录',
        fallback: '如果按钮无法打开，请复制下面的链接到浏览器中：',
        ignore: '如果这不是你本人操作，直接忽略这封邮件即可。',
        footer: '这封邮件由 Light 安全发送。',
    },
    en: {
        subject: 'Sign in to Light',
        preheader: 'Use the button below to continue signing in.',
        title: 'Sign in to Light',
        lead: 'Use the button below to continue syncing your ideas and data in Light.',
        button: 'Continue Sign In',
        fallback: 'If the button does not open, copy this link into your browser:',
        ignore: 'If you did not request this email, you can safely ignore it.',
        footer: 'This email was securely sent by Light.',
    },
    ja: {
        subject: 'Light にログイン',
        preheader: '下のボタンからログインを続けてください。',
        title: 'Light にログイン',
        lead: '下のボタンから、Light の同期を続けてください。',
        button: 'ログインを続ける',
        fallback: 'ボタンが開かない場合は、次のリンクをブラウザに貼り付けてください。',
        ignore: 'このメールに心当たりがない場合は、そのまま無視してください。',
        footer: 'このメールは Light から安全に送信されました。',
    },
    ko: {
        subject: 'Light 로그인',
        preheader: '아래 버튼으로 로그인을 계속하세요.',
        title: 'Light 로그인',
        lead: '아래 버튼을 눌러 Light 동기화를 계속하세요.',
        button: '로그인 계속하기',
        fallback: '버튼이 열리지 않으면 아래 링크를 브라우저에 붙여 넣으세요.',
        ignore: '직접 요청하지 않았다면 이 메일은 무시해도 됩니다.',
        footer: '이 메일은 Light에서 안전하게 발송되었습니다.',
    },
};

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildMagicLinkEmail({ email, link, language }) {
    const resolvedLanguage = normalizeLanguageCode(language);
    const copy = COPY_BY_LANGUAGE[resolvedLanguage] || COPY_BY_LANGUAGE.en;
    const safeEmail = escapeHtml(email);
    const safeLink = escapeHtml(link);
    const html = `
<!doctype html>
<html lang="${resolvedLanguage}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${copy.subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 28px 20px;background:linear-gradient(135deg,#0f172a 0%,#1f7a5b 100%);color:#ffffff;">
                <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.78;">Light</div>
                <div style="margin-top:14px;font-size:30px;font-weight:700;line-height:1.2;">${copy.title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#374151;">${copy.lead}</p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#6b7280;">${safeEmail}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td>
                      <a href="${safeLink}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${copy.button}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#6b7280;">${copy.fallback}</p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.7;word-break:break-all;"><a href="${safeLink}" style="color:#1f7a5b;text-decoration:underline;">${safeLink}</a></p>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#6b7280;">${copy.ignore}</p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#9ca3af;">${copy.footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const text = [
        copy.title,
        '',
        copy.lead,
        email,
        '',
        `${copy.button}: ${link}`,
        '',
        copy.ignore,
    ].join('\n');

    return {
        subject: copy.subject,
        html,
        text,
    };
}
