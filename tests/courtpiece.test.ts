import { describe, it, expect } from 'vitest';
import { cardId, makeRng, Card } from '../src/engine/cards';
import * as C from '../src/games/courtpiece/engine';
import { chooseAction } from '../src/games/courtpiece/bot';
import type { Level } from '../src/games/types';

const c = (suit: 0 | 1 | 2 | 3, rank: number): Card => ({ suit, rank });
const tr = (...x: [number, Card][]) => x.map(([seat, card]) => ({ seat, card }));
const base = (sir: C.Sir, over: Partial<C.State> = {}): C.State => ({ ...C.create({ ...C.defaultConfig, sir }, 1), phase: 'playing', trump: 1, ...over });

describe('deal and trump', () => {
  it('deals 5 cards first; the caller then picks trump and everyone has 13', () => {
    let s = C.create(C.defaultConfig, 3);
    expect(s.phase).toBe('trump'); expect(s.hands.map(h => h.length)).toEqual([5, 5, 5, 5]); expect(s.turn).toBe(s.caller);
    expect(() => C.apply(s, (s.caller + 1) % 4, { type: 'trump', suit: 0 })).toThrow();
    s = C.apply(s, s.caller, { type: 'trump', suit: 2 });
    expect(s.phase).toBe('playing'); expect(s.trump).toBe(2); expect(s.hands.map(h => h.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(s.hands.flat().map(cardId)).size).toBe(52); expect(s.turn).toBe(s.caller);
  });
  it('view hides other hands and the undealt cards', () => {
    const v = C.view(C.create(C.defaultConfig, 3), 2); expect(v.hands[2].length).toBe(5); expect(v.hands[0].length).toBe(0); expect(v.rest.flat().length).toBe(0);
  });
  it('be-ranga deals 13 at once; the first void play sets trump and that card wins', () => {
    let s = C.create({ ...C.defaultConfig, trumpMode: 'beranga' }, 2);
    expect(s.phase).toBe('playing'); expect(s.trump).toBeNull(); expect(s.hands[0].length).toBe(13);
    s = { ...s, turn: 0, hands: [[c(2, 9)], [c(3, 4), c(1, 2)], [c(2, 12)], [c(2, 3)]], handSizes: [1, 2, 1, 1] };
    s = C.apply(s, 0, { type: 'play', card: c(2, 9) }); s = C.apply(s, 1, { type: 'play', card: c(3, 4) });
    expect(s.trump).toBe(3); s = C.apply(s, 2, { type: 'play', card: c(2, 12) }); s = C.apply(s, 3, { type: 'play', card: c(2, 3) });
    expect(s.lastTrick?.winner).toBe(1);
  });
});
describe('play rules', () => {
  it('must follow suit, otherwise any card', () => {
    const s = base('single', { turn: 1, trick: tr([0, c(2, 9)]), hands: [[], [c(2, 3), c(1, 2)], [], []] });
    expect(C.legalPlays(s, 1).map(cardId)).toEqual(['D3']); expect(C.legalPlays({ ...s, hands: [[], [c(1, 2), c(3, 5)], [], []] }, 1).length).toBe(2);
  });
  it('trump beats the led suit; highest trump wins; otherwise highest of the led suit', () => {
    expect(C.trickWinner(tr([0, c(2, 14)], [1, c(1, 2)], [2, c(1, 9)], [3, c(2, 13)]), 1).seat).toBe(2);
    expect(C.trickWinner(tr([0, c(2, 10)], [1, c(0, 14)], [2, c(2, 12)], [3, c(3, 13)]), 1).seat).toBe(2);
  });
});
describe('Sir collection rules', () => {
  const t = (w: number, card: Card) => tr([w, card], [(w + 1) % 4, c(3, 2)], [(w + 2) % 4, c(3, 3)], [(w + 3) % 4, c(3, 4)]);
  it('single sir: the winner collects at once', () => {
    const s = C.resolveTrick(base('single'), t(1, c(3, 14))); expect(s.teamTricks).toEqual([0, 1]); expect(s.pile.length).toBe(0);
  });
  it('double sir: tricks pile up until one player wins two in a row, then collects the whole pile', () => {
    let s = C.resolveTrick(base('double'), t(0, c(3, 14))); expect(s.pile.length).toBe(1); expect(s.teamTricks).toEqual([0, 0]);
    s = C.resolveTrick(s, t(1, c(3, 14))); expect(s.pile.length).toBe(2); expect(s.pending).toBe(1);
    s = C.resolveTrick(s, t(1, c(3, 13))); expect(s.teamTricks).toEqual([0, 3]); expect(s.pile.length).toBe(0);
  });
  it('ace rule: two consecutive wins both made with aces do not collect', () => {
    let s = C.resolveTrick(base('doubleAce'), t(0, c(3, 14))); s = C.resolveTrick(s, t(0, c(2, 14)));
    expect(s.teamTricks).toEqual([0, 0]); expect(s.pile.length).toBe(2);
    expect(C.resolveTrick(C.resolveTrick(base('double'), t(0, c(3, 14))), t(0, c(2, 14))).teamTricks).toEqual([2, 0]);
  });
});
describe('simulation', () => {
  const run = (seed: number, lv: Level[], cfg: C.CourtConfig) => {
    const rng = makeRng(seed + 11); let s = C.create(cfg, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = C.nextRound(s); continue; }
      const seat = s.turn; s = C.apply(s, seat, chooseAction(C.view(s, seat), seat, lv[seat], rng));
      if (++steps > 20000) throw new Error('did not terminate');
      if (s.phase === 'playing' && s.hands.flat().length + s.played.length !== 52) throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy', 'easy', 'easy', 'easy'], ['medium', 'hard', 'easy', 'medium'], ['hard', 'hard', 'hard', 'hard']];
  for (const cfg of [{ sir: 'single', trumpMode: 'caller', target: 5 }, { sir: 'double', trumpMode: 'caller', target: 5 }, { sir: 'doubleAce', trumpMode: 'beranga', target: 5 }, { sir: 'single', trumpMode: 'beranga', target: 7 }] as C.CourtConfig[])
    it(`150 seeded games finish with valid scorecards (${cfg.sir}, ${cfg.trumpMode})`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const s = run(seed, lv[seed % 3], cfg);
        for (const r of s.history) { expect(r.tricks[0] + r.tricks[1]).toBe(13); expect(r.points[0] + r.points[1] + r.points[2] + r.points[3]).toBe(r.court ? 6 : 2); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals); expect(Math.max(...s.totals)).toBeGreaterThanOrEqual(cfg.target);
      }
    });
});
