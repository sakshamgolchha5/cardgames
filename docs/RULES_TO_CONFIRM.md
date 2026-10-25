# Rules to confirm
## Callbreak (defaults chosen, all configurable)
- Bid range 1-8 (some apps allow up to 13).
- First lead: player left of the dealer; dealer rotates each round.
- Must beat the highest card of the led suit if able; if void, must play a spade, and overtrump if able. If a spade cannot beat a spade already played, any spade is allowed.
- Score: made bid = bid + 0.1 per extra trick; missed = minus bid.
- Optional redeal when a hand has no spade (off by default).

## Hearts (defaults chosen, all configurable)
- Pass 3 cards: left, right, across, then no pass (repeats). Passing can be turned off.
- Holder of the 2 of clubs leads the first trick; no hearts or Q of spades on the first trick unless the hand has nothing else.
- Hearts cannot be led until a heart has been played (Q of spades breaks hearts only if that option is on).
- Shooting the moon: all 13 hearts + Q of spades. Default: other players +26 (alternative: shooter -26). Optional Jack of diamonds = -10.
- Game ends when someone reaches the target and there is a single lowest score; otherwise another hand is played.

## Court Piece (defaults chosen, sources: Pagat, Wikipedia, store listings)
- Seats 1&3 vs 2&4 as partners. Caller = player after the dealer; gets 5 cards, names trump, then all are dealt up to 13. Caller leads.
- Single Sir: winner collects each trick. Double Sir: tricks pile up until one PLAYER wins two in a row, who collects the whole pile (any pile left at the end goes to the last trick's winner).
- Ace rule (Double Sir): two consecutive wins that are both won with Aces do not collect. Store listings word this rule differently - please confirm.
- Scoring: team with 7+ tricks wins the deal for 1 point; all 13 tricks = Court = 3 points. Game to 5/7/11 points. (Pagat also describes caller-vs-defender scoring 1/2/3/4 - not used.)
- Not built yet: Hidden Rung (face-down trump card), redeal when caller holds no court card.

## Dehla Pakad / Mendikot (sources: Pagat, catsatcards, store listings)
- Partners sit opposite. The player after the dealer leads (and is the one who sets the hidden card or names trump).
- Win a deal with 3 or 4 tens; if tens are 2-2, the side with 7+ tricks wins. Sources say there is no formal scoring: I use 1 point per deal, Mendikot (4 tens) 2 points, whitewash (13 tricks) 3 points, game to 3/5/7 points. Bonus can be switched off.
- Cut hukum: first void play sets trump, including for that trick. Hidden hukum: the leader sets a card aside (12-card hand until revealed); a void player may ask; the card returns to its owner, the asker must play a trump if able, and trump cards played earlier do not count. If never revealed, the card returns for the 13th trick and that deal has no trump. Pagat mentions a second hidden-trump version that I have not built.
- Not built: 1-4 decks / 4-8 players (seen in a store listing), the "two consecutive tricks" pile mechanic some Dehla Pakad apps use (that is the Double Sir idea already in Court Piece).

## 3-2-5 (sources: Pagat-style descriptions, store listings, rules sites; they differ)
- 30 cards (8-A plus 7 of hearts and 7 of spades), dealt 5 then 5 each. Targets: player left of dealer 5 and names trump, next 3, dealer 2; dealer rotates each round.
- Card pulling: for each trick over target last round you pull one random card from someone who missed, then give back any card. Done after the full deal, trump already named. Sources disagree on the exact timing and order.
- 7 of hearts / 7 of spades as permanent top trumps is OFF by default (some apps use it; standard descriptions do not).
- Scoring default: tricks - target per round, total over 3/5/10 rounds. Alternative: total tricks won.

## Confidence (rules supplied by the product owner; gaps filled by me)
- Hearts always trump; first round up to 8 cards each, one fewer each round to 1. 1 deck with 8 players starts at 6 cards; more decks / players up to 10 supported.
- Bidding starts left of the dealer, dealer last; the total of all bids may not equal the number of tricks (switchable). Bids can be 0.
- Score: exact = 10 x bid + 10; miss (too many OR too few) = -10 x bid. A missed bid of 0 costs 10 (my choice, so a 0 bid is not free).
- Follow suit if able, otherwise any card (no duty to trump). With several decks, identical cards tie and the first one played wins.

## Hearts with 3-8 players (sources differ; my choices)
- Removed cards: 3 players 2-diamonds; 5 players 2-diamonds, 2-clubs; 6 and 8 players 2D 2C 3D 3C; 7 players 2D 2C 3D. The lowest club left opens the first trick.
- Cards passed: 4 with 3 players, 3 with 4-5 players, 2 with 6-8 players. Directions: left, right, across (even tables only), then no pass.

## Bluff (sources agree on the core; variants differ)
- Only the NEXT player may call Bluff or pass (many rules let anyone call at any time - not built yet).
- Declare mode: the round starter names the rank; a player who passes cannot play again that round (they may still call). If everyone else passes in a row the pile is discarded and the last player starts. After a call, the winner of the call starts the next round.
- A player who plays their last cards wins only if the next player does not call them correctly.
- Scoring: 1 point per deal won, 1/3/5 deals.

## Seven / Satte Pe Satta (research notes, not built yet)
- Sources agree: holder of 7 of hearts starts (some use 7 of diamonds); a 7 starts its suit's row; cards extend a row by one up or down; you MUST play if you can and pass only when stuck. First out wins.
- Differ: scoring (count cards left vs pip values A=1, J/Q/K=10, optional A=15), pass penalty chips (Fan Tan), "8 before 6", draw-from-stock variants. Plan: must-play on, start card configurable, scoring by pips or card count.

## Seven (built; defaults chosen from sources that differ)
- 2-8 players, whole deck dealt (some hands one card longer). 7 of hearts opens (7 of diamonds optional); any other 7 may start its suit's row later. Ace is high only (no wrap).
- You must play if you can; you may pass only when nothing fits. First out wins the deal.
- Penalty points for the others: card values (A=1, 2-10 face, J/Q/K=10) or number of cards left. Lowest total after 1/3/5 deals wins. Not built: pass penalties (Fan Tan chips), "8 before 6", stock-draw variants.

## Ghulam Chor (built)
- One Jack of clubs removed (51 cards per deck); pairs are two cards of the same RANK (colour does not matter). Draw direction: from the next player who still has cards. A player with no cards is safe. The last player holding cards (the unpaired Jack) takes 1 point; lowest total wins. Sources differ on whether pairs must match colour and on draw direction.
- Bots draw at random on every level: the victim re-shuffles after each draw, so no strategy beats luck.

## Donkey / Bhabhi (built; sources differ)
- Ace of spades holder leads and must lead it. The first trick is always thrown away (everyone plays, even a cut) and the A-spades player leads again. After that a cut ends the trick immediately: the player with the highest card of the led suit picks up all cards in the trick; they lead next.
- If everyone follows, cards go to a face-down waste pile and the highest card leads. Several decks: equal cards tie, first played wins.
- A player whose cards are gone is safe. If the player who would lead is out: 'next player leads' (default) or 'draws a random waste card and leads it'. Some sources add trump or special two-player endings - not built.
- Penalty: 1 point to the last player holding cards (the Donkey), or one point per card they hold. If nobody is left holding cards, nobody is the Donkey. Lowest total wins.

## President / Scum (built; variants differ a lot between sources)
- Order 3 (low) ... A, 2 (high). Lead any set of equal ranks; followers must play the SAME number of higher cards or pass. A pass does not lock you out of later plays. When every other active player passes in a row the trick clears and the last player to play leads (if they went out, the next player). A play nothing can beat (a 2, or a 3 after a revolution) clears at once.
- Revolution (optional): four or more of a kind reverses the rank order until the next revolution. Not built: 'equal rank skips the next player', jokers, 8-stop, sequences.
- Round 1: player after the dealer leads. Later rounds: the Scum leads. Swap: Scum gives their best 2 cards (Vice Scum 1) to the President (Vice President), who give back any cards of their choice; with 3 players only President/Scum swap; swap size is an option.
- Points: n-1 for President down to 0 for Scum, added over 1/3/5 rounds; highest total wins.

## Spoons (built)
- 4-card hands. Each round-trip everyone passes one card to the left at the same time; the first player in the ring draws from the deck and the last discards (waste is reshuffled when the deck runs out). Four of a kind lets you grab a spoon; others may grab only after the first grab (a grab with no four and no earlier grab is rejected). One spoon fewer than players; the player left without one gets the next letter of S-P-O-O-N (5) or S-P-O (3). Out at the last letter; last player standing wins.
- Time to pass a card: 8 / 5 / 3 seconds, then a card is chosen for you. A human who never taps GRAB is auto-grabbed after twice that time so the game cannot freeze.
- Not built: false-grab penalties, spoons-on-the-table positions, "sit-out" rules. Pass & Play is disabled (one screen per player is needed); use Room Code.

## Yaniv (built)
- 5 cards each (2 decks / 108 cards with 6+ players). Discard first, then draw: either the deck or the FIRST or LAST card of the previous player's discard. Legal discards: one card, a set (2+ of one rank), or a run (3+ of one suit; Ace low only, no wrap). Jokers (value 0) are wild in sets and runs.
- Yaniv: only at the start of your turn with a hand of 7 or less (option 5). Equal or lower hand elsewhere = Assaf: caller +30, the lowest other player 0, everyone else adds their hand. Otherwise caller 0, others add their hands.
- Out when a total passes the limit (200 default, 100 option). Option: landing exactly on 50/100/150 drops you by 50.
- Not built: slam-downs, "chess timer" and survival modes, power-ups seen in a store listing.
- Safety valve: after 40 turns per player with no call, the lowest hand wins the round with no penalty (never seen in normal play; prevents bots from looping forever).
