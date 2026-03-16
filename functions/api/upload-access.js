import {
    getFirebaseIdTokenFromRequest,
    issueImageAccessToken,
    verifyFirebaseIdToken,
} from './_imageAccess.js';
import { resolveMembershipKey } from './_membershipKey.js';
import { redeemMembershipKey } from './_membershipRedemption.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const firebaseIdToken = getFirebaseIdTokenFromRequest(request);
        const userId = await verifyFirebaseIdToken(firebaseIdToken);

        const body = await request.json().catch(() => ({}));
        const membershipKey = String(body?.membershipKey || '').trim();

        if (!membershipKey) {
            return new Response(JSON.stringify({ error: 'Missing membership key' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const keyRecord = await resolveMembershipKey(membershipKey);
        if (!keyRecord) {
            return new Response(JSON.stringify({ error: 'Invalid membership key' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const membership = await redeemMembershipKey({
            env,
            keyRecord,
            userId,
        });
        const accessToken = await issueImageAccessToken(userId, env, {
            activatedAt: membership.activatedAt,
            expiresAt: membership.expiresAt,
            planId: membership.planId,
            durationDays: membership.durationDays,
        });
        return new Response(JSON.stringify({
            success: true,
            token: accessToken,
            userId,
            activatedAt: membership.activatedAt,
            expiresAt: membership.expiresAt,
            planId: membership.planId,
            planLabel: membership.planLabel,
            durationDays: membership.durationDays,
            extended: membership.isExtended,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        if (Number(error?.status) === 409) {
            return new Response(JSON.stringify({ error: error.message || 'Membership key already redeemed' }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const status = Number.isInteger(error?.status) ? error.status : 500;
        return new Response(JSON.stringify({ error: error.message || 'Activation failed' }), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
