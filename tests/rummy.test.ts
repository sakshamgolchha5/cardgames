import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as R from '../src/games/rummy/engine';
import { chooseAction } from '../src/games/rummy/bot';
import type { Level } from '../src/games/types';

const cfg = (players: number, extra: Partial<R.RummyConfig> = {}): R.RummyConfig => ({ ...R.defaultConfig, players, ...extra });
const mk = (hands: string[], extra: Partial<R.State> = {}): R.State => {
  const s = R.create(cfg(hands.length, { rounds: 3 }), 1), h = hands.map(x => parseCards(x));
  return { ...s, hands: h, handSizes: h.map(x => x.length), stock: parseCards('2C 3C 4C 5C 6C 7C 8C 9C 10C 2D 3D'), open: parseCards('KD'), wild: 1, step: 'draw', turn: 0, moves: h.map(() => 0), ...extra };
};
const WIN = '4H 5H 6H 7S 8S 9S JK 10D JD 5C 5D 5S 2C';   // 13 cards: pure 4-5-6H, 7-8-9S, 10-J-JK D, set of 5s; with 2C extra it is a 14-card show-ready hand? (see tests)
describe('deal', () => {
  it('13 cards each from 2 decks with jokers; a normal card sets the wild rank; one card starts the open pile', () => {
    const s = R.create(cfg(4), 3); expect(s.hands.every(h => h.length === 13)).toBe(true); expect(s.open.length).toBe(1); expect(s.wildCard!.suit).not.toBe(4); expect(s.wild).toBe(s.wildCard!.rank);
    expect(s.hands.flat().length + s.stock.length + s.open.length).toBe(108); expect(R.create(cfg(8), 3).hands.flat().length + R.create(cfg(8), 3).stock.length + 1).toBe(162);
  });
});
describe('a turn', () => {
  it('draw from the stock or the open pile, then throw; only the top of the open pile is visible to others', () => {
    let s = mk(['4H 5H 6H 7S 8S 9S JK 10D JD 5C 5D 5S 2C', 'AS AH 3D 4D 6C 7C 9D 9H KC KS 2S 3S 8H']);
    expect(R.check(s, 0, { type: 'throw', card: parseCards('2C')[0] })).not.toBeNull();   // draw first
    s = R.apply(s, 0, { type: 'open' }); expect(s.hands[0].length).toBe(14); expect(s.hands[0].map(cardId)).toContain('D13'); expect(s.open.length).toBe(0);
    s = R.apply(s, 0, { type: 'throw', card: parseCards('2C')[0] }); expect(s.turn).toBe(1); expect(s.step).toBe('draw'); expect(R.view(s, 1).open.map(cardId)).toEqual(['C2']);
    expect(() => R.apply(s, 0, { type: 'stock' })).toThrow();
  });
  it('the stock is refilled from the open pile when it runs out', () => {
    let s = mk(['4H 5H 6H 7S 8S 9S JK 10D JD 5C 5D 5S 2C', 'AS AH 3D 4D 6C 7C 9D 9H KC KS 2S 3S 8H'], { stock: [], open: parseCards('KD QD JD 2H') }); s = R.apply(s, 0, { type: 'stock' });
    expect(s.hands[0].length).toBe(14); expect(s.open.length).toBe(1); expect(s.stock.length).toBe(2);
  });
});
describe('showing and points', () => {
  const full = 'AH 2H 3H 7D 7C 7S 4S 5S 6S 9D 9C 9H KD 2C'.split(' ');
  it('a valid show wins the deal with 0; others pay their leftover points (max 80); a hand with no pure sequence pays everything', () => {
    let s = mk(['AH 2H 3H 4S 5S 6S 7D 7C 7S 9D 9C 9H 9S', 'KH QD 5C 9S 8H 3D 2C 2S 7H 6D 4C KC JD', '4H 5H 6H KD KC KS 9S 8H 3D 2C 7D 6D JD']);
    s = { ...s, step: 'discard', hands: [parseCards('AH 2H 3H 4S 5S 6S 7D 7C 7S 9D 9C 9H 9S KD'), s.hands[1], s.hands[2]] };
    expect(R.canShowWith(s, 0, parseCards('KD')[0])).toBe(true); expect(R.canShowWith(s, 0, parseCards('9S')[0])).toBe(false);
    s = R.apply(s, 0, { type: 'show', card: parseCards('KD')[0] });
    expect(s.phase).toBe('roundEnd'); expect(s.winner).toBe(0); expect(s.history[0].points[0]).toBe(0); expect(s.history[0].points[1]).toBe(80); expect(s.history[0].points[2]).toBe(9 + 8 + 3 + 2 + 7 + 6 + 10);
  });
  it('a wrong show costs 80 and you are out of the deal; the others carry on', () => {
    let s = mk(['4H 6H 9S 2D 7C KD QS AS 3C 8D 5H JC 10S', 'AS AH 3D 4D 6C 7C 9D 9H KC KS 2S 3S 8H', '2C 3C 4C 5C 6C 7C 8C 9C 10C 2D 3D 4D 5D']); s = { ...s, step: 'discard' };
    s = R.apply(s, 0, { type: 'show', card: parseCards('10S')[0] }); expect(s.phase).toBe('playing'); expect(s.active).toEqual([false, true, true]); expect(s.dealPoints[0]).toBe(80); expect(s.turn).toBe(1); expect(s.hands[0].length).toBe(0);
  });
  it('dropping: 20 points before your first turn, 40 after; the last player left wins', () => {
    let s = mk(['4H 6H 9S 2D 7C KD QS AS 3C 8D 5H JC 10S', 'AS AH 3D 4D 6C 7C 9D 9H KC KS 2S 3S 8H', '2C 3C 4C 5C 6C 7C 8C 9C 10C 2D 3D 4D 5D']);
    s = R.apply(s, 0, { type: 'drop' }); expect(s.dealPoints[0]).toBe(20); s = { ...s, moves: [0, 3, 0] }; s = R.apply(s, 1, { type: 'drop' }); expect(s.dealPoints[1]).toBe(40);
    expect(s.phase).toBe('roundEnd'); expect(s.winner).toBe(2); expect(s.history[0].points).toEqual([20, 40, 0]);
    expect(() => R.apply({ ...mk(['4H', '5H'], {}), config: cfg(2, { drop: false }) }, 0, { type: 'drop' })).toThrow();
  });
});
describe('simulation', () => {
  const run = (seed: number, c: R.RummyConfig) => {
    const rng = makeRng(seed + 141), lv = ['hard', 'medium', 'easy'] as Level[]; let s = R.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = R.nextRound(s); continue; }
      const seat = s.turn; s = R.apply(s, seat, chooseAction(R.view(s, seat), seat, lv[seat % 3], rng)); if (++steps > 4000) throw new Error('did not terminate');
    }
    return s;
  };
  for (const c of [cfg(2, { rounds: 1 }), cfg(3, { rounds: 2 })]) it(`6 seeded games finish with valid scorecards (${c.players} players, ${c.rounds} deals)`, () => { for (let seed = 1; seed <= 6; seed++) { const s = run(seed, c); expect(s.history.length).toBe(c.rounds); for (const r of s.history) { expect(r.points[r.winner!]).toBe(0); expect(Math.max(...r.points)).toBeLessThanOrEqual(80); } } }, 120000);
});
