# Game inventory — refreshed Claude v11 source

There are 15 listed games: the original 14 playable games plus newly added 13-card Rummy. Blackjack remains out because it was shown as coming soon in the referenced version. Game titles and options below are read from `src/games/registry.ts`.

All listed games offer bot matches and room-code multiplayer. Pass-and-play is available except for Spoons, whose timed real-time loop is marked as unavailable for pass-and-play. Bots fill empty seats in room-code games.

| Game | Seats | Configurable options / variants |
|---|---:|---|
| Callbreak | 4 | 3 or 5 rounds; Normal, Super 8, or Blind bid; must-beat rule; redeal when no spade. |
| Hearts | 3-8 | 50/100/150-point end; card passing on/off; two moon-scoring choices; Jack of Diamonds normal or -10; Q♠ heart-breaking rule. |
| Court Piece | 4 | Single Sir, Double Sir, or Double Sir + Ace rule; caller-picks or Be-ranga trump; 5/7/11-point end. |
| Dehla Pakad | 4 | Cut, hidden, random, or caller-picked hukum; 3/5/7-point end; Mendikot/Whitewash bonus or flat deal scoring. |
| 3-2-5 | 3 | 3/5/10 rounds; tricks-minus-target or tricks-won scoring; 7♥/7♠ normal or top trump. |
| Confidence | 3-10 | 1/2/3 decks; dealer-last bid restriction on/off. |
| Bluff | 2-10 | 1/2/3 decks; starter names rank or rank cycles; one card or any number per turn; 1/3/5 deals. |
| Seven | 2-8 | 7♥ or 7♦ starts; card-value or cards-left penalty; 1/3/5 deals. |
| Ghulam Chor | 2-10 | 1/2/3 decks; 1/3/5 deals. |
| Donkey | 3-10 | 1/2/3 decks; empty-hand leader passes lead or draws from waste; flat or per-card penalty; 1/3/5 deals. |
| President | 3-10 | 1/2/3 decks; swap 2/1/no cards; revolution on/off; 1/3/5 rounds. |
| Spoons | 3-10 | 3/5/8-second card pass timer; 3 or 5 elimination letters. Timed play: bots or room-code only. |
| Yaniv | 2-8 | Call threshold 5 or 7; elimination at 100/200 points; exact 50/100/150 bonus off/on. |
| Cabo | 2-8 | 25/50/100-point end; card powers on/off. |
| 13-card Rummy | 2-6 | 3/5/10 deals; 101/201-point end; deck size changes automatically with table size (one deck for 2, two decks for 3-6). |

## Table modes

- **Vs Bots:** one local human and bots fill other seats; difficulty and speed selectors are shown where supported.
- **Pass & Play:** multiple people share one device and use a handover screen; unavailable for Spoons.
- **Room Code:** host opens a room, players join with a six-digit code, and bots fill vacant seats. Requires internet and the existing PeerJS/WebRTC connection. Share through phone share sheet or copy/paste.

This inventory reflects source configuration, not independent proof that every option combination has passed play testing. See `TEST_REPORT.md`.
