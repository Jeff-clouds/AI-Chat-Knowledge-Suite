import { appendFile, readFile } from 'node:fs/promises';
import { webcrypto, createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

function getArg(name, fallback = '') {
    const prefix = `--${name}=`;
    const arg = process.argv.find(item => item.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : fallback;
}

function requireArg(name) {
    const value = getArg(name);
    if (!value) {
        console.error(`Missing required argument: --${name}=...`);
        process.exit(1);
    }
    return value;
}

function textToBase64Url(text) {
    return Buffer.from(text, 'utf8').toString('base64url');
}

function bytesToBase64Url(bytes) {
    return Buffer.from(bytes).toString('base64url');
}

const email = requireArg('email');
const orderId = requireArg('order');
const paymentChannel = getArg('channel', 'manual');
const amount = getArg('amount');
const note = getArg('note');
const plan = getArg('plan', 'lifetime');
const expiresAt = getArg('expires-at');
const privateKeyPath = resolve(process.cwd(), getArg('key', 'license-private-key.jwk'));
const ledgerPath = resolve(process.cwd(), getArg('ledger', 'license-orders.jsonl'));

const privateJwk = JSON.parse(await readFile(privateKeyPath, 'utf8'));
const privateKey = await webcrypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
);

const payload = {
    version: 1,
    licenseId: `lic_${randomUUID()}`,
    orderId,
    emailHash: createHash('sha256').update(email.trim().toLowerCase()).digest('hex'),
    plan,
    features: ['selected_markdown_export'],
    issuedAt: new Date().toISOString()
};

if (expiresAt) payload.expiresAt = expiresAt;

const payloadPart = textToBase64Url(JSON.stringify(payload));
const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(payloadPart)
);
const licenseCode = `AICK1.${payloadPart}.${bytesToBase64Url(new Uint8Array(signature))}`;

const record = {
    issuedAt: payload.issuedAt,
    orderId,
    email,
    paymentChannel,
    amount,
    plan,
    status: 'active',
    licenseId: payload.licenseId,
    licenseCode,
    note
};

await appendFile(ledgerPath, `${JSON.stringify(record)}\n`);

console.log(licenseCode);
console.error(`Saved order record to ${ledgerPath}`);
