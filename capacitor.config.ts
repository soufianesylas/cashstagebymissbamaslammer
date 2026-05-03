import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8f53de131f084dcca2c86d7b6633dbe8',
  appName: 'cashstagebymissbamaslammer',
  webDir: 'dist',
  server: {
    url: 'https://8f53de13-1f08-4dcc-a2c8-6d7b6633dbe8.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
