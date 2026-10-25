# Deployment checklist

## Vercel web build

- Import the project folder containing `package.json` and `vercel.json`.
- Use Vite as the framework, `npm ci` as install command, `npm run build` as build command, and `dist` as output directory.
- Use the intended HTTPS domain. Confirm the root path and a nested SPA path both load the app.
- Confirm `/manifest.webmanifest`, `/sw.js`, `/brand-mark.svg`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`, and `/apple-touch-icon.png` return successfully.
- Confirm the service worker is scoped to `/`, the manifest links its icons, and old cached app shell versions are replaced after an update.

## Device and gameplay checks

- Install from Android Chrome on the intended test device. Verify app icon, standalone opening, landscape match behavior and portrait-responsive hub.
- Test a short landscape phone, a larger phone/tablet, safe-area insets, compact top navigation and Friends dropdown, card size settings, reduced motion, and keyboard/focus navigation.
- Play each game and variant on target devices, including bot, pass-and-play where supported, and room-code modes. The automated suite does not cover complete matches for every possible option combination.
- Test room-code multiplayer across separate devices and networks with the deployment's actual PeerJS signaling path.
- Test offline opening only after a successful online load; reconnect and check that a new deployment becomes active.

## Store-readiness work outside this web source

- Decide publisher identity, support contact, target markets and minimum age rating.
- Publish final privacy and terms URLs on the production domain, and have them reviewed for the deployment's real hosting, signaling, telemetry and jurisdiction configuration.
- Configure consent and account deletion flows if accounts or analytics are added. Do not add store declarations for services that are not present.
- Create the Android wrapper and signed App Bundle, configure Play App Signing, store listing assets and policy declarations in Play Console.
- Run a Play internal testing track on physical devices and record the review results before public release.

This web project alone does not create an Android App Bundle or complete a Play Console release.
