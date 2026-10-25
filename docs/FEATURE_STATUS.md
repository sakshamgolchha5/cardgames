# Feature status — 2026-10-24

This status describes the ChatGPT-produced refreshed project source being edited for this delivery. The Claude v11 archive was not used as the source for this UI iteration.

## Available in this build

- A library of 15 games, with their current engines, rules, bots, scoring, variants, room-code multiplayer and pass-and-play flows retained during this UI pass.
- A labelled compact navigation row with a persistent Games route, a back-to-Games action away from the library, Collection, History, Settings and Rules. Friends is the only dropdown; the previous persistent side/bottom navigation and Quick Play/search are removed.
- Friends shows locally saved names and recent human opponents found in the latest 10 completed match records. Recent invite targets are deduplicated and currently capped at 8 displayed names. Legacy records are filtered for the local player, generic seats and known bots when possible.
- Invite actions configure an existing room-code game. The host can share a room link/code; opening a shared invite link shows the game and inviter with accept/decline actions. These buttons navigate into the existing join flow.
- A warm Clubhouse default and 13 table themes plus 12 card backs. Themes, card backs, navigation surfaces and table panels use shared tokens and persist locally. Free options remain available.
- Local guest display name, avatar, device-generated player ID, daily reward, game completion reward, cosmetic ownership, settings and match history.
- Settings include card size, reduced motion, install guidance, local-data clearing, Privacy, Terms and Help.
- Root-scoped standalone PWA metadata, optional fullscreen display override, icons, Vercel SPA fallback, app-shell navigation fallback and static asset caching.

## Partial / device-dependent

- The display name is editable but not globally unique. Player ID is generated on the device and is not reserved across accounts.
- Friends and recent players are local history/invite data. There is no server-side friend search, requests, blocks, live presence, voice call, or push invitation. Invite recipients must open the shared link; an app that is closed cannot receive a notification.
- Profile, friends, match history, cosmetics and coins are local browser storage. They are not synchronized, secure, or recoverable after browser data is removed.
- Coin rewards and cosmetic purchases are local demo economy data; there is no server ledger or Play Billing. Coins have no cash value.
- Fullscreen installation, landscape lock and offline behavior depend on browser/OS support. No physical Android or iOS device test was available in this pass.
- Room-code multiplayer requires internet and a reachable PeerJS signaling path.
- Privacy and terms drafts reflect the current implementation. The publisher must validate the deployed host, third-party processing, contact details and launch jurisdictions before release.

## Requires a hosted service, publisher action, or release validation

- Account sign-in, globally unique username reservation, account recovery and guest-to-account migration.
- Cloud backup/sync, server-side rewards, account deletion endpoint and cross-device friends/history/currency.
- Push delivery, presence, friend requests/blocks, moderation, voice, paid purchases and Google Play Billing.
- Android wrapper or signed Android App Bundle, Play Console configuration/listing, public policy URLs, production contact details, and legal/privacy review.

Do not describe local storage as cloud backup or the player ID as a globally unique username. Do not describe the project as Play Store ready until publisher, legal, device and store checks are completed.
