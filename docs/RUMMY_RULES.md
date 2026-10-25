# 13-card Rummy: implementation notes

This is a playable first implementation of Indian-style 13-card Rummy. It is not presented as a definitive rules authority. Confirm the regional rule details with the publisher before release.

## Implemented

- 2-6 players; one 52-card deck plus two printed jokers for 2 players, two decks plus four printed jokers for 3-6 players.
- 13 cards per player, one face-up discard to start the waste pile, draw from stock or top discard, then discard one card.
- Declare by selecting the card to discard from a 14-card hand. The remaining 13 cards must partition into valid sets and same-suit sequences, with at least two sequences and at least one pure sequence.
- Jokers can substitute in sequences or sets. A pure sequence contains no joker. Ace is low only; Q-K-A and K-A-2 do not wrap.
- Winner scores zero. Each other player receives the sum of card points, capped at 80 per deal. Number cards score face value, J/Q/K/A score 10, and jokers score zero. Lowest cumulative total wins.
- Deals are configured to 3, 5, or 10. The game ends at the configured deal count or target score (101 or 201).
- At stock exhaustion, the top waste card stays in place and the other waste cards are shuffled into a new stock.

## Confirmation needed

Confirm whether a joker picked from the waste pile can be picked up only if immediately used; whether the first open card is available to the dealer; whether an invalid declaration is penalized or simply rejected; whether the cap is 80 or another value; ace sequencing and points; and whether points carry across deals exactly as implemented. The current implementation rejects an invalid declaration without penalty and does not implement a drop penalty or joker-specific discard restrictions.

## Quality limits

The bot is a simple local opponent, not a strong Rummy strategy. Online rooms send game state through the existing host-authoritative PeerJS transport, but security and reconnect behavior need their own release review. See `TEST_REPORT.md` for actual verification status.
