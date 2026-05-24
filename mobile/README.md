# Vault Mobile (React Native)

This folder contains a minimal Expo-based React Native app scaffold for the Vault mobile version.

The mobile app starts directly on authentication, with no separate landing page.

Quick start:

```bash
cd mobile
# install packages (choose one)
npm install
# or
# pnpm install
# or
# yarn install

# copy env vars and configure Supabase credentials
cp .env.example .env
# then edit mobile/.env to set your Supabase values

# start Metro / Expo
npm run start

# to run on Android/emulator
npm run android

# to run on iOS (macOS only)
npm run ios
```

Environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The mobile app also accepts `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` if you prefer the Expo-style names.

Notes:

- The mobile app uses the same Supabase backend as the web app.
- It begins on login/sign-up and does not render a landing page.
- After login, it shows a small authenticated dashboard placeholder you can expand later.
