/**
 * 跨项目数据接收 API
 * 接收来自 NexMap 等外部项目的内容导入请求
 * 
 * 工作流程：
 * 1. 接收导入请求
 * 2. 写入 Firebase pending_imports 队列
 * 3. 前端应用启动时自动处理队列
 */

const FIREBASE_PROJECT_ID = 'flow-7ffad';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestPost({ request }) {
    try {
        const data = await request.json();
        const { text, userId, source } = data;

        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 如果没有 userId，直接返回重定向 URL
        if (!userId) {
            const redirectUrl = `https://flowstudio.catzz.work/inspiration?import_text=${encodeURIComponent(text)}`;
            return new Response(JSON.stringify({
                success: true,
                method: 'redirect',
                message: 'No userId provided, falling back to redirect',
                redirectUrl
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 生成唯一 ID
        const importId = `import_${Date.now()}`;

        // 使用 Firebase REST API PATCH 方式直接写入目标路径
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}/pending_imports/${importId}`;

        const firestoreDoc = {
            fields: {
                text: { stringValue: text },
                source: { stringValue: source || 'external' },
                createdAt: { integerValue: Date.now().toString() }
            }
        };

        const firestoreResponse = await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firestoreDoc)
        });

        if (!firestoreResponse.ok) {
            const errorData = await firestoreResponse.json();
            console.error('Firestore write failed:', errorData);

            // 如果写入失败（可能是权限或路径问题），回退到重定向方案
            const redirectUrl = `https://flowstudio.catzz.work/inspiration?import_text=${encodeURIComponent(text)}`;
            return new Response(JSON.stringify({
                success: true,
                method: 'redirect',
                message: 'Queue write failed, falling back to redirect',
                error: errorData.error?.message || 'Unknown Firestore error',
                redirectUrl
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            method: 'queue',
            message: 'Content queued successfully',
            importId
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Import API error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}
