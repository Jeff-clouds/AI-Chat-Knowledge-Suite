# License Tools

These scripts generate and verify local Pro license codes.

## Generate key pair

```bash
node scripts/license/generate-keypair.mjs
```

This writes:

- `license-private-key.jwk`: signing key, ignored by git
- `src/core/license-public-key.js`: verification key, bundled with the extension

## Generate a license

```bash
node scripts/license/generate-license.mjs --email=user@example.com --order=order_001
```

The generated license includes `licenseId`, `orderId`, `emailHash`, `plan`, `features`, and `issuedAt`.

## Issue a manual paid license

Use this after confirming a paid order in Lemon Squeezy, Gumroad, WeChat, Alipay, or another payment channel.

```bash
node scripts/license/issue-manual-license.mjs \
  --email=user@example.com \
  --order=lemonsqueezy_order_001 \
  --channel=lemonsqueezy \
  --amount=69
```

This prints the license code and appends a private record to `license-orders.jsonl`.
The ledger is ignored by git and should be backed up separately.

## Verify a license locally

```bash
node scripts/license/verify-license.mjs 'AICK1...'
```

Do not commit private keys.
