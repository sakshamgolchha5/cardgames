# Test report — 2026-10-24

This report covers the ChatGPT-produced refreshed source build in this delivery. It does not claim device certification or Play Store approval.

## Automated checks

- TypeScript typecheck (`tsc --noEmit`): passed.
- Production web build (Vite, config discovery disabled for this sandbox): passed; 106 modules transformed.
- Full Vitest run: **281 tests passed across 20 files**.
- Game UI match tests completed bot and pass-and-play matches where supported for all 15 registered games, including 13-card Rummy. Spoons was exercised in its bot and real-time flow.
- Room protocol tests completed a match flow for all 15 registered games, including Rummy and real-time Spoons.
- Engine suites include seeded simulations across configured rule/option cases. This is not exhaustive proof for every possible option combination.
- Hub coverage includes all 15 game cards, persistent Games navigation/back action, theme and card-back persistence, recent human opponents from the latest 10 history records, and shared invitation accept behavior.
- After the final game-card sizing adjustment, the focused hub and PWA rerun passed all 11 checks.
- PWA check verifies manifest identity, icon paths/sizes, standalone/fullscreen display choices, service-worker safeguards and SPA fallback configuration.

## Browser and delivery checks

- Opened the production build in a local browser preview and visually checked the game library, Friends dropdown and game setup with its Back control.
- Local HTTP requests returned 200 for `/`, `/manifest.webmanifest`, `/sw.js`, `/icon-192.png` and `/brand-mark.svg`.
- Did not test on a physical Android/iOS device, install from a Play Store testing track, or verify the production Vercel deployment in this pass.

## Limits

- The app currently saves local display names and player IDs; it does not have hosted sign-in or globally reserved usernames.
- Recent players are read from locally saved history, deduplicated, and capped at 8 names from up to the last 10 matches. They are invite targets only if the user shares the room code/link; there is no push delivery, background notification or live presence.
- Room-code play requires internet access and a reachable PeerJS signaling service.
- Profile, friend list, history, coins and cosmetics are device-local and are not synchronized or recoverable after browser data is cleared.
- No signed Android App Bundle, store listing, publisher details, public policy URLs, Play Console track, third-party service review or legal review was completed.

## Test environment

Node.js and the project dependency folder were available, but the `npm` command was not on PATH. Tests were run through Vitest's programmatic API with config discovery disabled due to the sandbox's parent dependency layout. One initial run exposed a stale orientation assertion and one intermittent Ghulam Chor pass-and-play simulation; after correcting the PWA expectation, the isolated match passed and the complete rerun passed all 281 tests.
