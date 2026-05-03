## Goal

Wrap Cash Stage as a native **Android** app using Capacitor so you can publish it to the Google Play Store.

## What I'll do in Lovable

1. **Install Capacitor packages**
   - `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` (dev)
   - `@capacitor/microphone` — native mic permission for Studio recording

2. **Create `capacitor.config.ts`**
   - `appId`: `app.lovable.8f53de131f084dcca2c86d7b6633dbe8`
   - `appName`: `cashstagebymissbamaslammer`
   - Hot-reload server URL (`https://8f53de13-1f08-4dcc-a2c8-6d7b6633dbe8.lovableproject.com`) so a phone connected over USB can preview live changes during dev

3. **Update the recorder** (`src/hooks/useAudioRecorder.ts`) to request native mic permission on Android via `@capacitor/microphone`, falling back to the browser flow on web. Without this, the mic is blocked on a real device.

4. **Append a build/publish guide to `README.md`** with the exact commands you'll run on your computer.

## What you do on your computer (one-time)

Lovable's sandbox can't produce the `.aab` file Google Play needs — that always happens on your machine.

1. **Connect this project to GitHub** (top-right in Lovable → GitHub → Connect), then `git clone` it.
2. Install **Node.js** and **Android Studio** (both free).
3. In the project folder:
   ```text
   npm install
   npx cap add android
   npm run build
   npx cap sync android
   npx cap open android
   ```
4. Android Studio opens → **Build → Generate Signed App Bundle (.aab)**. Save the keystore safely — you need it for every future update.
5. Create a **Google Play Console** account ($25 one-time) → create app → upload the `.aab`.

After every Lovable change: `git pull` → `npm run build` → `npx cap sync android` → rebuild `.aab`.

## Things Google Play will require (not in this step)

- App icon (512×512) and at least 2 screenshots
- Short + full description
- **Privacy policy URL** (mandatory because you collect mic audio + email)
- Content rating questionnaire

I'm flagging these so you can prepare them in parallel.

## Files I'll touch

- `package.json` — add deps
- `capacitor.config.ts` — new
- `src/hooks/useAudioRecorder.ts` — native mic permission
- `README.md` — append steps

## Out of scope for this step

- Building the `.aab` (must run locally in Android Studio)
- Creating the Play Store listing, icon, screenshots, privacy policy
- iOS / App Store setup (you said Play Store only — easy to add later)

## Reference

[Lovable's complete Capacitor guide](https://lovable.dev/blog/2025-03-25-the-complete-guide-to-building-mobile-apps-with-lovable) — read once before running the commands; it has screenshots for every step.
