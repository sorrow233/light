const BYTE_TO_BINARY_CHUNK_SIZE = 0x8000;

export const INLINE_STATE_MAX_LENGTH = 700000;
export const STATE_CHUNK_LENGTH = 700000;

export const STATE_ENCODING_INLINE = 'inline-base64';
export const STATE_ENCODING_CHUNKED = 'chunked-base64';

const CHUNK_DOC_PREFIX = '__chunk__';

export const getStateChunkDocId = (roomId, index) => {
    const safeRoomId = String(roomId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${CHUNK_DOC_PREFIX}${safeRoomId}__${String(index).padStart(4, '0')}`;
};

export const uint8ArrayToBase64 = (bytes) => {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
        return '';
    }

    const segments = [];

    for (let i = 0; i < bytes.length; i += BYTE_TO_BINARY_CHUNK_SIZE) {
        const chunk = bytes.subarray(i, i + BYTE_TO_BINARY_CHUNK_SIZE);
        const chars = new Array(chunk.length);

        for (let j = 0; j < chunk.length; j++) {
            chars[j] = String.fromCharCode(chunk[j]);
        }

        segments.push(chars.join(''));
    }

    return btoa(segments.join(''));
};

export const base64ToUint8Array = (base64) => {
    if (!base64 || typeof base64 !== 'string') {
        return new Uint8Array();
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
};

export const splitStateIntoChunks = (base64, chunkLength = STATE_CHUNK_LENGTH) => {
    if (!base64 || typeof base64 !== 'string') {
        return [];
    }

    if (chunkLength <= 0) {
        return [base64];
    }

    const chunks = [];
    for (let i = 0; i < base64.length; i += chunkLength) {
        chunks.push(base64.slice(i, i + chunkLength));
    }
    return chunks;
};

export const normalizeStateMeta = (data = {}) => {
    const encoding = data.stateEncoding === STATE_ENCODING_CHUNKED
        ? STATE_ENCODING_CHUNKED
        : STATE_ENCODING_INLINE;

    const chunkCount = Number.isInteger(data.stateChunkCount) && data.stateChunkCount > 0
        ? data.stateChunkCount
        : 0;

    return {
        encoding,
        chunkCount
    };
};
