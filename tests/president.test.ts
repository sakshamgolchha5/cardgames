import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards, Card } from '../src/engine/cards';
import * as P from '../src/games/president/engine';
import { chooseAction } from '../src/games/president/bot';

const cfg = (players: number, extra: Partial<P.PresConfig> = {}): P.PresConfig => ({ ...P.defaultConfig, players, rounds: 1, swap: 'none', ...extra });
const set = (c: string): P.Action => ({ type: 'set', cards: parseCards(c) });
const mk = (players: number, hands: string[], extra: Partial<P.PresConfig> = {}, turn = 0): P.State => {
  const s = P.create(cfg(players, extra), 1), h = hands.map(x => P.byPower(parseCards(x)));
  return { ...s, hands: h, handSizes: h.map(x => x.length), leader: turn, turn, table: null, streak: 0, order: [], acts: h.map(() => null) };
};

describe('ranks and sets', () => {
  it('2 is highest, 3 lowest; a revolution mirrors the order', () => {
    expect(P.eff(2, false)).toBeGreaterThan(P.eff(14, false)); expect(P.eff(14, false)).toBeGreaterThan(P.eff(3, false));
    expect(P.eff(3, true)).toBeGreaterThan(P.eff(2, true)); expect(P.eff(2, true)).toBeLessThan(P.eff(14, true));
  });
  it('deals everything; leading allows any set of one rank; following needs the same count and a higher rank', () => {
    expect(P.create(cfg(4), 2).hands.flat().length).toBe(52); expect(P.create(cfg(7, { decks: 2 }), 2).hands.flat().length).toBe(104);
    let s = mk(3, ['8H 8D KC', '9H 9D 4C', 'AC AD 5C']);
    expect(P.check(s, 0, set('8H 9H'))).not.toBeNull(); expect(P.check(s, 0, set('8H 8D'))).toBeNull();
    s = P.apply(s, 0, set('8H 8D'));
    expect(P.check(s, 1, set('9H'))).not.toBeNull();          // wrong count
    expect(P.check(s, 1, set('4C 4C'))).not.toBeNull();       // not in hand
    expect(P.check(s, 1, set('9H 9D'))).toBeNull();           // higher pair
    expect(P.check(P.apply(s, 1, { type: 'skip' }), 2, set('AC AD'))).toBeNull();
  });
  it('you cannot pass when leading', () => { expect(P.check(mk(3, ['8H', '9H', '4C']), 0, { type: 'skip' })).not.toBeNull(); });
});
describe('tricks', () => {
  it('everybody else passing clears the trick and the last player leads again', () => {
    let s = mk(3, ['8H 8D KC', '9H 4D', 'AC 5C 6C']); s = P.apply(s, 0, set('8H')); s = P.apply(s, 1, { type: 'skip' }); s = P.apply(s, 2, { type: 'skip' });
    expect(s.table).toBeNull(); expect(s.turn).toBe(0); expect((s.event as any)).toEqual({ k: 'clear', leader: 0 });
  });
  it('a play nothing can beat (a 2) clears at once', () => {
    let s = mk(3, ['2H 8D KC', '9H 4D', 'AC 5C 6C']); s = P.apply(s, 0, set('2H')); expect(s.table).toBeNull(); expect(s.turn).toBe(0);
  });
  it('four of a kind reverses the ranks when revolution is on (and not otherwise)', () => {
    const a = P.apply(mk(3, ['5H 5D 5S 5C 9D', '3H 3D', '6H 6D'], { revolution: true }), 0, set('5H 5D 5S 5C')); expect(a.rev).toBe(true); expect((a.event as any).k).toBe('rev');
    expect(P.apply(mk(3, ['5H 5D 5S 5C 9D', '3H 3D', '6H 6D']), 0, set('5H 5D 5S 5C')).rev).toBe(false);
    const b = P.apply(mk(3, ['5H 5D 5S 5C 9D', '3H 3D 3S 3C', '6H 6D']), 0, set('5H 5D 5S 5C')); expect(P.check(b, 1, set('3H 3D 3S 3C'))).not.toBeNull(); // 3s are not higher yet
    const c = P.apply(mk(3, ['5H 5D 5S 5C 9D', '3H 3D 3S 3C', '6H 6D'], { revolution: true }), 0, set('5H 5D 5S 5C')); expect(P.check(c, 1, set('3H 3D 3S 3C'))).toBeNull(); // after the flip 3s beat 5s
  });
});
describe('going out and scoring', () => {
  it('finish order decides President to Scum; points fall with place', () => {
    let s = mk(3, ['8H', '9H', '4C 5C']); s = P.apply(s, 0, set('8H')); expect(s.order).toEqual([0]); s = P.apply(s, 1, set('9H'));
    expect(s.phase).toBe('gameEnd'); expect(s.history[0].order).toEqual([0, 1, 2]); expect(s.history[0].points).toEqual([2, 1, 0]); expect(P.placeName(0, 3)).toBe('President'); expect(P.placeName(2, 3)).toBe('Scum'); expect(P.placeName(1, 5)).toBe('Vice President');
  });
  it('after a player goes out the trick carries on without them', () => {
    let s = mk(4, ['8H', '9H 4D', 'AC 5C', '6D 7D']); s = P.apply(s, 0, set('8H')); expect(s.turn).toBe(1); s = P.apply(s, 1, set('9H')); s = P.apply(s, 2, { type: 'skip' }); s = P.apply(s, 3, { type: 'skip' });
    expect(s.table).toBeNull(); expect(s.turn).toBe(1);
  });
});
describe('card swap', () => {
  it('the Scum gives their best cards to the President, who chooses what to give back; the Vice Scum swaps one', () => {
    let s = P.create(cfg(4, { swap: 'two', rounds: 3 }), 3);
    s = { ...s, phase: 'roundEnd', history: [{ round: 1, order: [2, 0, 3, 1], points: [], totals: [0, 0, 0, 0] }] }; s = P.nextRound(s);
    expect(s.phase).toBe('exchange'); expect(s.xchg).toEqual({ high: 2, low: 1, count: 2 }); expect(s.turn).toBe(2); expect(s.received.length).toBe(2);
    expect(P.view(s, 0).received.length).toBe(0); expect(P.view(s, 2).received.length).toBe(2);
    const worst = P.byPower(s.hands[2]).slice(0, 2); s = P.apply(s, 2, { type: 'return', cards: worst });
    expect(s.phase).toBe('exchange'); expect(s.xchg).toEqual({ high: 0, low: 3, count: 1 }); s = P.apply(s, 0, { type: 'return', cards: P.byPower(s.hands[0]).slice(0, 1) });
    expect(s.phase).toBe('playing'); expect(s.turn).toBe(1); expect(s.hands.map(h => h.length).reduce((a, b) => a + b, 0)).toBe(52); // the Scum leads
  });
  it('view hides other hands', () => { const v = P.view(P.create(cfg(4), 2), 1); expect(v.hands[0].length).toBe(0); expect(v.hands[1].length).toBeGreaterThan(0); });
});
describe('simulation', () => {
  const run = (seed: number, c: P.PresConfig) => {
    const rng = makeRng(seed + 101), lv = ['hard', 'medium', 'easy'] as const; let s = P.create(c, seed), steps = 0; const total = 52 * c.decks;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = P.nextRound(s); continue; }
      const seat = s.turn; s = P.apply(s, seat, chooseAction(P.view(s, seat), seat, lv[seat % 3], rng));
      if (++steps > 40000) throw new Error('did not terminate');
    }
    return s;
  };
  for (const c of [cfg(4, { rounds: 2 }), cfg(3, { swap: 'one', rounds: 2 }), cfg(5, { swap: 'two', revolution: true, rounds: 3 }), cfg(10, { decks: 2, rounds: 2 }), cfg(8, { decks: 3, revolution: true, swap: 'two' })])
    it(`60 seeded games finish (${c.players} players, ${c.decks} decks, swap ${c.swap}, revolution ${c.revolution}, ${c.rounds} rounds)`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const s = run(seed, c); expect(s.history.length).toBe(c.rounds);
        for (const r of s.history) { expect(new Set(r.order).size).toBe(c.players); expect(r.points.reduce((a, b) => a + b, 0)).toBe((c.players * (c.players - 1)) / 2); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
      }
    });
});
