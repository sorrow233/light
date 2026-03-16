import { MEMBERSHIP_KEY_HASH_SET } from './_membershipKeyHashes.js';

const DURATION_KEY_PATTERN = /^LIGHT-UPLOAD-D(\d{3,4})-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/;
const textEncoder = new TextEncoder();

function normalizeValue(value) {
    return String(value || '').trim().toUpperCase();
}

async function sha256Hex(value) {
    const data = textEncoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildPlanRecord(durationDays, codeFormat) {
    const safeDurationDays = Number.isInteger(durationDays) && durationDays > 0 ? durationDays : 365;

    return {
        durationDays: safeDurationDays,
        planId: `upload_${safeDurationDays}d`,
        planLabel: `${safeDurationDays} 天上传会员`,
        codeFormat,
    };
}

export function getMembershipPlanFromKey(rawKey) {
    const normalizedKey = normalizeValue(rawKey);
    const durationMatch = normalizedKey.match(DURATION_KEY_PATTERN);

    if (durationMatch) {
        const durationDays = Number.parseInt(durationMatch[1], 10);
        if (Number.isInteger(durationDays) && durationDays > 0 && durationDays <= 3650) {
            return buildPlanRecord(durationDays, 'duration_prefixed');
        }

        return null;
    }

    return null;
}

export async function resolveMembershipKey(rawKey) {
    const normalizedKey = normalizeValue(rawKey);
    const plan = getMembershipPlanFromKey(normalizedKey);
    if (!plan) {
        return null;
    }

    const keyHash = await sha256Hex(normalizedKey);
    if (!MEMBERSHIP_KEY_HASH_SET.has(keyHash)) {
        return null;
    }

    return {
        normalizedKey,
        keyHash,
        ...plan,
    };
}

export async function isValidMembershipKey(rawKey) {
    return !!(await resolveMembershipKey(rawKey));
}
