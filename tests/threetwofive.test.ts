import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards, Card } from '../src/engine/cards';
import * as T from '../src/games/threetwofive/engine';
import { chooseAction } from '../src/games/threetwofive/bot';
import type { Level } from '../src/games/types';

const c = (s: string): Card => parseCards(s)[0];
const tr = (...x: [number, string][]) => x.map(([seat, k]) => ({ seat, card: c(k) }));

describe('deck, deal and targets', () => {
  it('30 unique cards: 8 to Ace plus only the 7 of hearts and 7 of spades', () => {
    const d = T.deck30(); expect(d.length).toBe(30); expect(new Set(d.map(cardId)).size).toBe(30);
    expect(d.filter(x => x.rank === 7).map(cardId).sort()).toEqual(['H7', 'S7']);
  });
  it('deals 5 then 10 each; caller is left of dealer with target 5, then 3, dealer 2', () => {
    let s = T.create(T.defaultConfig, 3);
    expect(s.hands.map(h => h.length)).toEqual([5, 5, 5]); expect(s.turn).toBe(1); expect(s.targets).toEqual([2, 5, 3]);
    expect(() => T.apply(s, 0, { type: 'trump', suit: 0 })).toThrow();
    s = T.apply(s, 1, { type: 'trump', suit: 2 }); expect(s.phase).toBe('playing'); expect(s.hands.map(h => h.length)).toEqual([10, 10, 10]);
    expect(new Set(s.hands.flat().map(cardId)).size).toBe(30); expect(s.turn).toBe(1);
  });
  it('the next round rotates the dealer and the targets', () => { expect(T.targetsFor(1)).toEqual([3, 2, 5]); expect(T.targetsFor(2)).toEqual([5, 3, 2]); });
});
describe('trick rules', () => {
  it('follow suit, otherwise anything', () => {
    const s = { ...T.create(T.defaultConfig, 1), phase: 'playing' as const, turn: 1, trick: tr([0, '9H']), hands: [[], parseCards('KH 8S'), [] ] };
    expect(T.legalPlays(s as T.State, 1).map(cardId)).toEqual(['H13']);
  });
  it('trump beats the led suit; with sevensTop the 7 of hearts then the 7 of spades beat even trump aces', () => {
    expect(T.trickWinner(tr([0, '9H'], [1, '8S'], [2, 'AH']), 0, false).seat).toBe(1);
    expect(T.trickWinner(tr([0, 'AS'], [1, '7H'], [2, '7S']), 0, true).seat).toBe(1);
    expect(T.trickWinner(tr([0, 'AS'], [1, '7D'], [2, '7S']), 0, true).seat).toBe(2);
    expect(T.trickWinner(tr([0, 'AS'], [1, '7H'], [2, '7S']), 0, false).seat).toBe(0);
  });
});
describe('card pulling', () => {
  it('each extra trick pulls one card from someone who missed target', () => {
    expect(T.computePulls([2, 3, 5], [2, 3, 5], [5, 3, 2])).toEqual([]);
    expect(T.computePulls([4, 3, 3], [2, 3, 5], [3, 2, 5])).toEqual([{ puller: 0, victim: 2 }, { puller: 0, victim: 2 }]);
    expect(T.computePulls([4, 2, 4], [2, 3, 5], [5, 3, 2]).map(p => p.puller)).toEqual([0, 0]);
  });
  it('the puller takes a random card, then gives one back; hands return to 10', () => {
    let s = T.create(T.defaultConfig, 8);
    s = { ...s, history: [{ round: 1, trump: 0, targets: [5, 3, 2], won: [3, 3, 4], points: [], totals: [0, 0, 0], pulls: 0 }] };
    s = T.apply(s, s.turn, { type: 'trump', suit: 1 });
    expect(s.phase).toBe('exchange'); expect(s.pulls.length).toBe(2); const puller = s.turn; expect(s.hands[puller].length).toBe(11); expect(s.pulled).not.toBeNull();
    expect(T.view(s, (puller + 1) % 3).pulled).toBeNull();
    while (s.phase === 'exchange') s = T.apply(s, s.turn, { type: 'give', card: s.hands[s.turn][0] });
    expect(s.hands.map(h => h.length)).toEqual([10, 10, 10]); expect(new Set(s.hands.flat().map(cardId)).size).toBe(30); expect(s.phase).toBe('playing');
  });
});
describe('simulation', () => {
  const run = (seed: number, lv: Level[], cfg: T.TDPConfig) => {
    const rng = makeRng(seed + 31); let s = T.create(cfg, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = T.nextRound(s); continue; }
      const seat = s.turn; s = T.apply(s, seat, chooseAction(T.view(s, seat), seat, lv[seat], rng));
      if (++steps > 5000) throw new Error('did not terminate');
      if (s.phase === 'playing' && s.hands.flat().length + s.played.length !== 30) throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy', 'easy', 'easy'], ['medium', 'hard', 'easy'], ['hard', 'hard', 'hard']];
  for (const cfg of [{ rounds: 5, scoring: 'difference', sevensTop: false }, { rounds: 5, scoring: 'hands', sevensTop: true }, { rounds: 3, scoring: 'difference', sevensTop: true }] as T.TDPConfig[])
    it(`200 seeded games finish with valid scorecards (${cfg.scoring}, sevens ${cfg.sevensTop})`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const s = run(seed, lv[seed % 3], cfg); expect(s.history.length).toBe(cfg.rounds);
        for (const r of s.history) { expect(r.won.reduce((a, b) => a + b, 0)).toBe(10); expect(r.targets.reduce((a, b) => a + b, 0)).toBe(10); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
        if (cfg.scoring === 'difference') expect(s.totals.reduce((a, b) => a + b, 0)).toBe(0);
      }
    });
});
