# Cash Stage

## Publishing to the Google Play Store (Android)

This project is wrapped with [Capacitor](https://capacitorjs.com) so it can ship as a native Android app.

### One-time setup on your computer

1. Connect this Lovable project to GitHub (top-right → GitHub → Connect), then `git clone` the repo.
2. Install [Node.js](https://nodejs.org) and [Android Studio](https://developer.android.com/studio).
3. From the project folder:

   ```bash
   npm install
   npx cap add android
   npm run build
   npx cap sync android
   npx cap open android
   ```

4. Android Studio opens. Run **Build → Generate Signed App Bundle (.aab)**.
   Save the keystore + passwords somewhere safe — you need the same one for every future update.

### Submit to Google Play

1. Create a [Google Play Console](https://play.google.com/console) account ($25 one-time).
2. Create a new app, upload the `.aab`, fill in:
   - App icon (512×512 PNG)
   - At least 2 phone screenshots
   - Short + full description
   - **Privacy policy URL** (required — you collect mic audio + email)
   - Content rating questionnaire

### Updating the app later

Every time you make changes in Lovable:

```bash
git pull
npm run build
npx cap sync android
```

Then rebuild the `.aab` in Android Studio and upload a new release in Play Console.

### Reference

[The complete guide to building mobile apps with Lovable](https://lovable.dev/blog/2025-03-25-the-complete-guide-to-building-mobile-apps-with-lovable)
