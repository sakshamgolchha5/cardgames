# Project context

## Source of truth

This refresh starts from the user-provided Claude v11 ZIP, not from the previous ChatGPT feature-layer ZIP. The uploaded v11 archive was verified before extraction (SHA-256: `E241D38C0274CA3F0B0881FADA7AD612A97C017D7654D7D8B9A5369321B7ACD0`). The supplied Claude PDF and live Vercel version were references; the live site exposed 14 playable games and marked Rummy and Blackjack as coming soon. The code registry also has 14 pre-existing playable games. This build adds Rummy and does not add Blackjack.

## Preservation rule

The original game engines, variants, scoring, bots, rules, and multiplayer behavior remain the baseline. UI and supporting features were added around them. Rummy is the only new engine. Do not treat platform features as a reason to rewrite another game's rules.

## Runtime model

The project is a static React/Vite web app with PWA assets. It has no required device filesystem path, local database server, or C-drive reference. Browser local storage holds guest preferences and local history. Solo play and pass-and-play do not require a service. Room codes use the configured PeerJS service and do require internet access.

## Product limits

Guest tags are installation-local identifiers, not authenticated or globally reserved usernames. The friend list is a local invite-name list. Room-code multiplayer can be started and shared using the device share sheet, but there is no account-based friend discovery, notification service, or voice call. A PWA can be installed from the deployed HTTPS site, but the repository is not an Android App Bundle and has not been submitted to Google Play.

## Source documents

- `STATUS.md`: v11 development notes and inherited verification history; older checks are not claims about this refresh.
- `RULES_TO_CONFIRM.md`: inherited regional game-rule decisions to revisit.
- `RUMMY_RULES.md`: new Rummy assumptions.
- `GAME_INVENTORY.md`: titles, configurations, and play modes in this version.
