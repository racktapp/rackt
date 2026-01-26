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
development build. Expo Go cannot load the gamepad module.

### Build and install the iOS dev client

To test controllers you must build a development client:

```bash
eas build --platform ios --profile development
```

Install the build on your device from the EAS build URL (scan the QR code on
your iPhone).

### Run Metro for the dev client

After installing the build, run:

```bash
npx expo start --dev-client --tunnel
```

Open the Rackt dev client app on your iPhone via the QR code in the Expo CLI.

### Test controller input

1. On iPhone, go to Settings → Bluetooth and pair your Xbox/PlayStation controller.
2. In the app, tap **Controller Setup** on the Home screen.
3. Confirm the status shows **Connected** and press buttons to see live event logs.

> Android support is coming soon; the screen shows a placeholder on Android.
