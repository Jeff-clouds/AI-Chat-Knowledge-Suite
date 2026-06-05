import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function base64UrlToBytes(value) {
    return Uint8Array.from(Buffer.from(value, 'base64url'));
}

const code = process.argv[2];
if (!code) {
    console.error('Usage: node scripts/license/verify-license.mjs AICK1...');
    process.exit(1);
}

const [prefix, payloadPart, signaturePart] = code.trim().split('.');
if (prefix !== 'AICK1' || !payloadPart || !signaturePart) {
    console.error('Invalid license format');
    process.exit(1);
}

const publicKeySource = await readFile(resolve(process.cwd(), 'src/core/license-public-key.js'), 'utf8');
const publicKeyJson = publicKeySource
    .replace(/^export const LICENSE_PUBLIC_KEY = /, '')
    .replace(/;\s*$/, '');
const publicKey = JSON.parse(publicKeyJson);
const key = await webcrypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
);

const isValid = await webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(payloadPart)
);

if (!isValid) {
    console.error('Invalid signature');
    process.exit(1);
}

const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
console.log(JSON.stringify(payload, null, 2));
