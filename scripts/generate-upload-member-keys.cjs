const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_KEYS_PATH = path.join(ROOT_DIR, 'local-upload-member-keys.txt');
const HASH_MODULE_PATH = path.join(ROOT_DIR, 'functions', 'api', '_membershipKeyHashes.js');
const KEY_PATTERN = /LIGHT-UPLOAD-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}/g;
const HASH_PATTERN = /[a-f0-9]{64}/g;

function parseArgs(argv) {
    const countFlagIndex = argv.indexOf('--count');
    const countValue = countFlagIndex >= 0 ? Number.parseInt(argv[countFlagIndex + 1], 10) : 100;
    return {
        count: Number.isInteger(countValue) && countValue >= 0 ? countValue : 100,
    };
}

function readFileIfExists(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return '';
    }
}

function extractMatches(content, pattern) {
    const matches = content.match(pattern) || [];
    return Array.from(new Set(matches));
}

function generateMembershipKey() {
    return `LIGHT-UPLOAD-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function hashMembershipKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

function writeHashModule(hashValues) {
    const lines = [
        'export const MEMBERSHIP_KEY_HASHES = [',
        ...hashValues.map((hash) => `    '${hash}',`),
        '];',
        '',
        'export const MEMBERSHIP_KEY_HASH_SET = new Set(MEMBERSHIP_KEY_HASHES);',
        '',
    ];

    fs.writeFileSync(HASH_MODULE_PATH, lines.join('\n'));
}

function writeLocalKeysFile(keys) {
    const lines = [
        'Light 图片上传会员兑换码（本地保管，请勿提交到 Git）',
        `最后生成时间：${new Date().toISOString()}`,
        `总数：${keys.length}`,
        '',
        '当前有效兑换码：',
        ...keys,
        '',
    ];

    fs.writeFileSync(LOCAL_KEYS_PATH, lines.join('\n'));
}

function main() {
    const { count } = parseArgs(process.argv.slice(2));
    const existingKeyContent = readFileIfExists(LOCAL_KEYS_PATH);
    const existingHashModuleContent = readFileIfExists(HASH_MODULE_PATH);

    const knownKeys = extractMatches(existingKeyContent, KEY_PATTERN);
    const knownHashes = extractMatches(existingHashModuleContent, HASH_PATTERN);
    const hashSet = new Set(knownHashes);
    const newKeys = [];

    while (newKeys.length < count) {
        const nextKey = generateMembershipKey();
        const nextHash = hashMembershipKey(nextKey);
        if (hashSet.has(nextHash)) {
            continue;
        }

        hashSet.add(nextHash);
        newKeys.push(nextKey);
    }

    const allKeys = [...knownKeys, ...newKeys];
    const allHashes = Array.from(hashSet);

    writeHashModule(allHashes);
    writeLocalKeysFile(allKeys);

    console.log(`Generated ${newKeys.length} new membership keys.`);
    console.log(`Total active membership key hashes: ${allHashes.length}`);
    console.log(`Local key file: ${LOCAL_KEYS_PATH}`);
    console.log(`Hash module: ${HASH_MODULE_PATH}`);
    if (newKeys[0]) {
        console.log(`First new key: ${newKeys[0]}`);
    }
}

main();
