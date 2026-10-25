import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as B from '../src/games/bluff/engine';
import { chooseAction } from '../src/games/bluff/bot';
import type { Level } from '../src/games/types';

const cfg = (players: number, decks = 1, extra: Partial<B.BluffConfig> = {}): B.BluffConfig => ({ ...B.defaultConfig, players, decks, rounds: 1, ...extra });
const claim = (cards: string, rank: number): B.Action => ({ type: 'claim', cards: parseCards(cards), rank });
const withHands = (s: B.State, hands: string[]): B.State => { const h = hands.map(x => parseCards(x)); return { ...s, hands: h, handSizes: h.map(x => x.length) }; };

describe('deal', () => {
  it('deals every card, as evenly as possible, to 2-10 players with 1-3 decks', () => {
    for (const [n, d] of [[2, 1], [4, 1], [7, 1], [6, 2], [10, 2], [10, 3]]) {
      const s = B.create(cfg(n, d), 2), sizes = s.hands.map(h => h.length);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(52 * d); expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1); expect(s.turn).toBe(1);
    }
    const two = B.create(cfg(4, 2), 3).hands.flat().map(cardId); for (const k of new Set(two)) expect(two.filter(x => x === k).length).toBeLessThanOrEqual(2);
  });
});
describe('claims and calls', () => {
  const start = () => withHands(B.create(cfg(3), 1), ['AS KS', '7H 7D 2C', '9C 9D']), s0 = () => ({ ...start(), turn: 0, dealer: 2 });
  it('the starter must claim and may name any rank; later players must match it', () => {
    const s = s0(); expect(B.legalActions(s, 0).every(a => a.type === 'claim')).toBe(true); expect(B.legalActions(s, 0).length).toBe(13);
    const t = B.apply(s, 0, claim('AS', 7)); expect(t.expect).toBe(7); expect(t.pileCount).toBe(1); expect(t.turn).toBe(1);
    expect(() => B.apply(t, 1, claim('7H', 8))).toThrow(); expect(() => B.apply(t, 1, claim('3H', 7))).toThrow(); expect(() => B.apply(t, 0, claim('KS', 7))).toThrow();
  });
  it('a true claim called: the caller takes the pile and the honest player starts the next round', () => {
    let s = B.apply(s0(), 0, claim('AS', 14)); s = B.apply(s, 1, { type: 'call' });
    expect(s.hands[1].length).toBe(4); expect(s.pile.length).toBe(0); expect(s.turn).toBe(0); expect(s.lastPlay).toBeNull(); expect(s.lastTrick?.winner).toBe(0);
    expect((s.event as any).liar).toBe(false);
  });
  it('a false claim called: the liar takes the pile and the caller starts', () => {
    let s = B.apply(s0(), 0, claim('AS', 7)); s = B.apply(s, 1, { type: 'call' });
    expect(s.hands[0].length).toBe(2); expect(s.hands[0].map(cardId).sort()).toEqual(['S13', 'S14']); expect(s.turn).toBe(1); expect((s.event as any).liar).toBe(true);
  });
  it('everyone else passing discards the pile and the last player starts a new round', () => {
    let s = B.apply(s0(), 0, claim('AS', 14)); s = B.apply(s, 1, { type: 'skip' }); expect(s.turn).toBe(2); s = B.apply(s, 2, { type: 'skip' });
    expect(s.pileCount).toBe(0); expect(s.discarded).toBe(1); expect(s.turn).toBe(0); expect(s.lastPlay).toBeNull(); expect(B.legalActions(s, 0).length).toBe(13);
  });
  it('declare mode: after passing you cannot play again that round, but may still call', () => {
    let s = withHands(B.create(cfg(4), 1), ['AS KS', '7H 2C', '9C 9D', '4H 5H']); s = { ...s, turn: 0, dealer: 3 };
    s = B.apply(s, 0, claim('KS', 13)); s = B.apply(s, 1, { type: 'skip' }); s = B.apply(s, 2, claim('9C', 13)); s = B.apply(s, 3, { type: 'skip' });
    expect(s.turn).toBe(0); expect(B.legalActions(s, 0).some(a => a.type === 'call')).toBe(true);
    s = B.apply(s, 0, { type: 'skip' }); expect(s.turn).toBe(1); expect(B.legalActions(s, 1).some(a => a.type === 'claim')).toBe(false); expect(B.legalActions(s, 1).some(a => a.type === 'call')).toBe(true);
  });
  it('one-card-per-turn mode rejects multi-card plays', () => {
    const s = { ...withHands(B.create(cfg(3, 1, { perTurn: 'one' }), 1), ['AS KS', '7H', '9C']), turn: 0, dealer: 2 };
    expect(() => B.apply(s, 0, claim('AS KS', 14))).toThrow(); expect(B.apply(s, 0, claim('AS', 14)).pileCount).toBe(1);
  });
  it('sequence mode climbs A,2,3...', () => {
    let s = { ...withHands(B.create(cfg(3, 1, { rankMode: 'sequence' }), 1), ['AS 2S 3S', 'AD 2D 3D', 'AC 2C 3C']), turn: 0, dealer: 2 };
    expect(s.expect).toBe(14); s = B.apply(s, 0, claim('AS', 14)); expect(s.expect).toBe(2); s = B.apply(s, 1, claim('2D', 2)); expect(s.expect).toBe(3);
    expect(() => B.apply(s, 2, claim('AC', 14))).toThrow();
  });
});
describe('going out', () => {
  const near = () => ({ ...withHands(B.create(cfg(3), 1), ['AS', '7H 2C', '9C 9D']), turn: 0, dealer: 2 });
  it('emptying your hand wins only if nobody calls (the next player must call or accept)', () => {
    let s = B.apply(near(), 0, claim('AS', 14)); expect(B.legalActions(s, 1).some(a => a.type === 'claim')).toBe(false);
    s = B.apply(s, 1, { type: 'skip' }); expect(s.phase).toBe('gameEnd'); expect(s.totals).toEqual([1, 0, 0]);
  });
  it('a true last claim that is called wins for the claimant; a bluff gives the pile back', () => {
    let s = B.apply(near(), 0, claim('AS', 14)); s = B.apply(s, 1, { type: 'call' }); expect(s.phase).toBe('gameEnd'); expect(s.totals).toEqual([1, 0, 0]); expect(s.hands[1].length).toBe(3);
    s = B.apply(near(), 0, claim('AS', 5)); s = B.apply(s, 1, { type: 'call' }); expect(s.phase).toBe('playing'); expect(s.hands[0].length).toBe(1); expect(s.turn).toBe(1);
  });
});
describe('who did what', () => {
  it('records each player\'s latest action and clears it when a new round starts', () => {
    let s = { ...withHands(B.create(cfg(3), 1), ['AS KS', '7H 2C', '9C 9D']), turn: 0, dealer: 2 };
    s = B.apply(s, 0, claim('KS', 13)); expect(s.acts[0]).toEqual({ k: 'claim', count: 1, rank: 13 });
    s = B.apply(s, 1, { type: 'skip' }); expect(s.acts[1]).toEqual({ k: 'skip' }); expect(s.acts[0]).toEqual({ k: 'claim', count: 1, rank: 13 });
    s = B.apply(s, 2, { type: 'skip' }); expect(s.acts.every(a => a === null)).toBe(true);
  });
});
describe('hidden information', () => {
  it('a private view gives the same legal actions as the full state', () => {
    let s = { ...withHands(B.create(cfg(3), 1), ['AS KS', '7H 2C', '9C 9D']), turn: 0, dealer: 2 }; s = B.apply(s, 0, claim('AS', 7));
    expect(B.legalActions(B.view(s, 1), 1)).toEqual(B.legalActions(s, 1));
  });
  it('players never see the pile or another player\'s last cards', () => {
    const s = B.apply({ ...withHands(B.create(cfg(3), 1), ['AS KS', '7H', '9C']), turn: 0, dealer: 2 }, 0, claim('AS', 7));
    const other = B.view(s, 1), me = B.view(s, 0);
    expect(other.pile.length).toBe(0); expect(other.pileCount).toBe(1); expect(other.lastPlay?.cards.length).toBe(0); expect(other.lastPlay?.count).toBe(1); expect(other.hands[0].length).toBe(0);
    expect(me.lastPlay?.cards.length).toBe(1);
  });
});
describe('simulation', () => {
  const run = (seed: number, c: B.BluffConfig) => {
    const rng = makeRng(seed + 61), lv: Level[] = ['hard', 'medium', 'easy']; let s = B.create(c, seed), steps = 0; const total = 52 * c.decks;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = B.nextRound(s); continue; }
      const seat = s.turn; s = B.apply(s, seat, chooseAction(B.view(s, seat), seat, lv[seat % 3], rng));
      if (++steps > 60000) throw new Error('did not terminate');
      if (s.hands.flat().length + s.pile.length + s.discarded !== total) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const c of [cfg(4, 1, { rounds: 2 }), cfg(2, 1), cfg(6, 2, { rankMode: 'sequence' }), cfg(10, 3, { perTurn: 'one' }), cfg(3, 1, { rankMode: 'sequence', perTurn: 'one' }), cfg(8, 2)])
    it(`40 seeded games finish with a winner (${c.players} players, ${c.decks} decks, ${c.rankMode}, ${c.perTurn})`, () => {
      for (let seed = 1; seed <= 40; seed++) { const s = run(seed, c); expect(s.history.length).toBe(c.rounds); for (const r of s.history) expect(r.points.reduce((a, b) => a + b, 0)).toBe(1); }
    });
});
