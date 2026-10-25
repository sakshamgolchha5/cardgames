import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards, Card } from '../src/engine/cards';
import * as F from '../src/games/confidence/engine';
import { chooseAction } from '../src/games/confidence/bot';
import type { Level } from '../src/games/types';

const tr = (...x: [number, string][]) => x.map(([seat, k]) => ({ seat, card: parseCards(k)[0] as Card }));
const cfg = (players: number, decks: number, lastBidRule = true): F.ConfConfig => ({ players, decks, lastBidRule });

describe('deal and round sizes', () => {
  it('starts with up to 8 cards, limited by the decks, and shrinks to 1', () => {
    expect(F.startSize(cfg(8, 2))).toBe(8); expect(F.startSize(cfg(8, 1))).toBe(6); expect(F.startSize(cfg(10, 2))).toBe(8); expect(F.startSize(cfg(10, 1))).toBe(5); expect(F.startSize(cfg(3, 1))).toBe(8);
    let s = F.create(cfg(8, 2), 1); expect(s.sz).toBe(8); expect(s.hands.every(h => h.length === 8)).toBe(true);
    for (const [players, decks] of [[8, 2], [10, 2], [10, 3], [6, 1]]) { const t = F.create(cfg(players, decks), 2); expect(t.hands.flat().length).toBe(players * t.sz); expect(t.hands.length).toBe(players); }
    s = { ...s, phase: 'roundEnd' }; expect(F.nextRound(s).sz).toBe(7); expect(F.nextRound(s).dealer).toBe(1);
  });
  it('two decks hold every card twice; hands never exceed the deck', () => {
    const s = F.create(cfg(10, 2), 5); const all = s.hands.flat().map(cardId); expect(all.length).toBe(80);
    for (const k of new Set(all)) expect(all.filter(x => x === k).length).toBeLessThanOrEqual(2);
  });
});
describe('bidding', () => {
  it('bidding starts left of the dealer; the dealer bids last and cannot make the total equal the tricks', () => {
    let s = F.create(cfg(4, 1), 3); expect(s.turn).toBe(1);
    for (const n of [2, 3, 1]) s = F.apply(s, s.turn, { type: 'bid', n });
    expect(s.turn).toBe(0); const bad = s.sz - 6;
    expect(F.legalActions(s, 0).some(a => a.type === 'bid' && a.n === bad)).toBe(false); expect(() => F.apply(s, 0, { type: 'bid', n: bad })).toThrow();
    expect(F.legalActions(s, 0).length).toBe(s.sz + 1 - (bad >= 0 && bad <= s.sz ? 1 : 0));
    s = F.apply(s, 0, { type: 'bid', n: bad === 0 ? 1 : 0 }); expect(s.phase).toBe('playing'); expect(s.turn).toBe(1);
  });
  it('the restriction can be switched off', () => {
    let s = F.create(cfg(3, 1, false), 3); const bids = [0, 0]; for (const n of bids) s = F.apply(s, s.turn, { type: 'bid', n });
    expect(F.legalActions(s, s.turn).length).toBe(s.sz + 1);
  });
});
describe('tricks and scoring', () => {
  it('a heart beats any other suit, the highest heart wins, and an equal duplicate loses to the first played', () => {
    expect(F.trickWinner(tr([0, 'AS'], [1, '2H'], [2, 'KS'])).seat).toBe(1);
    expect(F.trickWinner(tr([0, '9H'], [1, 'QH'], [2, 'QH'], [3, 'AS'])).seat).toBe(1);
    expect(F.trickWinner(tr([0, '9D'], [1, 'KD'], [2, 'AC'])).seat).toBe(1);
  });
  it('exact bid = 10 per trick + 10, a miss loses 10 per bid trick (min 10)', () => {
    expect(F.scoreOf(4, 4)).toBe(50); expect(F.scoreOf(4, 3)).toBe(-40); expect(F.scoreOf(4, 5)).toBe(-40); expect(F.scoreOf(0, 0)).toBe(10); expect(F.scoreOf(0, 2)).toBe(-10);
  });
  it('view hides other hands', () => { const v = F.view(F.create(cfg(6, 2), 4), 2); expect(v.hands[2].length).toBeGreaterThan(0); expect(v.hands[3].length).toBe(0); });
});
describe('simulation', () => {
  const run = (seed: number, lv: Level[], c: F.ConfConfig) => {
    const rng = makeRng(seed + 41); let s = F.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = F.nextRound(s); continue; }
      const seat = s.turn; s = F.apply(s, seat, chooseAction(F.view(s, seat), seat, lv[seat % lv.length], rng));
      if (++steps > 20000) throw new Error('did not terminate');
      if (s.phase === 'playing' && s.hands.flat().length + s.played.length !== c.players * s.sz) throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy'], ['medium', 'hard', 'easy'], ['hard']];
  for (const c of [cfg(8, 2), cfg(10, 2), cfg(10, 3), cfg(6, 1), cfg(3, 1), cfg(5, 2, false)])
    it(`60 seeded games finish with valid scorecards (${c.players} players, ${c.decks} decks, last-bid rule ${c.lastBidRule})`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const s = run(seed, lv[seed % 3], c); expect(s.history.length).toBe(F.roundCount(c));
        for (const r of s.history) {
          expect(r.won.reduce((a, b) => a + b, 0)).toBe(r.size); expect(r.points).toEqual(r.bids.map((b, i) => F.scoreOf(b, r.won[i])));
          if (c.lastBidRule) expect(r.bids.reduce((a, b) => a + b, 0)).not.toBe(r.size);
        }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
      }
    });
});

describe('duplicate cards (several decks)', () => {
  it('playing one of two identical cards leaves the other in hand', () => {
    let s = F.create(cfg(4, 2), 1); s = { ...s, phase: 'playing', turn: 0, leader: 0, bids: [1, 1, 1, 1], hands: [parseCards('KS KS 2D'), parseCards('3S'), parseCards('4S'), parseCards('5S')] };
    s = F.apply(s, 0, { type: 'play', card: parseCards('KS')[0] }); expect(s.hands[0].map(cardId)).toEqual(['S13', 'D2']);
  });
});
