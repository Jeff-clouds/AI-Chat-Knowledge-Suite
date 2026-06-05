import { mkdir, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const privateKeyPath = resolve(root, 'license-private-key.jwk');
const publicKeyPath = resolve(root, 'src/core/license-public-key.js');

const keyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
);

const privateJwk = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey);
const publicJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);

await mkdir(dirname(publicKeyPath), { recursive: true });
await writeFile(privateKeyPath, `${JSON.stringify(privateJwk, null, 2)}\n`);
await writeFile(publicKeyPath, `export const LICENSE_PUBLIC_KEY = ${JSON.stringify(publicJwk, null, 4)};\n`);

console.log(`Private key written to ${privateKeyPath}`);
console.log(`Public key written to ${publicKeyPath}`);
