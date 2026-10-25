# Release readiness — 2026-10-24

## Current state

This is a web/PWA preview built from the ChatGPT-produced refreshed project source being edited for this delivery. It is not a Play Store release candidate. The PWA can be deployed as static files to an HTTPS host and opened from a phone. The hub does not force orientation; installed game screens may request landscape when supported. Real-device and OS/browser coverage has not been completed. See the current `TEST_REPORT.md` and `FEATURE_STATUS.md` for the checks and service-dependent limits.

## Before a public web/PWA release

- Verify HTTPS hosting, install/offline update behavior, browser support, layout and accessibility on the chosen real phone/browser matrix.
- Confirm the external PeerJS signaling service, its data flow, uptime, privacy terms, and production suitability; add connection-failure/reconnect coverage.
- Confirm all game rules, especially the Rummy assumptions in `RUMMY_RULES.md`, and complete the testing matrix in `TEST_REPORT.md`.
- Replace publisher/contact placeholders in the privacy and terms drafts; publish a stable privacy-policy URL and have legal counsel review the final texts.
- Decide the target audience and age rating. Ensure multiplayer and social features match that audience. Do not label the draft policy as a final notice.

## Additional Google Play work

- Add an Android wrapper and create, sign, and verify a release Android App Bundle. This repository contains no Android project, application ID, signing configuration, store listing, or uploaded build.
- Complete the Play Console Data safety form from an accurate map of device storage, PeerJS signaling/connection data, and every production SDK/service. Google's instructions require developers to disclose collection/sharing and security practices accurately.
- Supply a public privacy policy and a support contact. If account creation is introduced, implement in-app account deletion and a working web deletion request URL as described by Play's account-deletion policy.
- Complete content rating, target audience, app access, ads declaration (currently no ads), permissions declaration, store graphics, and any country-specific declarations.
- Recheck Google Play payment rules if cosmetics ever become purchasable: digital goods offered in a Play-distributed app may require Play Billing. This build only has local demo coins and no purchases.
- Run Play pre-launch/device checks and test installation, upgrades, offline mode, network permissions, landscape play, accessibility, and crash behavior on real supported devices.

## Legal / privacy review

The current local build stores guest settings, name, tag, favorites, local friend names, coin balance, and history in browser local storage. It uses the PeerJS client for room-code multiplayer. No account, friend discovery/presence, voice, analytics, ads, or payment service is configured in this source. Verify the actual deployed production path, third-party service terms, retention, transfer, security, audience, and deletion choices before making these statements publicly.

If offered in India, ask counsel to assess the Digital Personal Data Protection Act and the Digital Personal Data Protection Rules, 2025, against the final service and the current phased commencement schedule. This checklist is not a legal opinion and makes no claim of compliance.

## Official references checked 2026-10-21

- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play Data safety](https://support.google.com/googleplay/answer/11416267?hl=en)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-gb)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en-en)
- [Google Play content ratings](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en)
- [Google Play Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- [India MeitY: Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit)

Passing this checklist is a release task for the publisher and legal reviewer; it is not an automatic certification.
