# Card Club Arcade — Build Plan
Goal: one publishable Android app (plus web build) with ~18 card games, playable vs bots, pass & play, and room-code multiplayer. Free hosting: GitHub + Vercel. Android APK/AAB built by GitHub Actions (Capacitor).

## Architecture
- `src/engine`: shared card primitives, seeded RNG. No UI code.
- `src/games/<game>`: one rules engine per game (legal moves, scoring, scorecard history, per-seat `view()` hiding other hands) + bot strategies (easy/medium/hard).
- UI (React + Vite): one universal Table (2-10 seats, avatar, name, fanned backs, all played cards visible, no "thinking" text, Fast/Normal/Slow bot speed), scrollable Lobby with fixed Start button, universal Scorecard (column per round, stored on device).
- Tests: Vitest unit tests + thousands of seeded simulated games per engine (card conservation, termination, scoring).

## Phases
1. Platform + Callbreak fully finished (engine, bots, table, lobby, scorecard, pass & play, variants).
2. Trick-taking: Hearts, Court Piece (Single/Double/Ace Sir), Dehla Pakad (Hide/Katte, 1-4 decks, 4-8 players), 3-2-5, Confidence.
3. Shedding/matching: Bluff, Seven, Ghulam Chor, Donkey, President, Spoons, Yaniv.
4. Strategy: Cabo, 13-card Rummy, Blackjack, Teen Patti, Poker (open decision: Play Store simulated-gambling / 18+ rating).
5. Room-code multiplayer (peer-to-peer, host-authoritative).
6. Profile, gems, XP, achievements, power-ups, sound, photo avatars.
7. Android packaging + Play Store prep (icons, privacy policy, data safety, LICENSE, testing tracks).

## Working rules
Each "continue" = one step. Progress reported in chat; zip delivered at phase ends. Ambiguous rules go to docs/RULES_TO_CONFIRM.md. Status tracked in docs/STATUS.md.

## Update
- Teen Patti / Poker removed (Play Store simulated-gambling rating avoided). Replaced by 4-5 games to be chosen from the reference app list.
