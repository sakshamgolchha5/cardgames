# Feature status and next steps

## Present in this build

- Separate Games, Friends, Collection, History, Profile, and Settings screens.
- Existing game catalog, setup choices, bot matches, pass-and-play, help/tutorials, scorecards, and room-code multiplayer remain accessible.
- Responsive portrait hub and landscape card table; PWA manifest, offline service worker, generated app icons, and same-origin static assets.
- Guest name, avatar, installation-local `CCA-...` player tag, favorites, theme/card-back ownership, demo coin balance, and match history stored in browser local storage.
- Twelve table themes and twelve card backs. Cosmetics are unlocked with demo coins only.
- Manual daily check-in reward (+25). Completed matches pay a placement bonus (1st +100, 2nd +60, 3rd +35, 4th +20, 5th/6th +10) plus +15 for completion. No coins are sold or redeemable.
- Friends screen keeps local names and launches a room-code invite. Room host has a share/copy affordance for the code.
- Added 13-card Rummy; BlackJack is not included.

## Requires hosted services / product decisions

- Real sign-in, globally unique username reservation, account recovery, abuse controls, and profile/avatar sync.
- Real friend requests, cross-device friends list, online status, invitations/notifications, and calls.
- Server-backed wallet/rewards, tamper resistance, and cloud match history. Current rewards are client-side demo data and can be changed by editing browser storage.
- A stable multiplayer signaling/hosting plan, privacy review of its data flow, reconnect handling, operational monitoring, and moderation/safety design.
- Payment processing and coin redemption are intentionally absent. If digital goods are later sold in a Play-distributed app, implement the applicable Play billing and disclosure flow.
- Native Play Store package, signing, device testing, publisher identity, support contact, privacy-policy URL, data-safety form, age/content rating, target audience decision, and store review.

## Ordering

1. Confirm Rummy rules and complete engine/UI/gameplay QA across every supported configuration.
2. Decide whether Card Club Arcade stays a web/PWA game or will ship a Play Store Android app, then select the host/backend and identity model.
3. Implement and security-test account, unique handle, social graph, server-side wallet and rewards, and data deletion before enabling their UI.
4. Finalize privacy/terms and store declarations from the actual data map and publisher details; test on the supported physical phones and OS versions.
