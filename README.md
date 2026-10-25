# Card Club Arcade

Card Club Arcade is an installable web app with a library of 15 card games. This refreshed project keeps the existing game engines, rules, variants, bots, scoring and room-code multiplayer while improving the hub navigation, appearance and phone install experience.

## Local development

1. Install a current Node.js LTS release.
2. Run `npm ci`.
3. Run `npm run dev` for local development, `npm run typecheck` for TypeScript checks, `npm test` for automated tests, or `npm run build` for a production build.

The browser app uses root-relative URLs and `vercel.json` provides an SPA fallback. Deploy from the project root with Vercel's Vite build command `npm run build` and output directory `dist`.

## Install on a phone

Deploy to HTTPS and install the site from a supported browser. An installed app can open in its own app window or fullscreen, depending on the browser and OS. The hub remains usable in portrait; a game can request landscape orientation when supported. Browsers and operating systems may ignore that request. See `docs/PWA_ANDROID_INSTALL.md` for install and device-check guidance.

## Play and saved data

- Open the Games library and choose a game, then select its mode and options.
- The compact top row contains Games, Collection, History, Settings and Rules. Friends is the only dropdown; it includes saved friends and players from the last 10 match records.
- An Invite action creates a room; share the generated invite link or room code with the other player. Opening a shared link shows an accept/decline prompt. There is no push delivery or live online status without a hosted social service.
- Guest profile, display name, avatar, device-generated player ID, saved invite names, recent-match records, cosmetics, preferences and play coins are stored in this browser on this device. They do not sync to other devices. A device-generated ID is not a globally reserved unique username.
- Play coins are virtual points used for cosmetic unlocks. They have no cash value and are not used to wager on outcomes.
- Room-code games use PeerJS/WebRTC and require internet access. Offline mode caches the app shell and static assets; it does not make online rooms work offline.

See `docs/FEATURE_STATUS.md` for service-dependent limits and `docs/TEST_REPORT.md` for verification performed on this source build.
