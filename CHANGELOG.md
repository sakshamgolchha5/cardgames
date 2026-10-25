# Changelog

## 2026-10-24 — Hub navigation and invitation pass

- Replaced the prior side/bottom navigation and Quick Play/search panel with a compact, labelled top row and persistent Games/back-to-Games route.
- Made Friends the only navigation dropdown. It lists locally saved invite names and unique human opponents from up to the latest 10 match records, with a current display cap of 8 names.
- Added invite game selection in Friends and shared room invite links that present the game, inviter, accept and decline choices when opened.
- Increased navigation label readability while retaining a horizontally scrollable compact header on narrow screens.
- Removed forced manifest orientation; installed games may request landscape where browser/OS support permits.
- Corrected README and feature status for current routes, local-only saved data and missing backend-dependent services.
- Verified typecheck, production build, local PWA file requests and full test suite: 281 tests passed across 20 files.

## 2026-10-23 — Platform and UI correction pass

- Replaced the permanent sidebar with an overlay drawer, later replaced by the current compact top navigation.
- Restored a warm gold and ivory Clubhouse default, and expanded the cosmetic collection.
- Reworked profile/settings panels; added adjustable card size, install guidance, local-data clearing, and in-app Privacy and Terms pages.
- Updated PWA metadata for standalone display, asset-only offline caching, app-shell fallback, service-worker update checks, and Vercel SPA routing.
- Kept backend-dependent sign-in, global friends, cloud sync, purchases and account deletion documented as unavailable.
- Existing game engines, rules, variants and game list were not changed in these UI passes.

## Earlier source refresh

- Added the game hub, local rewards and profile experience to the ChatGPT-produced project source.
- Added 13-card Rummy; see `docs/RUMMY_RULES.md` and `docs/PROJECT_CONTEXT.md`.
