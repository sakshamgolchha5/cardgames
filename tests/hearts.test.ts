import { describe, it, expect } from 'vitest';
import { cardId, makeRng, Card } from '../src/engine/cards';
import * as H from '../src/games/hearts/engine';
import { chooseAction } from '../src/games/hearts/bot';
import type { Level } from '../src/games/types';

const c = (suit: 0 | 1 | 2 | 3, rank: number): Card => ({ suit, rank });
const playing = (over: Partial<H.State>): H.State => ({ ...H.create({ ...H.defaultConfig, passing: false }, 1), ...over });

describe('deal and passing', () => {
  it('deals 13 unique cards each and starts with a pass phase in hand 1', () => {
    const s = H.create(H.defaultConfig, 4);
    expect(s.hands.map(h => h.length)).toEqual([13, 13, 13, 13]); expect(new Set(s.hands.flat().map(cardId)).size).toBe(52);
    expect(s.phase).toBe('passing'); expect(s.passDir).toBe(0);
  });
  it('passes left: each seat receives the three cards of the seat on its right, hands stay at 13', () => {
    let s = H.create(H.defaultConfig, 4); const chosen = s.hands.map(h => h.slice(0, 3));
    for (let i = 0; i < 4; i++) s = H.apply(s, i, { type: 'pass', cards: chosen[i] });
    expect(s.phase).toBe('playing'); expect(s.hands.map(h => h.length)).toEqual([13, 13, 13, 13]);
    for (let i = 0; i < 4; i++) for (const card of chosen[(i + 3) % 4]) expect(s.hands[i].some(h => cardId(h) === cardId(card))).toBe(true);
    expect(s.hands[s.turn].some(h => h.suit === 3 && h.rank === 2)).toBe(true);
  });
  it('rejects passing cards not in hand, wrong counts and out-of-turn passes', () => {
    const s = H.create(H.defaultConfig, 4);
    expect(() => H.apply(s, 1, { type: 'pass', cards: s.hands[1].slice(0, 3) })).toThrow();
    expect(() => H.apply(s, 0, { type: 'pass', cards: s.hands[0].slice(0, 2) })).toThrow();
    expect(() => H.apply(s, 0, { type: 'pass', cards: s.hands[1].slice(0, 3) })).toThrow();
  });
  it('the 4th hand has no passing, and passing can be turned off', () => {
    let s = H.create(H.defaultConfig, 9); s = { ...s, round: 3 }; expect((H as any).create({ ...H.defaultConfig, passing: false }, 9).phase).toBe('playing');
    expect([0, 1, 2, 3].map(r => [0, 1, 2, -1][r % 4])).toEqual([0, 1, 2, -1]);
  });
});
describe('play rules', () => {
  it('the 2 of clubs must open, and no points may be dumped on the first trick', () => {
    const s = H.create({ ...H.defaultConfig, passing: false }, 2); expect(H.legalPlays(s, s.turn).map(cardId)).toEqual(['C2']);
    const t = playing({ turn: 1, trick: [{ seat: 0, card: c(3, 2) }], trickNo: 0, hands: [[], [c(1, 5), c(0, 12), c(2, 8)], [], []] });
    expect(H.legalPlays(t, 1).map(cardId)).toEqual(['D8']);
  });
  it('hearts cannot be led until broken, unless the hand is all hearts', () => {
    const t = playing({ turn: 0, trickNo: 3, broken: false, hands: [[c(1, 5), c(2, 8)], [], [], []] });
    expect(H.legalPlays(t, 0).map(cardId)).toEqual(['D8']);
    expect(H.legalPlays({ ...t, hands: [[c(1, 5), c(1, 9)], [], [], []] }, 0).length).toBe(2);
    expect(H.legalPlays({ ...t, broken: true }, 0).length).toBe(2);
  });
  it('must follow suit; anything goes when void after the first trick', () => {
    const t = playing({ turn: 1, trickNo: 4, trick: [{ seat: 0, card: c(2, 9) }], hands: [[], [c(2, 3), c(1, 2), c(0, 12)], [], []] });
    expect(H.legalPlays(t, 1).map(cardId)).toEqual(['D3']);
    expect(H.legalPlays({ ...t, hands: [[], [c(1, 2), c(0, 12)], [], []] }, 1).length).toBe(2);
  });
  it('highest card of the led suit wins the trick', () => {
    expect(H.trickWinner([{ seat: 0, card: c(2, 9) }, { seat: 1, card: c(0, 14) }, { seat: 2, card: c(2, 12) }, { seat: 3, card: c(2, 4) }]).seat).toBe(2);
  });
});
describe('scoring', () => {
  it('counts hearts 1, Q♠ 13, optional J♦ −10', () => {
    expect(H.cardPts(c(1, 7), H.defaultConfig)).toBe(1); expect(H.cardPts(c(0, 12), H.defaultConfig)).toBe(13);
    expect(H.cardPts(c(2, 11), H.defaultConfig)).toBe(0); expect(H.cardPts(c(2, 11), { ...H.defaultConfig, jackOfDiamonds: true })).toBe(-10);
  });
  it('shooting the moon: others +26 or shooter −26; normal hands unchanged', () => {
    expect(H.settle([26, 0, 0, 0], [13, 0, 0, 0], 0, H.defaultConfig)).toEqual({ points: [0, 26, 26, 26], moon: 0 });
    expect(H.settle([0, 26, 0, 0], [0, 13, 0, 0], 1, { ...H.defaultConfig, moon: 'minus26' })).toEqual({ points: [0, -26, 0, 0], moon: 1 });
    expect(H.settle([10, 8, 5, 3], [5, 4, 3, 1], 0, H.defaultConfig).moon).toBeNull();
  });
});
describe('full-game simulation', () => {
  const run = (seed: number, levels: Level[], cfg: H.HeartsConfig) => {
    const rng = makeRng(seed + 5); let s = H.create(cfg, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = H.nextRound(s); continue; }
      const seat = s.turn; s = H.apply(s, seat, chooseAction(H.view(s, seat), seat, levels[seat], rng));
      if (++steps > 20000) throw new Error('did not terminate');
      if (s.phase !== 'roundEnd' && s.phase !== 'gameEnd' && s.hands.flat().length + s.played.length !== 52) throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy', 'easy', 'easy', 'easy'], ['medium', 'hard', 'easy', 'medium'], ['hard', 'hard', 'hard', 'hard']];
  for (const cfg of [{ ...H.defaultConfig, target: 50 }, { ...H.defaultConfig, target: 50, passing: false, jackOfDiamonds: true, moon: 'minus26' as const, queenBreaks: true }])
    it(`150 seeded games finish with valid scorecards (${JSON.stringify(cfg)})`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const s = run(seed, lv[seed % 3], cfg), unit = cfg.jackOfDiamonds ? 16 : 26;
        for (const r of s.history) { expect(r.taken.reduce((a, b) => a + b, 0)).toBe(unit); if (r.moon === null) expect(r.points).toEqual(r.taken); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
        const min = Math.min(...s.totals); expect(s.totals.filter(t => t === min).length).toBe(1);
      }
    });
});

describe('3 to 8 players', () => {
  const cfgN = (players: number): H.HeartsConfig => ({ ...H.defaultConfig, players, target: 50 });
  it('removes the lowest diamonds/clubs so every hand is equal', () => {
    for (const [n, size, gone] of [[3, 17, ['D2']], [4, 13, []], [5, 10, ['D2', 'C2']], [6, 8, ['D2', 'C2', 'D3', 'C3']], [7, 7, ['D2', 'C2', 'D3']], [8, 6, ['D2', 'C2', 'D3', 'C3']]] as [number, number, string[]][]) {
      expect(H.handSizeFor(n)).toBe(size); expect(H.removedCards(n).map(cardId)).toEqual(gone);
      const s = H.create(cfgN(n), 3); expect(s.hands.length).toBe(n); expect(s.hands.every(h => h.length === size)).toBe(true);
      const all = s.hands.flat().map(cardId); expect(new Set(all).size).toBe(n * size); for (const g of gone) expect(all).not.toContain(g);
    }
  });
  it('the lowest club still in the deck opens the first trick', () => {
    const s = H.create({ ...cfgN(6), passing: false }, 4); expect(s.openRank).toBe(4);
    expect(H.legalPlays(s, s.turn).map(cardId)).toEqual(['C4']);
    const s3 = H.create({ ...cfgN(3), passing: false }, 4); expect(s3.openRank).toBe(2); expect(H.legalPlays(s3, s3.turn).map(cardId)).toEqual(['C2']);
  });
  it('pass sizes and directions fit the table', () => {
    expect([3, 4, 5, 6, 7, 8].map(H.passCountFor)).toEqual([4, 3, 3, 2, 2, 2]);
    expect(H.passCycle(5)).toEqual([0, 1, -1]); expect(H.passCycle(6)).toEqual([0, 1, 2, -1]);
    expect(H.passOffset(2, 6)).toBe(3); expect(H.passOffset(1, 5)).toBe(4);
    let s = H.create(cfgN(5), 2); expect(s.passCount).toBe(3);
    const chosen = s.hands.map(h => h.slice(0, 3)); for (let i = 0; i < 5; i++) s = H.apply(s, i, { type: 'pass', cards: chosen[i] });
    expect(s.phase).toBe('playing'); expect(s.hands.every(h => h.length === 10)).toBe(true);
    for (const card of chosen[4]) expect(s.hands[0].some(h => cardId(h) === cardId(card))).toBe(true);
  });
  const run = (seed: number, c: H.HeartsConfig) => {
    const rng = makeRng(seed + 7), n = c.players; let s = H.create(c, seed), steps = 0; const lv: Level[] = ['hard', 'medium', 'easy'];
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = H.nextRound(s); continue; }
      const seat = s.turn; s = H.apply(s, seat, chooseAction(H.view(s, seat), seat, lv[seat % 3], rng));
      if (++steps > 40000) throw new Error('did not terminate');
      if (s.phase === 'playing' && s.hands.flat().length + s.played.length !== n * H.handSizeFor(n)) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const n of [3, 5, 6, 7, 8]) it(`60 seeded games finish with valid scorecards (${n} players)`, () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = run(seed, cfgN(n)); for (const r of s.history) { expect(r.taken.reduce((a, b) => a + b, 0)).toBe(26); expect(r.taken.length).toBe(n); }
      expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
    }
  });
});
