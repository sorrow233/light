import {
    getFirebaseIdTokenFromRequest,
    isValidMembershipKey,
    issueImageAccessToken,
    verifyFirebaseIdToken,
} from './_imageAccess.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestPost(context) {
    const { request } = context;

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

        const isValidKey = await isValidMembershipKey(membershipKey);
        if (!isValidKey) {
            return new Response(JSON.stringify({ error: 'Invalid membership key' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const accessToken = await issueImageAccessToken(userId);
        return new Response(JSON.stringify({
            success: true,
            token: accessToken,
            userId,
            activatedAt: Date.now(),
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
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
