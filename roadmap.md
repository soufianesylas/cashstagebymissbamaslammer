# Roadmap

## Play Store identity (recovered from production APK — see docs/APK_RECOVERY.md)
- [x] Lock app id to published `com.cash.missalabamaslammer.cashstage`
- [x] Baseline versionCode 59 so next upload must be higher
- [x] Update native sign-in return address to `com.cash.missalabamaslammer.cashstage://oauth-callback` in code — one manual step left: add that URL in Lovable Cloud → Users → Auth Settings → URL Configuration

## Features
- [ ] Challenge creation + entry sharing (DB + /challenges page)

- [ ] Wire AudioPlayer into Drops, BeatLibrary, BeatOfTheDay
- [ ] "Spin the Wheel" tile on Boosts page
- [ ] Stripe checkout on Pricing ($12.99 Platinum / $22 VIP) + tier badge
- [ ] Cash prize flow: daily solo rank $5/day + competition pot with $2 rally tickets
- [ ] Collab feed: chatroom posts surface in collab feed and /collabs
- [ ] Play Store update v60: on a machine with Java 17 + Android SDK + the upload keystore, run `npm run release:60` (or `npm run release:60:upload` with GOOGLE_PLAY_SERVICE_ACCOUNT). Cannot run in Lovable — no Android SDK / keystore here.
