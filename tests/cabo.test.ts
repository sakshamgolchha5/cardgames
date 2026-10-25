import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as C from '../src/games/cabo/engine';
import { chooseAction } from '../src/games/cabo/bot';
import type { Level } from '../src/games/types';

const cfg = (players: number, extra: Partial<C.CaboConfig> = {}): C.CaboConfig => ({ ...C.defaultConfig, players, ...extra });
/** a game with chosen grids; every player starts knowing cards 3 and 4 (their bottom row) */
const mk = (grids: string[], deck = '4C 5C 6C 7C 8C 9C 10C', extra: Partial<C.State> = {}): C.State => {
  const s = C.create(cfg(grids.length, extra.config as any), 1), g = grids.map(x => parseCards(x));
  const kn = g.map((_, v) => g.map((o, oi) => [0, 1, 2, 3].map(k => (v === oi && k >= 2 ? o[k] : null))));
  return { ...s, grid: g, kn, know: [], deck: parseCards(deck), discard: [], step: 'start', drawn: null, power: null, peek: null, caller: null, finalLeft: 0, turn: 0, ...extra };
};

describe('values and deal', () => {
  it('red King is 0, black King 13, Ace 1, Queen 12', () => { expect(C.value(parseCards('KH')[0])).toBe(0); expect(C.value(parseCards('KD')[0])).toBe(0); expect(C.value(parseCards('KS')[0])).toBe(13); expect(C.value(parseCards('AC')[0])).toBe(1); expect(C.value(parseCards('QD')[0])).toBe(12); });
  it('everyone gets 4 cards and knows only their bottom two', () => {
    const s = C.create(cfg(4), 3); expect(s.grid.every(g => g.length === 4)).toBe(true); expect(s.grid.flat().length + s.deck.length).toBe(52);
    const v = C.view(s, 1); expect(v.know[1].map(Boolean)).toEqual([false, false, true, true]); expect(v.know[0].every(c => c === null)).toBe(true); expect(v.grid.length).toBe(0);
  });
});
describe('a turn', () => {
  const g = ['AS 2S 3S 4S', '5H 6H 7H 8H', '9D 10D JD QD'];
  it('take a card (only you see it), then swap it into your grid: the replaced card is discarded face up', () => {
    let s = mk(g); s = C.apply(s, 0, { type: 'take' }); expect(s.drawn?.rank).toBe(4); expect(C.view(s, 1).drawn).toBeNull(); expect(C.view(s, 0).drawn?.rank).toBe(4);
    s = C.apply(s, 0, { type: 'swap', index: 0 }); expect(s.grid[0].map(cardId)).toEqual(['C4', 'S2', 'S3', 'S4']); expect(s.discard.map(cardId)).toEqual(['S14']); expect(s.turn).toBe(1);
    expect(s.kn[0][0][0]?.rank).toBe(4); expect(s.kn[1][0][0]).toBeNull();      // only the player who swapped knows the new card
  });
  it('discarding a plain card just ends the turn', () => { let s = mk(g, '2C 5C'); s = C.apply(s, 0, { type: 'take' }); s = C.apply(s, 0, { type: 'dump' }); expect(s.turn).toBe(1); expect(s.discard.map(cardId)).toEqual(['C2']); });
  it('rejects out-of-order actions', () => { const s = mk(g); expect(() => C.apply(s, 0, { type: 'swap', index: 0 })).toThrow(); expect(() => C.apply(s, 1, { type: 'take' })).toThrow(); expect(() => C.apply(s, 0, { type: 'peek', index: 0 })).toThrow(); });
});
describe('powers', () => {
  const g = ['AS 2S 3S 4S', '5H 6H 7H 8H', '9D 10D JD QD'];
  it('7 or 8: peek at one of your own cards; the result is private', () => {
    let s = mk(g, '7C 5C'); s = C.apply(s, 0, { type: 'take' }); s = C.apply(s, 0, { type: 'dump' }); expect(s.step).toBe('power'); expect(s.power).toBe('self');
    s = C.apply(s, 0, { type: 'peek', index: 0 }); expect(s.step).toBe('seen'); expect(C.view(s, 0).peek?.card.rank).toBe(14); expect(C.view(s, 1).peek).toBeNull(); expect(s.kn[0][0][0]?.rank).toBe(14);
    s = C.apply(s, 0, { type: 'done' }); expect(s.turn).toBe(1);
  });
  it('9 or 10: look at someone else\'s card, not your own', () => {
    let s = mk(g, '9C'); s = C.apply(s, 0, { type: 'take' }); s = C.apply(s, 0, { type: 'dump' }); expect(s.power).toBe('other');
    expect(() => C.apply(s, 0, { type: 'spy', seat: 0, index: 1 })).toThrow(); s = C.apply(s, 0, { type: 'spy', seat: 2, index: 1 }); expect(C.view(s, 0).peek?.card.rank).toBe(10); expect(s.kn[0][2][1]?.rank).toBe(10);
  });
  it('J or Q: swap one of your cards with another player\'s without looking; third parties lose track of both slots', () => {
    let s = mk(g, 'JC'); s = { ...s, kn: s.kn.map((m, v) => (v === 2 ? m.map((r, o) => (o === 1 ? [...r] : r)) : m)) };
    s.kn[2][1][3] = s.grid[1][3]; s = C.apply(s, 0, { type: 'take' }); s = C.apply(s, 0, { type: 'dump' }); expect(s.power).toBe('swap');
    s = C.apply(s, 0, { type: 'trade', mine: 3, seat: 1, index: 3 }); expect(s.grid[0][3].rank).toBe(8); expect(s.grid[1][3].rank).toBe(4); expect(s.turn).toBe(1);
    expect(s.kn[2][1][3]).toBeNull(); expect(s.kn[0][1][3]?.rank).toBe(4); expect(s.kn[1][0][3]?.rank).toBe(8);   // the players involved still know where their own old cards went
  });
  it('powers can be switched off, and skipped', () => {
    let s = mk(g, '7C', { config: cfg(3, { powers: false }) }); s = C.apply(s, 0, { type: 'take' }); s = C.apply(s, 0, { type: 'dump' }); expect(s.step).toBe('start');
    let t = mk(g, '7C'); t = C.apply(t, 0, { type: 'take' }); t = C.apply(t, 0, { type: 'dump' }); t = C.apply(t, 0, { type: 'skip' }); expect(t.turn).toBe(1);
  });
});
describe('calling Cabo', () => {
  const g = ['AS 2S KH KD', '5H 6H 7H 8H', '9D 10D JD QD'];
  it('everyone else gets one more turn, then the round ends and cards are revealed; the lowest hand scores 0', () => {
    let s = mk(g); s = C.apply(s, 0, { type: 'cabo' }); expect(s.caller).toBe(0); expect(s.turn).toBe(1);
    expect(() => C.apply(s, 1, { type: 'cabo' })).toThrow();
    s = C.apply(s, 1, { type: 'take' }); s = C.apply(s, 1, { type: 'dump' }); expect(s.phase).toBe('playing'); expect(s.turn).toBe(2);
    s = C.apply(s, 2, { type: 'take' }); s = C.apply(s, 2, { type: 'swap', index: 0 });
    expect(s.phase).toBe('roundEnd'); expect(s.handTotals[0]).toBe(3); expect(s.history[0].callerWon).toBe(true); expect(s.history[0].points[0]).toBe(0); expect(C.view(s, 1).grid[0].length).toBe(4);
  });
  it('if the caller is not lowest they add their total plus a penalty; the lowest scores 0', () => {
    let s = mk(['AS 2S KS KC', '5H 6H 7H KD', '9D 10D JD QD']); s = C.apply(s, 0, { type: 'cabo' });
    for (const q of [1, 2]) { s = C.apply(s, q, { type: 'take' }); s = C.apply(s, q, { type: 'dump' }); if (s.step === 'power') s = C.apply(s, q, { type: 'skip' }); }
    expect(s.history[0].callerWon).toBe(false); expect(s.history[0].points).toEqual([29 + 10, 0, 42]);
  });
});
describe('simulation', () => {
  const run = (seed: number, c: C.CaboConfig) => {
    const rng = makeRng(seed + 131), lv = ['hard', 'medium', 'easy'] as Level[]; let s = C.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = C.nextRound(s); continue; }
      const seat = s.turn; s = C.apply(s, seat, chooseAction(C.view(s, seat), seat, lv[seat % 3], rng)); if (++steps > 40000) throw new Error('did not terminate');
      if (s.grid.flat().length + s.deck.length + s.discard.length + (s.drawn ? 1 : 0) !== 52) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const c of [cfg(4, { limit: 25 }), cfg(2, { limit: 25 }), cfg(6, { limit: 25, powers: false }), cfg(8, { limit: 25 })])
    it(`40 seeded games finish (${c.players} players, powers ${c.powers})`, () => { for (let seed = 1; seed <= 40; seed++) { const s = run(seed, c); expect(C.winners(s).length).toBeGreaterThanOrEqual(1); expect(Math.max(...s.totals)).toBeGreaterThanOrEqual(25); } });
});
