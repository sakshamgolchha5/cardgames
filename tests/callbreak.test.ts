import { describe, it, expect } from 'vitest';
import { standardDeck, cardId, makeRng, Card } from '../src/engine/cards';
import * as G from '../src/games/callbreak/engine';
import { chooseAction, Level } from '../src/games/callbreak/bot';

const c = (suit: 0 | 1 | 2 | 3, rank: number): Card => ({ suit, rank });
describe('cards', () => {
  it('deck has 52 unique cards', () => { const d = standardDeck(); expect(d.length).toBe(52); expect(new Set(d.map(cardId)).size).toBe(52); });
  it('same seed gives same deal', () => { expect(G.create(G.defaultConfig, 7).hands).toEqual(G.create(G.defaultConfig, 7).hands); });
});
describe('deal & bidding', () => {
  it('deals 13 each, no duplicates, leader left of dealer', () => {
    const s = G.create(G.defaultConfig, 3); expect(s.hands.map(h => h.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(s.hands.flat().map(cardId)).size).toBe(52); expect(s.turn).toBe(1);
  });
  it('rejects out-of-turn and out-of-range bids', () => {
    const s = G.create(G.defaultConfig, 3);
    expect(() => G.apply(s, 0, { type: 'bid', n: 3 })).toThrow(); expect(() => G.apply(s, 1, { type: 'bid', n: 9 })).toThrow();
  });
  it('super8 skips bidding with all bids at 8', () => { const s = G.create({ ...G.defaultConfig, mode: 'super8' }, 1); expect(s.phase).toBe('playing'); expect(s.bids).toEqual([8, 8, 8, 8]); });
});
describe('play rules', () => {
  const base = (): G.State => ({ ...G.create(G.defaultConfig, 1), phase: 'playing', bids: [3, 3, 3, 3], turn: 1 });
  it('must follow suit and beat the led card when able', () => {
    const s = { ...base(), trick: [{ seat: 0, card: c(1, 9) }], hands: [[], [c(1, 5), c(1, 12), c(2, 14), c(0, 3)], [], []] } as G.State;
    expect(G.legalActions(s, 1).map((a: any) => cardId(a.card)).sort()).toEqual(['H12']);
  });
  it('must play a spade when void in led suit, and overtrump if possible', () => {
    const s = { ...base(), trick: [{ seat: 0, card: c(1, 9) }, { seat: 3, card: c(0, 6) }], turn: 1, hands: [[], [c(2, 14), c(0, 4), c(0, 10)], [], []] } as G.State;
    expect(G.legalActions(s, 1).map((a: any) => cardId(a.card))).toEqual(['S10']);
  });
  it('any card when void in led suit and no spades', () => {
    const s = { ...base(), trick: [{ seat: 0, card: c(1, 9) }], hands: [[], [c(2, 14), c(3, 4)], [], []] } as G.State;
    expect(G.legalActions(s, 1).length).toBe(2);
  });
  it('spade beats the led suit; highest spade wins', () => {
    expect(G.currentWinner([{ seat: 0, card: c(1, 14) }, { seat: 1, card: c(0, 2) }, { seat: 2, card: c(0, 5) }, { seat: 3, card: c(1, 13) }]).seat).toBe(2);
  });
});
describe('scoring', () => {
  it('bid met, overtricks, and failure', () => {
    expect(G.scoreOf(3, 3)).toBe(3); expect(G.scoreOf(3, 5)).toBe(3.2); expect(G.scoreOf(4, 2)).toBe(-4); expect(G.scoreOf(8, 13)).toBe(8.5);
  });
});
describe('information hiding', () => {
  it('view hides other hands; blind mode hides other bids', () => {
    const s = G.create({ ...G.defaultConfig, mode: 'blind' }, 5), v = G.view({ ...s, bids: [2, 3, 4, 5] }, 2);
    expect(v.hands[2].length).toBe(13); expect(v.hands[0].length).toBe(0); expect(v.bids).toEqual([null, null, 4, null]);
  });
});
describe('full-game simulation', () => {
  const run = (seed: number, levels: Level[], config: G.CallbreakConfig) => {
    const rng = makeRng(seed + 99); let s = G.create(config, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = G.nextRound(s); continue; }
      const seat = s.turn, a = chooseAction(G.view(s, seat), seat, levels[seat], rng);
      s = G.apply(s, seat, a); if (++steps > 5000) throw new Error('did not terminate');
      const inPlay = s.hands.flat().length + s.played.length; if (s.phase !== 'roundEnd' && inPlay !== 52 && s.phase !== 'gameEnd') throw new Error('card conservation broken');
    }
    return s;
  };
  const lv: Level[][] = [['easy', 'easy', 'easy', 'easy'], ['medium', 'hard', 'easy', 'medium'], ['hard', 'hard', 'hard', 'hard']];
  for (const cfg of [G.defaultConfig, { ...G.defaultConfig, rounds: 3 as const, mode: 'blind' as const }, { ...G.defaultConfig, mode: 'super8' as const }, { ...G.defaultConfig, mustBeat: false, redealNoSpade: true }])
    it(`200 seeded games finish with valid scorecards (${cfg.mode}, ${cfg.rounds} rounds)`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const s = run(seed, lv[seed % 3], cfg);
        expect(s.history.length).toBe(cfg.rounds);
        for (const r of s.history) { expect(r.won.reduce((a, b) => a + b, 0)).toBe(13); expect(r.points).toEqual(r.bids.map((b, i) => G.scoreOf(b, r.won[i]))); }
        expect(s.totals).toEqual(s.history[s.history.length - 1].totals);
      }
    });
});
