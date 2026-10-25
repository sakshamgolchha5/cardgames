# Status

> Historical development log. For the current UI, feature truth, and verification results, see `FEATURE_STATUS.md`, `RELEASE_STATUS.md`, and `TEST_REPORT.md`. Older checked items below refer to the development point when they were recorded.
## Phase 1 — Platform + Callbreak
- [x] Repo skeleton, TypeScript, Vitest, docs/PLAN.md
- [x] Card primitives, seeded RNG (src/engine/cards.ts)
- [x] Callbreak engine: deal, bidding 1-8, follow suit, must-beat, must-trump/overtrump, scoring, per-round scorecard history, per-seat view() hiding hands (and blind bids)
- [x] Variants: 3/5 rounds, Normal / Super 8 / Blind bid, must-beat toggle, redeal-if-no-spade toggle
- [x] Bots: easy (random legal), medium (heuristic bid/play), hard (card memory, master-card leads)
- [x] Tests: 15 passing incl. 800 seeded full games (card conservation, termination, scoring)
- [x] React + Vite app: table (avatars, names, fanned backs, all played cards visible), scrollable lobby with fixed Start, scorecard screen + saved past games
- [x] UI end-to-end tests: full matches through the real screens (bots and pass & play)
- [x] Bot pacing (Fast/Normal/Slow), generated avatars + random bot names, pass & play with hand-over screen
- [ ] Visual polish from real-phone screenshots (card sizes, spacing), sounds, deal animation
- [ ] Capacitor Android wrapper + GitHub Actions APK workflow (Phase 7)

## Phase 2 — Trick-taking family
- [x] Shared platform: game registry (GameDef), generic lobby options, generic game hook, generic scorecard (works for any game)
- [x] Hearts: 3-card passing (left/right/across/none), 2-of-clubs lead, no points on first trick, hearts-breaking, shoot the moon (others +26 or shooter -26), optional J-diamonds -10, optional Q-spades breaks hearts, game target 50/100/150, easy/medium/hard bots, 300 simulated games + full-match UI tests (bots and pass & play)
- [x] Court Piece: 2 teams, caller picks trump after 5 cards (or be-ranga: first void play sets trump), Single / Double / Double+Ace Sir collection, Court (13-0) bonus, target 5/7/11, 600 simulated games
- [x] Dehla Pakad / Mendikot: 4 trump modes (cut/Katte, hidden/Hide with ask-to-reveal, random, caller after 5), tens capture scoring, Mendikot + whitewash bonuses, 600 simulated games
- [ ] Dehla Pakad extras: 1-4 decks and 4-8 players (seen in a store listing), 5-player individual variant
- [x] 3-2-5: 30-card deck, 5/3/2 targets rotating with the dealer, trump caller, card pulling with give-back, optional 7-hearts/7-spades top trumps, two scoring styles, 600 simulated games
- [x] Confidence: 3-10 players, 1-3 decks (first round up to 8 cards, as many as the decks allow), hearts always trump, exact bidding, dealer bids last with the total-can't-equal-tricks rule (switchable), shrinking hands, compact many-player table layout, 360 simulated games
- [x] Phase 2 complete: Hearts, Court Piece, Dehla Pakad, 3-2-5, Confidence (Bridge removed by request)

## Room-code multiplayer (built early, ahead of Phase 5)
- [x] Host-authoritative rooms: host runs the engine and bots; each player receives only their own view; every action is validated by the engine (turn + legality); a bot takes over a seat when a player disconnects
- [x] 6-digit room code, host waiting screen, join screen, online game screen (clients wait for host to start next round)
- [x] Protocol tested for Callbreak, Hearts and Court Piece (host + 2 remote players + bot, full matches, no hand ever leaked) using an in-memory connection
- [ ] NOT yet verified: the real PeerJS public relay (cannot be reached from the build sandbox). First real-phone test needed; some mobile networks may block direct peer connections (a TURN relay would be the fix)
- [ ] Reconnect to the same seat after a drop; rematch from the game-over screen

## In-app tutorials
- [x] Illustrated step-by-step "How to play" for Callbreak, Hearts, Court Piece, Dehla Pakad and 3-2-5 (example hands and tables using the real card art), opened from every lobby and from the "?" button during a game. Every new game must ship with a tutorial (a test enforces it).

## Bugs found by tests (kept as regression tests)
- Multi-deck games: a hand can hold identical cards, so playing a card must remove ONE copy, not every match (Confidence). Every future multi-deck game (Dehla Pakad extras, Bluff, Rummy) must use the same rule.

## Phase 3 - shedding / matching games
- [x] Bluff: 2-10 players, 1-3 decks, round starter names the rank OR rank climbs A..K, any number of cards or one per turn, call / pass / go-out rules, face-down pile, event banner, 240 simulated games
- [x] Hearts now supports 3-8 players (lowest diamonds/clubs removed so hands are equal; pass size and directions fit the table)
- [x] Seven (Satte Pe Satta): 2-8 players, 7-hearts or 7-diamonds opens, rows grow one card up/down, must play if able (pass only when stuck), penalty by card values or card count, 1/3/5 deals, live four-row layout, 400 simulated games
- [x] Ghulam Chor: 2-10 players, 1-3 decks, one Jack removed, pairs thrown, blind draws with victim re-shuffle, safe players skipped, lone-Jack loser takes a point, 1/3/5 deals, 600 simulated games
- [x] Donkey (Bhabhi): 3-10 players, 1-3 decks, A-spades opens, a cut ends the trick and the highest led-suit card picks up the pile, waste pile, leader-out option (next player / draw from waste), penalty 1 point or per card held, 480 simulated games
- [x] President: 3-10 players, 1-3 decks, 2 high, sets must match in number and beat in rank, pass/clear/lead, unbeatable plays clear at once, optional revolution, first-out order -> President..Scum with points, card swap (2 / 1 / none; vice swaps 1), Scum leads, 300 simulated games
- [x] Spoons (real-time): 3-10 players, simultaneous passing with a countdown, grab race, S-P-O-O-N letters (5 or 3), bots react with human-like delays, idle humans auto-played, timers survive other players' moves, 160 simulated games + real-time room test. Not in Pass & Play (needs one screen per player).
- [x] Yaniv: 2-8 players, jokers (core card model now supports jokers), sets and runs with wild jokers (Ace low), deck or discard-end draws, Yaniv call at 7 or 5, Assaf (+30), elimination limit 100/200, optional exact-50 bonus, stalemate safety valve, round summary showing every hand, 160 simulated games

## Deploy / install
- [x] Installable web app foundation: icons, standalone manifest, offline service worker. The current manifest does not force orientation; fullscreen and landscape behavior depend on browser/OS support.
- [x] Fixed: opponents' card backs were drawn as wide strips (card width ignored the smaller card height). Cards are now sized from their own height everywhere; backs are fanned behind avatars.

## Bugs found by tests (kept as regression tests)
- Bluff bots decided from a private view where other hands are hidden, so "has this player gone out?" must use hand SIZES, not hands.
- UI must hide actions the engine would reject (Play after passing); the game now ignores illegal taps instead of crashing.

## Phone feedback round (from real-device screenshots)
- [x] Home screen rebuilt for short landscape phones: header row (name, Join with code, Past games) always visible, compact scrollable game grid. Old layout centred its content so the top was unreachable.
- [x] Tables with 6+ players: played cards go in a labelled row in the middle (no collisions); seats sit on an arc clear of the title bar.
- [x] Bluff: per-player action bubbles ("2 x Sevens", "Pass", "Bluff!") and a slower pace (2.2x) so you can follow who did what.
- [x] Confidence: always-visible line "Bids so far N, T tricks, <dealer> bids last (can't make it T)" and a "bids last" tag on the dealer.
- [ ] Still unverified by me: I cannot render the screen. Please send screenshots after redeploy.
- [ ] Next: Seven (Satte Pe Satta) - research done (start with 7 of hearts, must play if able, pass only when stuck, penalty = remaining pip values A=1 face=10), then Ghulam Chor, Donkey, President, Spoons, Yaniv.

## Layout verified in a real (headless) browser at phone size 780x360 landscape
- Found and fixed from screenshots: class-name collision (.sc) that stacked the middle row of cards vertically; seats overlapping each other at 9-10 players (now two rows); top player's cards covering the title (now compact name/score pills beside the avatar, like the reference app); prompt box covering seats; clipped raised cards; empty glyph for card-back icon; info/event banners moved into a second line of the top bar.
- Checked: Callbreak 4p, Hearts 8p, Confidence 8p and 10p, Bluff 4p and 10p (2 decks), Seven 4p. NOT yet re-checked on screen: Court Piece, Dehla Pakad, 3-2-5, the lobby, scorecard and tutorial pages.

## Second on-screen review
- Checked and fixed: home screen (stale coming-soon list), lobby (fine), tutorial (cards outside the felt, see-through panel), scorecard (see-through panel), 3-2-5 and Court Piece tables (fine), Ghulam Chor 4p and 10p (pick box covered seats, greyed hand, "You draws" grammar, duplicate card counts).
- Still not looked at on screen: Dehla Pakad, host/join room screens, past-games list, pass-and-play hand-over screen, game-over screen.

- Dehla Pakad table checked on screen (fine); badge now reads "Team A - 1 ten - 0".

- President screen checked at 4 and 8 players: last play shown beside its label, only playable cards are highlighted, Play/Pass bar clear of the table.

## Plan change (from the product owner)
- Teen Patti and Poker are REMOVED from the plan. 4-5 new games will be chosen later from the "Card Club" reference app. Shortlist (cheapest first, because they reuse existing parts): Spades, Euchre, Gin Rummy, Tonk, Rummy 500. Bigger: Cribbage, Pinochle, Canasta, Bid Whist.
- Remaining planned games: Yaniv, Cabo, 13-card Rummy, Blackjack (+ the 4-5 new ones).
- Process: a zip is delivered after every finished game; each message starts with a status line.
- Incident: the build workspace was reset once; work since the last zip was lost and rebuilt. Hence the zip-per-game rule.

## v14 - merged with the Codex UI/meta layer (this repo is now the main line)
- Base: Codex build (hub with Games/Rules/Collection/History/Settings/Friends, coins, themes, card backs, favourites, invites with accept/decline, recent players) + my newer pieces (Rummy with wild joker and solver, Cambrio rename, Oh Hell name).
- Landscape everywhere: the app is turned 90 degrees on an upright phone (menus too); fullscreen + orientation lock tried on first tap; manifest orientation = landscape. Sizes use --vh/--vw and @container queries (not viewport media queries).
- Table: one continuous green surface; the hand overlaps the table; prompts on crowded tables sit above the hand.
- History is a menu tab (same navigation as every other tab).
- Create-room: "Invite friends" popup (saved friends + last-10-match recent players, WhatsApp / Share / Copy link); opens automatically once when the room is ready if anyone is saved.
- 293 tests / 22 files pass. Not verified: real-phone fullscreen/lock behaviour, PeerJS across real networks, accounts/sync (needs a backend).
