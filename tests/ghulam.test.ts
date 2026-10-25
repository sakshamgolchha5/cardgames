import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as G from '../src/games/ghulam/engine';
import { chooseAction } from '../src/games/ghulam/bot';

const cfg = (players: number, decks = 1, rounds = 1): G.GhulamConfig => ({ players, decks, rounds });
const set = (s: G.State, hands: string[], turn = 0): G.State => { const h = hands.map(x => parseCards(x)); return { ...s, hands: h, handSizes: h.map(x => x.length), pairs: h.map(() => 0), acts: h.map(() => null), turn, victim: (turn + 1) % h.length }; };

describe('deck and deal', () => {
  it('one Jack is removed so exactly one Jack can never be paired', () => {
    expect(G.makeDeck(1).length).toBe(51); expect(G.makeDeck(1).filter(c => c.rank === 11).length).toBe(3); expect(G.makeDeck(2).length).toBe(103); expect(G.makeDeck(3).length).toBe(155);
  });
  it('throws pairs at the start: no hand keeps two cards of one rank, and nothing is lost', () => {
    for (const [n, d] of [[2, 1], [4, 1], [10, 1], [6, 2], [10, 3]]) {
      const s = G.create(cfg(n, d), 3), total = s.hands.flat().length + 2 * s.pairs.reduce((a, b) => a + b, 0);
      expect(total).toBe(G.makeDeck(d).length);
      for (const h of s.hands) { const ranks = h.map(c => c.rank); expect(new Set(ranks).size).toBe(ranks.length); }
    }
  });
  it('discardPairs keeps one card of an odd count', () => {
    const r = G.discardPairs(parseCards('7H 7S 7D KC KD 3H')); expect(r.pairs).toBe(2); expect(r.hand.map(c => c.rank).sort((a, b) => a - b)).toEqual([3, 7]);
  });
});
describe('drawing', () => {
  const base = G.create(cfg(3), 1);
  it('you draw from the next player; a matching card makes a pair, otherwise you keep it', () => {
    let s = set(base, ['5H 9C', '5S KD JD', '2H 2C 4D']);
    s = G.apply(s, 0, { type: 'draw', index: s.hands[1].findIndex(c => c.rank === 13) }); // takes KD: no match
    expect(s.hands[0].length).toBe(3); expect(s.hands[1].length).toBe(2); expect(s.acts[0]).toEqual({ k: 'draw', pair: null }); expect(s.turn).toBe(1);
    s = set(base, ['5H 9C', '5S KD JD', '2H 4D']);
    s = G.apply(s, 0, { type: 'draw', index: s.hands[1].findIndex(c => c.rank === 5) }); // takes 5S: pairs with 5H
    expect(s.hands[0].map(cardId)).toEqual(['C9']); expect(s.pairs[0]).toBe(1); expect(s.acts[0]).toEqual({ k: 'draw', pair: 5 });
  });
  it('rejects bad indices and out-of-turn draws; the victim is the next player with cards', () => {
    const s = set(base, ['5H', '', '2H 4D']); const t = { ...s, victim: 2 };
    expect(() => G.apply(t, 0, { type: 'draw', index: 5 })).toThrow(); expect(() => G.apply(t, 1, { type: 'draw', index: 0 })).toThrow();
    expect(G.legalActions(t, 0).length).toBe(2);
  });
  it('a player who runs out of cards is safe and skipped', () => {
    let s = set(base, ['5H', '5S', '9C 9D JD']); s = { ...s, turn: 0, victim: 1 };
    s = G.apply(s, 0, { type: 'draw', index: 0 }); // pairs the 5s: both players are now empty
    expect(s.hands[0].length).toBe(0); expect(s.hands[1].length).toBe(0); expect(s.phase).toBe('gameEnd'); expect(s.history[0].loser).toBe(2);
  });
  it('the last player with cards loses the deal and takes the point', () => {
    let s = set(base, ['JH', '9C 9D', '4H 4S']); s = { ...s, victim: 1 };
    s = G.apply(s, 0, { type: 'draw', index: 0 }); expect(s.hands[0].length).toBe(2); expect(s.phase).toBe('playing');
  });
  it('view hides other hands', () => { const v = G.view(G.create(cfg(4), 2), 1); expect(v.hands[0].length).toBe(0); expect(v.handSizes[0]).toBeGreaterThan(0); });
});
describe('simulation', () => {
  const run = (seed: number, c: G.GhulamConfig) => {
    const rng = makeRng(seed + 81), deckSize = G.makeDeck(c.decks).length; let s = G.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = G.nextRound(s); continue; }
      const seat = s.turn; s = G.apply(s, seat, chooseAction(G.view(s, seat), seat, 'hard', rng));
      if (++steps > 20000) throw new Error('did not terminate');
      if (s.hands.flat().length + 2 * s.pairs.reduce((a, b) => a + b, 0) !== deckSize) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const c of [cfg(4), cfg(2), cfg(10), cfg(3, 1, 3), cfg(6, 2, 2), cfg(10, 3)])
    it(`100 seeded games end with the lone Jack as the loser (${c.players} players, ${c.decks} decks, ${c.rounds} deals)`, () => {
      for (let seed = 1; seed <= 100; seed++) {
        const s = run(seed, c); expect(s.history.length).toBe(c.rounds);
        for (const r of s.history) { expect(r.points.reduce((a, b) => a + b, 0)).toBe(1); expect(r.points[r.loser]).toBe(1); }
        const last = s.history[s.history.length - 1]; expect(s.hands[last.loser].map(c2 => c2.rank)).toEqual([11]); // the thief holds exactly the unpaired Jack
      }
    });
});
