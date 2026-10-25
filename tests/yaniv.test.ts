import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as Y from '../src/games/yaniv/engine';
import { chooseAction } from '../src/games/yaniv/bot';
import type { Level } from '../src/games/types';

const cfg = (players: number, extra: Partial<Y.YanivConfig> = {}): Y.YanivConfig => ({ ...Y.defaultConfig, players, ...extra });
const mk = (hands: string[], extra: Partial<Y.State> = {}, c: Partial<Y.YanivConfig> = {}): Y.State => {
  const s = Y.create(cfg(hands.length, c), 1), h = hands.map(x => parseCards(x));
  return { ...s, hands: h, handSizes: h.map(x => x.length), deck: parseCards('4C 5C 6C 7C 8C 9C 10C'), pile: [], avail: [], mine: [], step: 'discard', turn: 0, ...extra };
};
const disc = (c: string): Y.Action => ({ type: 'discard', cards: parseCards(c) });

describe('card values and legal discards', () => {
  it('Ace 1, number cards face value, J/Q/K 10, Joker 0', () => { expect(Y.handTotal(parseCards('AS 7H JD JK QC'))).toBe(1 + 7 + 10 + 0 + 10); });
  it('single cards, sets (jokers wild) and runs of 3+ in one suit are legal; Ace is low only', () => {
    for (const ok of ['5H', '7H 7D', '7H 7D 7S 7C', '7H JK', '4H 5H 6H', 'AH 2H 3H', '4H JK 6H', '9S 10S JK', 'JK JK', 'QH KH JK', 'KH JK JK']) expect(Y.arrange(parseCards(ok)), ok).not.toBeNull();
    for (const bad of ['5H 6D', '4H 5H', '4H 5S 6H', 'QH KH AH', '4H 6H 7H', '7H 7H 8H', '4H 4D 6H', '5H JK 9H']) expect(Y.arrange(parseCards(bad)), bad).toBeNull();
  });
  it('a run is put in order with jokers filling the gaps', () => { expect(Y.arrange(parseCards('6H 4H JK'))!.map(cardId)).toEqual(['H4', 'J0', 'H6']); });
});
describe('a turn: discard, then draw', () => {
  it('discard first; you cannot draw first or discard cards you do not hold', () => {
    const s = mk(['AS 2H 9D KC 7S', '3C 4C 5D 6D 8H']);
    expect(Y.check(s, 0, { type: 'drawDeck' })).not.toBeNull(); expect(Y.check(s, 0, disc('QH'))).not.toBeNull(); expect(Y.check(s, 1, disc('3C'))).not.toBeNull(); expect(Y.check(s, 0, disc('KC'))).toBeNull();
  });
  it('draw from the deck, or take an end of the previous discard; the next player can then take what you threw', () => {
    let s = mk(['AS 2H 9D KC 7S', '3C 4C 5D 6D 8H']); s = Y.apply(s, 0, disc('KC')); expect(s.step).toBe('draw'); expect(s.hands[0].length).toBe(4);
    s = Y.apply(s, 0, { type: 'drawDeck' }); expect(s.hands[0].length).toBe(5); expect(s.turn).toBe(1); expect(s.avail.map(cardId)).toEqual(['C13']); expect(s.deck.length).toBe(6);
    s = Y.apply(s, 1, disc('8H')); s = Y.apply(s, 1, { type: 'drawDiscard', end: 'first' });
    expect(s.hands[1].map(cardId)).toContain('C13'); expect(s.avail.map(cardId)).toEqual(['H8']); expect(s.pile.length).toBe(0);
  });
  it('only the first or last card of a multi-card discard can be taken, and it leaves the rest in the pile', () => {
    let s = mk(['4H 5H 6H 9D KC', '3C 3D 8H JD 2S']); s = Y.apply(s, 0, disc('4H 5H 6H')); s = Y.apply(s, 0, { type: 'drawDeck' });
    expect(s.avail.map(cardId)).toEqual(['H4', 'H5', 'H6']); s = Y.apply(s, 1, disc('JD')); s = Y.apply(s, 1, { type: 'drawDiscard', end: 'last' });
    expect(s.hands[1].map(cardId)).toContain('H6'); expect(s.pile.map(cardId).sort()).toEqual(['H4', 'H5']);
  });
  it('the pile is reshuffled into the deck when the deck runs out', () => {
    let s = mk(['AS 2H 9D KC 7S', '3C 4C 5D 6D 8H'], { deck: [], pile: parseCards('9H 10H JH') }); s = Y.apply(s, 0, disc('KC')); s = Y.apply(s, 0, { type: 'drawDeck' });
    expect(s.hands[0].length).toBe(5); expect(s.hands.flat().length + s.deck.length + s.pile.length + s.avail.length).toBe(10 + 3 + 0 + 1 - 1 + 0);
  });
});
describe('calling Yaniv', () => {
  it('only with the threshold or less, and only instead of discarding', () => {
    const low = mk(['AS 2H 3D JK AC', 'KS KH KD KC 9H']);                       // 7
    expect(Y.check(low, 0, { type: 'yaniv' })).toBeNull(); expect(Y.check({ ...low, turn: 1 }, 1, { type: 'yaniv' })).not.toBeNull(); expect(Y.check({ ...low, step: 'draw' }, 0, { type: 'yaniv' })).not.toBeNull();
    expect(Y.check(mk(['AS 2H 3D AC AD', 'KS']), 0, { type: 'yaniv' })).not.toBeNull();                                  // 8 is too high at 7
    expect(Y.check(mk(['AS AH 2D JK', 'KS'], {}, { threshold: 5 }), 0, { type: 'yaniv' })).toBeNull();                   // 4 is fine at 5
    expect(Y.check(mk(['AS AH 2D 2C JK', 'KS'], {}, { threshold: 5 }), 0, { type: 'yaniv' })).not.toBeNull();            // 6 is too high at 5
  });
  it('lowest hand wins: caller scores 0 and everyone else adds their hand', () => {
    let s = mk(['AS 2H 3D JK AC', 'KS 5H', '4D 4C 2C', 'QS']); s = Y.apply(s, 0, { type: 'yaniv' });
    expect(s.assaf).toBe(false); expect(s.roundPoints).toEqual([0, 15, 10, 10]); expect(s.totals).toEqual([0, 15, 10, 10]); expect(s.phase).toBe('roundEnd'); expect(Y.view(s, 3).hands[0].length).toBe(5);
  });
  it('Assaf: an equal or lower hand beats the caller, who takes 30; the lowest scores 0', () => {
    let s = mk(['AS 2H 3D JK AC', 'AD 2D 2S', 'KS 5H', 'QS']); s = Y.apply(s, 0, { type: 'yaniv' });
    expect(s.assaf).toBe(true); expect(s.roundPoints).toEqual([30, 0, 15, 10]);
    s = mk(['AS 2H 3D JK AC', 'AD 2D 3S', 'KS 5H']); s = Y.apply(s, 0, { type: 'yaniv' }); expect(s.assaf).toBe(true); expect(s.roundPoints[0]).toBe(30); expect(s.roundPoints[1]).toBe(0);   // ties go against the caller
  });
  it('passing the limit puts you out; the last player left wins; the bonus drops exact multiples of 50', () => {
    let s = mk(['AS AH', 'KS KD 5H', 'QS']); s = { ...s, totals: [0, 190, 0] }; s = Y.apply(s, 0, { type: 'yaniv' });
    expect(s.active).toEqual([true, false, true]); expect(s.phase).toBe('roundEnd'); expect(Y.winners(s)).toEqual([0, 2].filter(i => s.totals[i] === Math.min(s.totals[0], s.totals[2])));
    let t = mk(['AS AH', 'KS KD 5H'], {}, { limit: 100 }); t = { ...t, totals: [0, 170] }; t = Y.apply(t, 0, { type: 'yaniv' }); expect(t.phase).toBe('gameEnd'); expect(Y.winners(t)).toEqual([0]);
    let b = mk(['AS AH', 'KS KD 5H'], {}, { bonus: true }); b = { ...b, totals: [0, 75] }; b = Y.apply(b, 0, { type: 'yaniv' }); expect(b.totals[1]).toBe(50);   // 75 + 25 = exactly 100, which drops by 50
  });
  it('view hides other hands until the round is over', () => { const v = Y.view(mk(['AS AH', 'KS KD 5H']), 0); expect(v.hands[0].length).toBe(2); expect(v.hands[1].length).toBe(0); });
});
describe('stalemate safety valve', () => {
  it('after very many turns with nobody calling, the lowest hand wins the round without a penalty', () => {
    let s = mk(['KS KH 9D', 'AS 5H 6C', 'QS QH 4D']); s = { ...s, turns: Y.STALEMATE_TURNS * 3 - 1, deck: parseCards('9C') }; s = Y.apply(s, 0, disc('9D')); s = Y.apply(s, 0, { type: 'drawDeck' });
    expect(s.stalemate).toBe(true); expect(s.caller).toBe(1); expect(s.assaf).toBe(false); expect(s.roundPoints[1]).toBe(0); expect(s.phase).toBe('roundEnd');
  });
});
describe('simulation', () => {
  const run = (seed: number, c: Y.YanivConfig) => {
    const rng = makeRng(seed + 121), lv = ['hard', 'medium', 'easy'] as Level[]; let s = Y.create(c, seed), steps = 0;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = Y.nextRound(s); continue; }
      const seat = s.turn; s = Y.apply(s, seat, chooseAction(Y.view(s, seat), seat, lv[seat % 3], rng)); if (++steps > 60000) throw new Error('did not terminate');
    }
    return s;
  };
  for (const c of [cfg(4, { limit: 100 }), cfg(2, { limit: 100 }), cfg(5, { threshold: 5, limit: 100 }), cfg(8, { limit: 100, bonus: true })])
    it(`40 seeded games finish (${c.players} players, call at ${c.threshold}, limit ${c.limit})`, () => {
      for (let seed = 1; seed <= 40; seed++) { const s = run(seed, c); expect(Y.winners(s).length).toBeGreaterThanOrEqual(1); expect(s.totals).toEqual(s.history[s.history.length - 1].totals); }
    });
});
