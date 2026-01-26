# Mobile (Expo)

## Prerequisites

- Node.js 18+
- Expo CLI (optional)

## Setup

```bash
cd apps/mobile
npm install
```

Create a `.env` file (values are placeholders):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Run

```bash
npm run start
```

Then choose a platform (iOS, Android, or Web) from the Expo DevTools.

## iOS dev client (controller testing)

This app uses a native module for controller input, so you must use an EAS
development build (not Expo Go).

### Rebuild after native module changes

After changing native modules you MUST rebuild:

```bash
eas build --platform ios --profile development
```

Then run:

```bash
npx expo start --dev-client --tunnel
```

### Build and install the iOS dev client

```bash
cd apps/mobile
eas build --profile development --platform ios
```

When the build finishes, install it on your device from the EAS build URL
(scan the QR code on your iPhone).

### Run Metro for the dev client

```bash
cd apps/mobile
npx expo start --dev-client
```

Open the Rackt dev client app on your iPhone and it will connect to Metro.

### Test controller input

1. On iPhone, go to Settings → Bluetooth and pair your Xbox/PlayStation controller.
2. In the app, tap **Controller setup** on the Home screen.
3. Confirm **Status: Connected** and press buttons to see live event logs.

> Android support is coming soon; the screen shows a placeholder on Android.
