# Security notes

## `ALLOW_MOCK_PURCHASES`

The `verify-purchase` edge function supports two purchase platforms:

| `platform` value | When it's used                              | How it's verified                              |
| ---------------- | ------------------------------------------- | ---------------------------------------------- |
| `android`        | Real Google Play in-app purchase            | Google Play Developer API v3 (service account) |
| `web_mock`       | Local / preview testing of the checkout UI  | **Only** when `ALLOW_MOCK_PURCHASES=true`      |

`ALLOW_MOCK_PURCHASES` is a **runtime secret** read by
`supabase/functions/verify-purchase/index.ts`. When it is anything other than
the literal string `"true"`, every `web_mock` request is rejected with
HTTP 403 `{ "reason": "mock_disabled" }`. The flag therefore fails closed.

### Rules

- **Production**: the flag must be **unset** (or set to anything other than
  `"true"`). Mock purchases must never grant boosts or subscriptions on the
  live backend.
- **Preview / local**: set `ALLOW_MOCK_PURCHASES=true` only in non-production
  Supabase projects when you need to exercise the checkout flow end-to-end
  without Play billing.
- Do **not** export `ALLOW_MOCK_PURCHASES=true` in any shell that will run a
  release build — the guard described below will fail the build if it sees it.

### How to disable mock purchases

1. Open the backend settings for the **production** project.
2. Delete the `ALLOW_MOCK_PURCHASES` secret (or set it to anything other than
   `true`).
3. Re-deploy the `verify-purchase` function. For Lovable-managed functions
   this happens automatically on the next push.
4. Smoke test from the web app — a `web_mock` purchase attempt should now
   return `403 mock_disabled`.

## Build-time guard

`scripts/check-prod-config.mjs` blocks any release build when:

1. `ALLOW_MOCK_PURCHASES=true` is present in the build environment, **or**
2. the `verify-purchase` edge function no longer contains the
   `ALLOW_MOCK_PURCHASES` / `mock_disabled` refusal branch (defence against
   accidentally deleting the gate itself).

The guard runs:

- At the top of `scripts/release-aab.sh` (local and CI Play Store builds).
- As an early step of `.github/workflows/android-release.yml` (release
  pipeline triggered by `v*.*.*` tags or `workflow_dispatch`).

Run it manually any time with:

```bash
node scripts/check-prod-config.mjs
```

Exit code `0` = safe, exit code `1` = the build must abort.
