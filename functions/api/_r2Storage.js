import {
    buildR2PublicUrl,
    extractObjectKeyFromPublicUrl,
    parseR2Config,
    signedR2Fetch,
} from './_r2.js';

function normalizeBaseUrl(value) {
    return String(value || '').replace(/\/+$/g, '');
}

function toStorageBody(body) {
    if (body == null || body instanceof ArrayBuffer || body instanceof Uint8Array || typeof body === 'string') {
        return body;
    }

    throw new Error('Unsupported R2 body type');
}

function isR2BucketBinding(value) {
    return Boolean(value)
        && typeof value.put === 'function'
        && typeof value.delete === 'function';
}

export function resolveR2Storage(env) {
    const publicUrl = normalizeBaseUrl(env?.R2_PUBLIC_URL);
    const bindingBucket = env?.LIGHT_UPLOAD_BUCKET;

    if (isR2BucketBinding(bindingBucket)) {
        if (!publicUrl) {
            throw new Error('Missing R2 public URL');
        }

        return {
            mode: 'binding',
            bucket: bindingBucket,
            publicUrl,
        };
    }

    return {
        mode: 'signed_fetch',
        config: parseR2Config(env),
    };
}

export function buildStoragePublicUrl(storage, objectKey) {
    if (storage.mode === 'binding') {
        return `${storage.publicUrl}/${String(objectKey || '').replace(/^\/+/, '')}`;
    }

    return buildR2PublicUrl(storage.config, objectKey);
}

export function extractObjectKeyFromStorageUrl(fileUrl, storage) {
    const publicUrl = storage.mode === 'binding'
        ? storage.publicUrl
        : storage.config.publicUrl;

    return extractObjectKeyFromPublicUrl(fileUrl, publicUrl);
}

export async function uploadToR2Storage(storage, { objectKey, body, contentType }) {
    if (storage.mode === 'binding') {
        await storage.bucket.put(objectKey, toStorageBody(body), {
            httpMetadata: contentType ? { contentType } : undefined,
        });

        return {
            ok: true,
            status: 200,
            text: async () => '',
        };
    }

    return signedR2Fetch({
        method: 'PUT',
        config: storage.config,
        objectKey,
        body,
        contentType,
        retries: 2,
    });
}

export async function deleteFromR2Storage(storage, { objectKey }) {
    if (storage.mode === 'binding') {
        await storage.bucket.delete(objectKey);

        return {
            ok: true,
            status: 204,
            text: async () => '',
        };
    }

    return signedR2Fetch({
        method: 'DELETE',
        config: storage.config,
        objectKey,
        retries: 2,
    });
}
