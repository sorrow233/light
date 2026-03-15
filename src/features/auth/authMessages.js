const AUTH_ERROR_MESSAGE_MAP = {
    'auth/cancelled-popup-request': '登录弹窗被新的请求打断了，请再试一次。',
    'auth/email-already-in-use': '这个邮箱已经注册过了，请直接登录或使用免密链接。',
    'auth/expired-action-code': '这封登录邮件已经过期了，请重新发送一封新的。',
    'auth/invalid-action-code': '这个登录链接已经失效或已被使用，请重新发送一封新的。',
    'auth/invalid-continue-uri': '邮箱免密登录回跳地址无效，请检查站点域名配置。',
    'auth/invalid-email': '邮箱格式不正确，请检查后再试。',
    'auth/invalid-login-credentials': '邮箱或密码不正确，请重新输入。',
    'auth/network-request-failed': '网络连接失败，请确认网络后重试。',
    'auth/operation-not-allowed': 'Firebase 还没有开启邮箱免密登录，请先在 Authentication 里启用 Email link。',
    'auth/popup-blocked': '登录弹窗被浏览器拦截了，请允许弹窗后再试。',
    'auth/popup-closed-by-user': '你已经关闭了登录弹窗。',
    'auth/too-many-requests': '尝试次数太多了，请稍后再试。',
    'auth/unauthorized-continue-uri': '邮箱免密登录回跳域名还没加入 Firebase 授权域名，请先配置。',
    'auth/unauthorized-domain': '当前域名还没加入 Firebase 授权域名，请先到控制台配置。',
    'auth/user-disabled': '这个账号已被停用，请联系管理员处理。',
    'auth/weak-password': '密码强度太弱了，请至少使用 6 位字符。',
    'auth/wrong-password': '密码不正确，请重新输入。',
};

export function normalizeAuthError(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : '';
    if (errorCode && AUTH_ERROR_MESSAGE_MAP[errorCode]) {
        return AUTH_ERROR_MESSAGE_MAP[errorCode];
    }

    const rawMessage = typeof error?.message === 'string' ? error.message : '';
    const cleanedMessage = rawMessage
        .replace(/^Firebase:\s*/i, '')
        .replace(/\s*\(auth\/[^)]+\)\.?/gi, '')
        .trim();

    return cleanedMessage || '操作失败，请稍后重试。';
}
