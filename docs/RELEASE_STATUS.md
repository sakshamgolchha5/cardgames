# Card Club Arcade — release status

**Current project source:** ChatGPT-produced refreshed project version edited for this delivery. The Claude v11 ZIP is not the basis for this UI correction pass.  
**Review date:** 2026-10-24

## Current state

This is a web/PWA preview, not a Play Store release candidate. It contains 15 games including 13-card Rummy. The present UI has a compact top navigation row, Games library, separate Friends management and a Friends dropdown with saved names and recent players. The detailed status is maintained in `FEATURE_STATUS.md`; verification details are in `TEST_REPORT.md`.

## Verification summary

- TypeScript typecheck passed.
- Vite production build passed.
- Full automated rerun passed 281 tests across 20 files.
- A final focused rerun after a CSS sizing adjustment passed 11 hub and PWA checks.
- Local browser preview checked the library, Friends dropdown and a game setup; selected PWA paths returned HTTP 200.

This is not a device-certified or store-approved build. The tests do not cover every possible variant/options combination. Physical Android/iOS testing, production service validation, Play Console configuration, publisher/legal review and a signed Android App Bundle remain outstanding.

## Current feature truth

| Feature | Current behavior |
|---|---|
| Games | 15 registered games; UI pass preserves existing game engines, rules, variants, bots, scoring and multiplayer protocol. |
| Friends and recent players | Saved invite names and deduplicated human names from the latest 10 local match records (maximum 8 shown). Shared room link opens accept/decline actions. No push, presence or server-side friend system. |
| Profile | Local display name, avatar and device-generated player ID; no sign-in or global name reservation. |
| Coins and cosmetics | Local demo balance, daily/match reward and cosmetic unlocks. No purchase, real-money value or cloud ledger. |
| History | Device-local scorecards; not synced. |
| Phone install | PWA manifest and icons are present. Orientation/fullscreen depend on browser and OS; physical device behavior is unverified. |
| Play Store | Not ready: no Android project/AAB, signing, store listing, production contact details, final policy URLs, store declarations or device sign-off. |

Review `RELEASE_READINESS.md` before any public release. Privacy and terms drafts still need publisher and legal review against the actual hosted services and target jurisdictions.
