# Cash Stage — Play Store Release Checklist

This document is the single source of truth for going from the current prototype
to a published Google Play app.

---

## ✅ Already in the app

- Auth (email + Google), profiles, wallets, anonymous voting
- Studio: record-with-beat, voice FX, upload finished song, signed-URL playback
- Live feed / Battle / Solo / Boosts / Judging Sessions / Crews / Chat / Weekly Contests
- Capacitor configured with permanent `appId: com.missbamaslammer.cashstage`
- AdMob gate with 30-second house ad fallback
- Content moderation: in-app **REPORT** button on every track + `/moderation` admin queue + `is_hidden` filter on feeds
- Google Play Billing wrapper (`src/lib/billing.ts`) with web-mock fallback
- `verify-purchase` edge function that validates Play receipts server-side and grants boosts/subs
- Privacy policy with Google Play Data Safety declarations
- App icon (`public/app-icon.png`)

---

## 🛠 Steps to ship to Play Store

### 1. Local build setup (one time)
1. **Connect to GitHub** (button in Lovable, top right)
2. `git clone <your repo>` → `cd <repo>` → `npm install`
3. `npx cap add android`

### 2. Add the Play Billing native plugin
The web mock works without this; for real Android purchases install one of:
```bash
npm i @capacitor-community/in-app-purchases
# or, recommended for subscriptions: RevenueCat
npm i @revenuecat/purchases-capacitor
```
Then `npx cap sync`. The `src/lib/billing.ts` wrapper auto-detects the plugin at runtime.

### 3. Create the app in Google Play Console
1. New app → name "Cash Stage" → category Music
2. Set the package name **`com.missbamaslammer.cashstage`** — must match `capacitor.config.ts`
3. Complete **Store listing**:
   - App icon → upload `public/app-icon.png` (Play needs 512×512, just resize)
   - Feature graphic (1024×500) — design needed
   - At least 2 phone screenshots
   - Short + full description
4. Complete **Data Safety** form using the declarations in `/privacy` section 10
5. **Content rating** questionnaire → choose 13+ (user-generated audio, virtual money)
6. **Target audience & content** → 13 and over

### 4. Configure in-app products
In Play Console → Monetize → Products, create these SKUs (must match `src/lib/billing.ts`):

| SKU                       | Type         | Price  |
| ------------------------- | ------------ | ------ |
| `boost_25`                | Consumable   | $4.99  |
| `boost_50`                | Consumable   | $8.99  |
| `sub_platinum_monthly`    | Subscription | $9.99  |
| `sub_vip_monthly`         | Subscription | $19.99 |

### 5. Wire server-side receipt validation
1. Play Console → Setup → API access → create a service account with permissions:
   - "View financial data, orders, and cancellation survey responses"
   - "Manage orders and subscriptions"
2. Download the JSON key
3. In Lovable Cloud → Secrets, add:
   - `GOOGLE_PLAY_PACKAGE_NAME` = `com.missbamaslammer.cashstage`
   - `GOOGLE_PLAY_SERVICE_ACCOUNT` = the entire JSON key contents
4. The `verify-purchase` edge function will use these to validate every receipt.

### 6. Replace AdMob test IDs (only if monetizing free tier with ads)
1. Create AdMob account and ad units (rewarded video) for both Android and iOS
2. In `src/components/AdGate.tsx`, swap the test ad-unit IDs for your real ones
3. Add the AdMob app ID to `android/app/src/main/AndroidManifest.xml` per AdMob docs

### 7. Build and upload the AAB
```bash
CAP_ENV=prod npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```
Sign with an upload keystore, upload to Play Console → Production track (or Internal Testing first — recommended).

### 8. Internal testing → Closed testing → Production
- Start in **Internal testing** (up to 100 testers, instant)
- Promote to **Closed testing** to validate billing with real cards (~1–3 days for review)
- Promote to **Production** after at least 14 days of testing (Play requires this for new apps)

---

## 🚧 Known limitations to communicate to early users

- Cash withdrawals (CSB → real $) are **not yet built** — wallet only accumulates. Add Stripe Connect or similar before promising cashouts.
- Currently no email verification of "100% human" — relies on community reporting.
- Free-tier users see a 30-second house promo instead of a real ad until AdMob is configured.
