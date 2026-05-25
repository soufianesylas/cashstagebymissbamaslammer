## Goal

Document `ALLOW_MOCK_PURCHASES` clearly, and make it impossible to ship a production build while it's enabled.

## What changes

### 1. `scripts/check-prod-config.mjs` (new)

A small Node guard, exit 0 = safe, exit 1 = abort. Fails the build if either:

- `process.env.ALLOW_MOCK_PURCHASES === "true"` at build time, or
- `supabase/functions/verify-purchase/index.ts` no longer contains the
  `ALLOW_MOCK_PURCHASES` / `"mock_disabled"` refusal branch (so the gate
  itself can't be silently deleted).

### 2. `scripts/release-aab.sh` (edit)

Add `node scripts/check-prod-config.mjs` immediately after the signing env
check, before `npm ci` runs. Any local or CI Play Store build aborts here
if mock purchases are enabled.

### 3. `.github/workflows/android-release.yml` (edit)

Add a new step `Production config check (block mock purchases)` that runs
`node scripts/check-prod-config.mjs` right after `npm ci`, so tag pushes
and `workflow_dispatch` releases also fail closed.

### 4. `docs/SECURITY.md` (new)

Documents:

- What `ALLOW_MOCK_PURCHASES` does (only enables `web_mock` purchase
  verification in the edge function).
- Where it may be set: preview / local non-production projects only.
- Where it must never be set: production backend / release builds.
- How to disable it (delete the runtime secret, redeploy, smoke test
  `web_mock` returns `403 mock_disabled`).
- That `scripts/check-prod-config.mjs` enforces this at build time, wired
  into `release-aab.sh` and the release workflow.

## Verification

- Run `node scripts/check-prod-config.mjs` locally → exits 0.
- Run `ALLOW_MOCK_PURCHASES=true node scripts/check-prod-config.mjs` → exits 1
  with a clear message.
- Temporarily remove the `mock_disabled` branch from the edge function →
  guard exits 1.

## Files touched

```text
scripts/check-prod-config.mjs            new
scripts/release-aab.sh                   edit (add guard call)
.github/workflows/android-release.yml    edit (add guard step)
docs/SECURITY.md                         new
```

No runtime app code or database changes.
