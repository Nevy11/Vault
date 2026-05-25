import { config } from 'dotenv';

config();
config({ path: '.env.local' });

export default {
  expo: {
    name: 'Vault Mobile',
    slug: 'vault-mobile',
    version: '1.0.0',
    sdkVersion: '54.0.0',
    platforms: ['ios', 'android', 'web'],
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
