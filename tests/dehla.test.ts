import { describe, it, expect } from 'vitest';
import { cardId, makeRng, Card } from '../src/engine/cards';
import * as M from '../src/games/dehla/engine';
import { chooseAction } from '../src/games/dehla/bot';
import type { Level } from '../src/games/types';

const c = (suit: 0 | 1 | 2 | 3, rank: number): Card => ({ suit, rank });
const tr = (...x: [number, Card][]) => x.map(([seat, card]) => ({ seat, card }));
const cfg = (trumpMode: M.TrumpMode, extra: Partial<M.MendiConfig> = {}): M.MendiConfig => ({ ...M.defaultConfig, trumpMode, ...extra });

describe('trump modes', () => {
  it('cut: the first void play sets trump for that trick onward, and wins', () => {
    let s = M.create(cfg('cut'), 2); expect(s.phase).toBe('playing'); expect(s.trump).toBeNull();
    s = { ...s, turn: 0, leader: 0, hands: [[c(2, 9)], [c(3, 4), c(1, 2)], [c(2, 12)], [c(2, 3)]], handSizes: [1, 2, 1, 1] };
    for (const [seat, card] of [[0, c(2, 9)], [1, c(3, 4)]] as [number, Card][]) s = M.apply(s, seat, { type: 'play', card });
    expect(s.trump).toBe(3); s = M.apply(s, 2, { type: 'play', card: c(2, 12) }); s = M.apply(s, 3, { type: 'play', card: c(2, 3) });
    expect(s.lastTrick?.winner).toBe(1);
  });
  it('random: trump is known from the start; caller: 5 cards, then 13', () => {
    const r = M.create(cfg('random'), 4); expect(r.trump).not.toBeNull(); expect(r.hands[0].length).toBe(13);
    let s = M.create(cfg('caller'), 4); expect(s.phase).toBe('trump'); expect(s.hands[0].length).toBe(5);
    expect(() => M.apply(s, (s.turn + 1) % 4, { type: 'trump', suit: 0 })).toThrow();
    s = M.apply(s, s.turn, { type: 'trump', suit: 1 }); expect(s.hands.map(h => h.length)).toEqual([13, 13, 13, 13]); expect(s.turn).toBe(s.leader);
  });
  it('hidden: leader sets a card aside, only the leader can see it, and trump stays unknown', () => {
    let s = M.create(cfg('band'), 5); expect(s.phase).toBe('trump');
    const card = s.hands[s.turn][0]; expect(M.legalActions(s, s.turn).every(a => a.type === 'hide')).toBe(true);
    expect(() => M.apply(s, (s.turn + 1) % 4, { type: 'hide', card })).toThrow();
    const leader = s.turn; s = M.apply(s, leader, { type: 'hide', card });
    expect(s.hands[leader].length).toBe(12); expect(s.trump).toBeNull(); expect(M.view(s, leader).hidden?.card).toEqual(card); expect(M.view(s, (leader + 1) % 4).hidden?.card).toBeNull();
  });
  it('hidden: a void player may ask; trump is revealed, the card returns to its owner, and the asker must play a trump if able', () => {
    let s = M.create(cfg('band'), 5); const leader = s.turn;
    s = { ...s, phase: 'playing', hidden: { seat: leader, card: c(1, 5) }, trump: null, trick: tr([leader, c(2, 9)]), turn: (leader + 1) % 4,
      hands: s.hands.map((_, i) => (i === (leader + 1) % 4 ? [c(3, 4), c(1, 12), c(1, 3)] : i === leader ? [c(0, 2)] : [c(2, 3)])) };
    const asker = s.turn; expect(M.canAsk(s, asker)).toBe(true); expect(M.canAsk({ ...s, hands: s.hands.map(h => [...h, c(2, 7)]) }, asker)).toBe(false);
    s = M.apply(s, asker, { type: 'ask' }); expect(s.trump).toBe(1); expect(s.hidden).toBeNull(); expect(s.hands[leader].map(cardId).sort()).toEqual(['H5', 'S2']);
    expect(M.legalPlays(s, asker).map(cardId).sort()).toEqual(['H12', 'H3']); expect(M.canAsk(s, asker)).toBe(false);
  });
});
describe('scoring', () => {
  it('3+ tens wins; 2-2 goes to the side with 7+ tricks; mendikot and whitewash give bonuses', () => {
    expect(M.scoreDeal([3, 1], [4, 9], M.defaultConfig)).toMatchObject({ win: 0, pts: 1 });
    expect(M.scoreDeal([2, 2], [6, 7], M.defaultConfig)).toMatchObject({ win: 1, pts: 1 });
    expect(M.scoreDeal([0, 4], [5, 8], M.defaultConfig)).toMatchObject({ win: 1, mendikot: true, pts: 2 });
    expect(M.scoreDeal([4, 0], [13, 0], M.defaultConfig)).toMatchObject({ win: 0, whitewash: true, pts: 3 });
    expect(M.scoreDeal([4, 0], [13, 0], { ...M.defaultConfig, bonus: false }).pts).toBe(1);
  });
});
describe('simulation', () => {
  const run = (seed: number, lv: Level[], conf: M.MendiConfig) => {
    const rng = makeRng(seed + 21); let s = M.create(conf, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = M.nextRound(s); continue; }
      const seat = s.turn; s = M.apply(s, seat, chooseAction(M.view(s, seat), seat, lv[seat], rng));
      if (++steps > 20000) throw new Error('did not terminate');
      if (s.phase === 'playing' && s.hands.flat().length + s.played.length + (s.hidden ? 1 : 0) !== 52) throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy', 'easy', 'easy', 'easy'], ['medium', 'hard', 'easy', 'medium'], ['hard', 'hard', 'hard', 'hard']];
  for (const mode of ['cut', 'band', 'random', 'caller'] as M.TrumpMode[])
    it(`150 seeded games finish with valid scorecards (${mode})`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const s = run(seed, lv[seed % 3], cfg(mode, { target: 3 }));
        for (const r of s.history) { expect(r.tens[0] + r.tens[1]).toBe(4); expect(r.tricks[0] + r.tricks[1]).toBe(13); expect(r.points[0] + r.points[1] + r.points[2] + r.points[3]).toBeGreaterThanOrEqual(2); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals); expect(Math.max(...s.totals)).toBeGreaterThanOrEqual(3);
      }
    });
});
