import type { CapacitorConfig } from '@capacitor/cli';

// Set CAP_ENV=prod (or run `npm run cap:build:prod`) to build a release that
// loads the bundled web assets in `dist/` instead of the live sandbox preview.
// Default behaviour keeps hot-reload from the Lovable sandbox for local dev.
const isProd = process.env.CAP_ENV === 'prod';

const config: CapacitorConfig = {
  // ⚠️ IMPORTANT: appId is PERMANENT once published to Play Store.
  appId: 'com.missbamaslammer.cashstage',
  appName: 'Cash Stage',
  webDir: 'dist',
  ...(isProd
    ? {}
    : {
        server: {
          url: 'https://8f53de13-1f08-4dcc-a2c8-6d7b6633dbe8.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }),
  android: {
    allowMixedContent: false,
  },
};

export default config;
