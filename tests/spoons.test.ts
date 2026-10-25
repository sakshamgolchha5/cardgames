import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as S from '../src/games/spoons/engine';
import type { Level } from '../src/games/types';

const cfg = (players: number, extra: Partial<S.SpoonsConfig> = {}): S.SpoonsConfig => ({ ...S.defaultConfig, players, ...extra });
const withHands = (s: S.State, hands: string[], extra: Partial<S.State> = {}): S.State => S.refresh({ ...s, hands: hands.map(x => parseCards(x)), deck: parseCards('2C 3C 4C 5C 6C 7C 8C 9C'), waste: [], stage: 'pass', ...extra });

describe('deal', () => {
  it('four cards each, one spoon fewer than players, nothing lost', () => {
    for (const n of [3, 5, 8, 10]) { const s = S.create(cfg(n), 3); expect(s.hands.every(h => h.length === 4)).toBe(true); expect(s.spoons).toBe(n - 1); expect(s.hands.flat().length + s.deck.length).toBe(52); expect(new Set([...s.hands.flat(), ...s.deck].map(cardId)).size).toBe(52); }
  });
  it('four of a kind: detected', () => { expect(S.hasFour(parseCards('7H 7D 7S 7C'))).toBe(true); expect(S.hasFour(parseCards('7H 7D 7S 8C'))).toBe(false); });
});
describe('passing', () => {
  const three = () => withHands(S.create(cfg(3), 1), ['AH AD 2S 3S', 'KH KD 4S 5S', 'QH QD 6S 7S'], { ring: [0, 1, 2], picks: [null, null, null], picked: [false, false, false] });
  it('everyone passes at once: first draws from the deck, each receives the previous card, the last card is discarded', () => {
    let s = three(); s = S.apply(s, 0, { type: 'pick', index: 2 }); s = S.apply(s, 1, { type: 'pick', index: 2 }); expect(s.tick).toBe(0);
    s = S.apply(s, 2, { type: 'pick', index: 3 }); expect(s.tick).toBe(1); expect(s.hands.map(h => h.length)).toEqual([4, 4, 4]);
    expect(s.hands[0].map(cardId).sort()).toEqual(['C2', 'D14', 'H14', 'S3'].sort());
    expect(s.hands[1].map(cardId).sort()).toEqual(['D13', 'H13', 'S2', 'S5'].sort());
    expect(s.hands[2].map(cardId).sort()).toEqual(['D12', 'H12', 'S4', 'S6'].sort());
    expect(s.waste.map(cardId)).toEqual(['S7']); expect(s.picked).toEqual([false, false, false]);
  });
  it('a pick can be changed until the last player has chosen; bad picks are rejected; picks and hands are private', () => {
    let s = three(); s = S.apply(s, 0, { type: 'pick', index: 1 }); s = S.apply(s, 0, { type: 'pick', index: 3 }); expect(s.picks[0]).toBe(3); expect(() => S.apply(s, 0, { type: 'pick', index: 4 })).toThrow();
    expect(S.view(s, 1).picks[0]).toBeNull(); expect(S.view(s, 0).myPick).toBe(3); expect(S.view(s, 1).hands[0].length).toBe(0);
  });
  it('the waste pile is reshuffled into the deck when the deck runs out', () => {
    let s = three(); s = { ...s, deck: [], waste: parseCards('8H 9H 10H') }; for (const q of [0, 1, 2]) s = S.apply(s, q, { type: 'pick', index: 0 });
    expect(s.hands.flat().length + s.deck.length + s.waste.length).toBe(15);
  });
});
describe('the spoon race', () => {
  const four = () => withHands(S.create(cfg(4), 1), ['7H 7D 7S 7C', '2H 3D 4S 9C', '2D 3H 5S 9D', '2S 6H 6S 9H'], { stage: 'grab' });
  it('you may grab with four of a kind; others only once somebody has grabbed', () => {
    let s = four(); expect(S.canGrab(s, 0)).toBe(true); expect(S.canGrab(s, 1)).toBe(false); expect(() => S.apply(s, 1, { type: 'grab' })).toThrow();
    s = S.apply(s, 0, { type: 'grab' }); expect(S.canGrab(s, 1)).toBe(true); expect(s.spoons).toBe(2); expect(() => S.apply(s, 0, { type: 'grab' })).toThrow();
  });
  it('the player left without a spoon takes a letter; hands are revealed; the next round starts clean', () => {
    let s = four(); s = S.apply(s, 0, { type: 'grab' }); s = S.apply(s, 2, { type: 'grab' }); s = S.apply(s, 1, { type: 'grab' });
    expect(s.phase).toBe('roundEnd'); expect(s.loser).toBe(3); expect(s.letters).toEqual([0, 0, 0, 1]); expect(s.history[0].letter).toBe('S'); expect(S.view(s, 0).hands[3].length).toBe(4);
    const n = S.nextRound(s); expect(n.phase).toBe('playing'); expect(n.grabOrder).toEqual([]); expect(n.letters).toEqual([0, 0, 0, 1]);
  });
  it('after 5 (or 3) letters a player is out, and the last one standing wins', () => {
    let s = four(); s = { ...s, letters: [0, 0, 0, 4] }; for (const q of [0, 2, 1]) s = S.apply(s, q, { type: 'grab' });
    expect(s.active).toEqual([true, true, true, false]); expect(s.history[0].eliminated).toBe(true); expect(s.history[0].letter).toBe('N');
    let t = withHands(S.create(cfg(2, { letters: 3 }), 1), ['7H 7D 7S 7C', '2H 3D 4S 9C'], { stage: 'grab', letters: [0, 2] }); t = S.apply(t, 0, { type: 'grab' });
    expect(t.phase).toBe('gameEnd'); expect(S.winners(t)).toEqual([0]);
  });
});
describe('real-time plan and simulation', () => {
  it('bots plan a pass after a short think and grab after a reaction time; a human only gets a time-out auto-pick', () => {
    const s = S.create(cfg(4), 5), p = S.plan(s, 'hard', makeRng(1), new Set([0]), 5000);
    expect(p.length).toBe(4); expect(p.find(x => x.seat === 0)).toMatchObject({ human: true, delay: 5000 }); for (const x of p.filter(y => y.seat !== 0)) expect(x.delay).toBeLessThan(1000);
    const g = withHands(S.create(cfg(4), 1), ['7H 7D 7S 7C', '2H 3D 4S 9C', '2D 3H 5S 9D', '2S 6H 6S 9H'], { stage: 'grab' });
    expect(S.plan(g, 'hard', makeRng(1), new Set([1]), 5000).map(x => x.seat)).toEqual([0]);
    expect(S.plan(S.apply(g, 0, { type: 'grab' }), 'hard', makeRng(1), new Set([1]), 5000).filter(x => !x.human).map(x => x.seat).sort()).toEqual([2, 3]);
  });
  it('plan keys stay the same while the situation does, so running timers are not restarted', () => {
    const s = S.create(cfg(4), 5), a = S.plan(s, 'hard', makeRng(1), new Set([0]), 5000), b = S.plan(S.apply(s, 1, { type: 'pick', index: 0 }), 'hard', makeRng(2), new Set([0]), 5000);
    for (const x of b) expect(a.find(y => y.key === x.key)).toBeTruthy(); expect(b.length).toBe(a.length - 1);
  });
  const run = (seed: number, c: S.SpoonsConfig, humans: number[]) => {
    const rng = makeRng(seed + 111), lv = ['hard', 'medium', 'easy'] as Level[]; let s = S.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = S.nextRound(s); continue; }
      const items = S.plan(s, lv[seed % 3], rng, new Set(humans), 5000).sort((a, b) => a.delay - b.delay); if (!items.length) throw new Error('stalled');
      s = S.apply(s, items[0].seat, items[0].action as S.Action); if (++steps > 40000) throw new Error('did not terminate');
    }
    return s;
  };
  for (const c of [cfg(3, { letters: 3 }), cfg(5), cfg(8, { letters: 3 }), cfg(10, { letters: 3 })])
    it(`40 seeded games end with one player left (${c.players} players, ${c.letters} letters)`, () => {
      for (let seed = 1; seed <= 40; seed++) { const s = run(seed, c, [0]); expect(s.active.filter(Boolean).length).toBe(1); expect(S.winners(s).length).toBe(1); expect(s.letters[S.winners(s)[0]]).toBeLessThan(c.letters); }
    });
});
