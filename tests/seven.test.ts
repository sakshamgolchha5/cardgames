import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as S from '../src/games/seven/engine';
import { chooseAction } from '../src/games/seven/bot';
import type { Level } from '../src/games/types';

const cfg = (players: number, extra: Partial<S.SevenConfig> = {}): S.SevenConfig => ({ ...S.defaultConfig, players, rounds: 1, ...extra });
const set = (s: S.State, hands: string[], rows: S.State['rows'] = [null, null, null, null], turn = 0): S.State => { const h = hands.map(x => parseCards(x)); return { ...s, hands: h, handSizes: h.map(x => x.length), rows, turn }; };

describe('deal and opening', () => {
  it('deals all 52 cards (some hands one longer) and the holder of 7♥ starts', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      const s = S.create(cfg(n), 3), sizes = s.hands.map(h => h.length);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(52); expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1); expect(new Set(s.hands.flat().map(cardId)).size).toBe(52);
      expect(s.hands[s.turn].map(cardId)).toContain('H7'); expect(S.legalPlays(s, s.turn).map(cardId)).toEqual(['H7']);
    }
    const d = S.create(cfg(4, { start: 'diamonds' }), 3); expect(S.legalPlays(d, d.turn).map(cardId)).toEqual(['D7']);
  });
});
describe('legal plays', () => {
  const base = S.create(cfg(3), 1);
  it('a row grows one card up or down; other 7s start new rows; anything else is illegal', () => {
    const s = set(base, ['8H 6H 7S 9H 5H KD'], [{ low: 7, high: 7 }, null, null, null].map((r, i) => (i === 1 ? { low: 7, high: 7 } : null)) as S.State['rows']);
    expect(S.legalPlays(s, 0).map(cardId).sort()).toEqual(['H6', 'H8', 'S7'].sort());
  });
  it('rows extend from their current ends', () => {
    let s = set(base, ['8H 9H 5H 6H', 'KD'], [null, { low: 7, high: 7 }, null, null]);
    s = S.apply(s, 0, { type: 'play', card: parseCards('8H')[0] }); expect(s.rows[1]).toEqual({ low: 7, high: 8 });
    s = { ...s, turn: 0 }; expect(S.legalPlays(s, 0).map(cardId).sort()).toEqual(['H6', 'H9']);
    s = S.apply(s, 0, { type: 'play', card: parseCards('6H')[0] }); expect(s.rows[1]).toEqual({ low: 6, high: 8 });
  });
  it('you must play when you can, and may pass only when stuck', () => {
    let s = set(base, ['8H KD', '2C 3C'], [null, { low: 7, high: 7 }, null, null]);
    expect(S.legalActions(s, 0).every(a => a.type === 'play')).toBe(true); expect(() => S.apply(s, 0, { type: 'skip' })).toThrow();
    s = { ...s, turn: 1 }; expect(S.legalActions(s, 1)).toEqual([{ type: 'skip' }]); expect(S.apply(s, 1, { type: 'skip' }).turn).toBe(2); expect(() => S.apply(s, 1, { type: 'play', card: parseCards('2C')[0] })).toThrow();
  });
  it('nothing but the opening 7 is legal until it is played', () => {
    const s = set(base, ['7H 8H'], [null, null, null, null]); expect(S.legalPlays(s, 0).map(cardId)).toEqual(['H7']);
  });
});
describe('going out and scoring', () => {
  const nearly = () => set(S.create(cfg(3), 1), ['8H', 'KD QD 3C', 'AS 5S'], [null, { low: 7, high: 7 }, null, null]);
  it('the first player out wins; penalties use card values or card counts', () => {
    const s = S.apply(nearly(), 0, { type: 'play', card: parseCards('8H')[0] });
    expect(s.phase).toBe('gameEnd'); expect(s.history[0].winner).toBe(0); expect(s.history[0].points).toEqual([0, 23, 6]); expect(s.totals).toEqual([0, 23, 6]); expect(S.winners(s)).toEqual([0]);
    const c = S.apply({ ...nearly(), config: cfg(3, { scoring: 'count' }) }, 0, { type: 'play', card: parseCards('8H')[0] }); expect(c.history[0].points).toEqual([0, 3, 2]);
  });
  it('view hides other hands', () => { const v = S.view(S.create(cfg(4), 2), 1); expect(v.hands[1].length).toBeGreaterThan(0); expect(v.hands[0].length).toBe(0); });
});
describe('simulation', () => {
  const run = (seed: number, c: S.SevenConfig) => {
    const rng = makeRng(seed + 71), lv: Level[] = ['hard', 'medium', 'easy']; let s = S.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = S.nextRound(s); continue; }
      const seat = s.turn; s = S.apply(s, seat, chooseAction(S.view(s, seat), seat, lv[seat % 3], rng));
      if (++steps > 5000) throw new Error('did not terminate');
      const placed = s.rows.reduce((a, r) => a + (r ? r.high - r.low + 1 : 0), 0); if (s.hands.flat().length + placed !== 52) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const c of [cfg(4), cfg(2), cfg(8), cfg(5, { start: 'diamonds', rounds: 3 }), cfg(3, { scoring: 'count', rounds: 2 })])
    it(`80 seeded games finish (${c.players} players, ${c.start}, ${c.scoring}, ${c.rounds} deals)`, () => {
      for (let seed = 1; seed <= 80; seed++) { const s = run(seed, c); expect(s.history.length).toBe(c.rounds); for (const r of s.history) expect(r.points[r.winner]).toBe(0); expect(s.totals).toEqual(s.history[s.history.length - 1].totals); }
    });
});
