export const ALLOWED_EMAIL_DOMAINS = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'ymail.com',
    'icloud.com', 'me.com', 'mac.com',
    'proton.me', 'protonmail.com',
    'qq.com', 'foxmail.com',
    '163.com', '126.com', 'yeah.net',
    'sina.com', 'sohu.com',
    'naver.com'
];

export function normalizeAuthEmail(email = '') {
    return email.trim().toLowerCase();
}

export function validateEmailDomain(email) {
    const domain = normalizeAuthEmail(email).split('@')[1];
    return Boolean(domain && ALLOWED_EMAIL_DOMAINS.includes(domain));
}
