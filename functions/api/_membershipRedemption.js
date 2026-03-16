import {
    commitFirestoreWrites,
    createDocumentWrite,
    getFirestoreDocument,
} from './_firestoreAdmin.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MEMBERSHIP_SCOPE = 'image_upload';
const MEMBERSHIP_DOC_PREFIX = 'upload_memberships';
const REDEMPTION_DOC_PREFIX = 'upload_membership_redemptions';

function toPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function buildKeyPreview(key) {
    const normalized = String(key || '').trim();
    if (!normalized) return '';
    if (normalized.length <= 22) return normalized;
    return `${normalized.slice(0, 16)}...${normalized.slice(-6)}`;
}

function isAlreadyRedeemedError(error) {
    const message = String(error?.message || '');
    return Number(error?.status) === 409
        || message.includes('ALREADY_EXISTS')
        || message.includes('already exists')
        || message.includes('FAILED_PRECONDITION');
}

export async function redeemMembershipKey({ env, keyRecord, userId }) {
    const now = Date.now();
    const membershipDocPath = `${MEMBERSHIP_DOC_PREFIX}/${userId}`;
    const redemptionDocPath = `${REDEMPTION_DOC_PREFIX}/${keyRecord.keyHash}`;
    const currentMembership = await getFirestoreDocument(env, membershipDocPath);
    const currentData = currentMembership?.data || {};
    const currentExpiresAt = toPositiveNumber(currentData.expiresAt);
    const currentPlanId = String(currentData.planId || '').trim();
    const currentIsLifetime = currentPlanId === 'upload_lifetime';
    const currentRedemptionCount = Math.max(0, Number.parseInt(currentData.redemptionCount, 10) || 0);
    const activatedAt = now;
    const isLifetimeKey = keyRecord.planId === 'upload_lifetime';
    const hasActiveLimitedMembership = currentExpiresAt > now;
    const effectiveIsLifetime = currentIsLifetime || isLifetimeKey;
    const baseTimestamp = hasActiveLimitedMembership ? currentExpiresAt : now;
    const expiresAt = effectiveIsLifetime
        ? 0
        : baseTimestamp + (keyRecord.durationDays * DAY_MS);
    const firstActivatedAt = toPositiveNumber(currentData.firstActivatedAt) || activatedAt;
    const effectivePlanId = effectiveIsLifetime ? 'upload_lifetime' : keyRecord.planId;
    const effectivePlanLabel = effectiveIsLifetime ? '永久上传会员' : keyRecord.planLabel;
    const effectiveDurationDays = effectiveIsLifetime ? 0 : keyRecord.durationDays;
    const membershipFields = {
        userId,
        scope: MEMBERSHIP_SCOPE,
        status: 'active',
        planId: effectivePlanId,
        planLabel: effectivePlanLabel,
        durationDays: effectiveDurationDays,
        firstActivatedAt,
        activatedAt,
        expiresAt,
        updatedAt: now,
        redemptionCount: currentRedemptionCount + 1,
        lastRedeemedAt: activatedAt,
        lastRedeemedKeyHash: keyRecord.keyHash,
        lastRedeemedKeyPreview: buildKeyPreview(keyRecord.normalizedKey),
        lastCodeFormat: keyRecord.codeFormat,
    };
    const redemptionFields = {
        keyHash: keyRecord.keyHash,
        keyPreview: buildKeyPreview(keyRecord.normalizedKey),
        redeemedByUserId: userId,
        redeemedAt: activatedAt,
        activatedAt,
        expiresAt,
        scope: MEMBERSHIP_SCOPE,
        planId: keyRecord.planId,
        planLabel: keyRecord.planLabel,
        durationDays: keyRecord.durationDays,
        codeFormat: keyRecord.codeFormat,
        extendedFromExpiresAt: currentExpiresAt,
    };

    try {
        await commitFirestoreWrites(env, [
            createDocumentWrite(env, redemptionDocPath, redemptionFields, { exists: false }),
            createDocumentWrite(env, membershipDocPath, membershipFields),
        ]);
    } catch (error) {
        if (isAlreadyRedeemedError(error)) {
            const redeemedError = new Error('Membership key already redeemed');
            redeemedError.status = 409;
            throw redeemedError;
        }

        throw error;
    }

    return {
        activatedAt,
        expiresAt,
        planId: effectivePlanId,
        planLabel: effectivePlanLabel,
        durationDays: effectiveDurationDays,
        isExtended: currentIsLifetime || currentExpiresAt > now,
        previousExpiresAt: currentExpiresAt,
    };
}
