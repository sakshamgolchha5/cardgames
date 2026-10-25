# Privacy policy draft — Card Club Arcade

**Draft for review. Do not publish as-is.** Fill every bracketed item and have the final version reviewed against the shipping app, hosting configuration, backend, and the laws in the countries where it will be offered.

**Publisher:** [legal name]  
**Contact:** [privacy/support email and postal address]  
**Effective date:** [date]  
**Public policy URL:** [HTTPS URL]

## What this version does

Card Club Arcade is currently a guest web game. Display name, avatar, local player tag, friend-name list, favorites, chosen theme/card back, demo coin balance, daily-check-in date, and match history are stored in browser local storage on the device. They are not uploaded for account sync, and clearing site data removes them. The tag is installation-local and is not an account or a promise of global uniqueness.

When a player starts or joins a room-code multiplayer game, the app loads PeerJS and uses its configured signaling service to establish a WebRTC connection. Players' display names and game messages/state are exchanged for the room. The host maintains the authoritative game state. The publisher must verify the final PeerJS service, server region, retention/logging, encryption, and any processing by that service before publishing this policy. The current source does not include analytics, advertising SDKs, payment processing, or an account database.

## Children and social features

[State the intended age group, age-screening approach, and whether the app is directed to children. Document any parental consent and moderation design if applicable.] Multiplayer uses user-entered display names and room codes. This build has no global search, chat, voice, friend presence, reporting, blocking, or account service. Do not claim those protections exist.

## Choices, requests, and deletion

Players can stop using multiplayer and can clear local data through their browser settings. There is no online account in this version to delete. If accounts are added, provide an in-app account deletion request and a working public web deletion link, describe what is deleted and what is retained, and test the complete flow before release.

## Changes and contact

We will update this page when the app's data practices change. Contact [privacy email] for privacy questions or requests.

## Publisher completion checklist

- Replace all bracketed details and provide a public HTTPS policy page.
- Confirm data flows, controller/processor roles, retention, transfers, security measures, and age audience for production hosting and PeerJS configuration.
- Add any analytics, crash reporting, advertising, authentication, friend/social, payments, or cloud-save processors only after updating this notice and store disclosures.
- Have counsel review the final text for the countries of distribution, including India if offered there.
