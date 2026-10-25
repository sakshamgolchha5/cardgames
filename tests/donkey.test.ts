import { describe, it, expect } from 'vitest';
import { cardId, makeRng, parseCards } from '../src/engine/cards';
import * as D from '../src/games/donkey/engine';
import { chooseAction } from '../src/games/donkey/bot';

const cfg = (players: number, extra: Partial<D.DonkeyConfig> = {}): D.DonkeyConfig => ({ ...D.defaultConfig, players, rounds: 1, ...extra });
const A = (c: string) => ({ type: 'play' as const, card: parseCards(c)[0] });
/** a mid-game state: given hands, the leader, and that the first trick is over */
const mid = (players: number, hands: string[], leader = 0, extra: Partial<D.DonkeyConfig> = {}): D.State => {
  const h = hands.map(x => parseCards(x)), s = D.create(cfg(players, extra), 1);
  return { ...s, hands: h, handSizes: h.map(x => x.length), leader, turn: leader, toPlay: h.map((x, i) => (x.length ? (leader + i) % h.length : -1)).filter(i => i >= 0).sort((a, b) => ((a - leader + h.length) % h.length) - ((b - leader + h.length) % h.length)), trickNo: 3, trick: [], cut: false, waste: [], wasteCount: 0 };
};

describe('deal and opening', () => {
  it('deals everything and the Ace of Spades holder must lead it', () => {
    for (const [n, d] of [[3, 1], [4, 1], [10, 1], [6, 2]]) {
      const s = D.create(cfg(n, { decks: d }), 3); expect(s.hands.flat().length).toBe(52 * d);
      expect(s.hands[s.turn].map(cardId)).toContain('S14'); expect(D.legalPlays(s, s.turn).map(cardId)).toEqual(['S14']);
    }
  });
});
describe('tricks', () => {
  it('everyone follows: the cards are thrown away and the highest card leads', () => {
    let s = mid(3, ['9H 2C', 'KH 3D', '4H 5D']); s = D.apply(s, 0, A('9H')); s = D.apply(s, 1, A('KH')); s = D.apply(s, 2, A('4H'));
    expect(s.waste.length).toBe(3); expect(s.hands.map(h => h.length)).toEqual([1, 1, 1]); expect(s.leader).toBe(1); expect(s.turn).toBe(1); expect((s.event as any).k).toBe('discard');
  });
  it('must follow suit; when void any card may be thrown', () => {
    const s = mid(3, ['9H 2C', 'KS 3D', '4H 5D']), t = D.apply(s, 0, A('9H'));
    expect(D.legalPlays(t, 1).length).toBe(2); expect(() => D.apply(t, 1, A('KS'))).not.toThrow();
    const u = D.apply(mid(3, ['9H 2C', 'KH 3D', '4H 5D']), 0, A('9H')); expect(D.legalPlays(u, 1).map(cardId)).toEqual(['H13']);
  });
  it('a cut ends the trick at once and the highest card of the led suit picks up everything', () => {
    let s = mid(4, ['9H 2C', 'KH 3D', '4D 5D', '7H 8H']); s = D.apply(s, 0, A('9H')); s = D.apply(s, 1, A('KH')); s = D.apply(s, 2, A('4D'));
    expect(s.trick.length).toBe(0); expect(s.hands[1].length).toBe(1 + 3); expect(s.leader).toBe(1); expect(s.pickups[1]).toBe(3); expect((s.event as any)).toEqual({ k: 'pickup', seat: 1, count: 3 });
    expect(s.hands[3].length).toBe(2); // the last player never had to play
  });
  it('the opening trick is thrown away even if somebody cannot follow', () => {
    let s = D.create(cfg(3), 5); const lead = s.turn; s = { ...s, hands: s.hands.map((h, i) => (i === lead ? parseCards('AS 2C') : i === (lead + 1) % 3 ? parseCards('3D 4D') : parseCards('KS 5C'))) };
    s = D.apply(s, lead, A('AS')); s = D.apply(s, (lead + 1) % 3, A('3D')); s = D.apply(s, (lead + 2) % 3, A('KS'));
    expect(s.waste.length).toBe(3); expect(s.leader).toBe(lead); expect(s.trickNo).toBe(1);
  });
});
describe('going out', () => {
  it('when only one player still has cards that player is the Donkey and takes the penalty', () => {
    let s = mid(3, ['9H', 'KH', '4H 5D 6D']); s = D.apply(s, 0, A('9H')); s = D.apply(s, 1, A('KH')); s = D.apply(s, 2, A('4H'));
    expect(s.phase).toBe('gameEnd'); expect(s.loser).toBe(2); expect(s.totals).toEqual([0, 0, 1]);
    const l = D.apply(D.apply(D.apply(mid(3, ['9H', 'KH', '4H 5D 6D'], 0, { scoring: 'legs' }), 0, A('9H')), 1, A('KH')), 2, A('4H')); expect(l.totals).toEqual([0, 0, 2]);
  });
  it('a leader who has gone out: the next player leads, or with the draw option takes a random waste card', () => {
    const waste = parseCards('2S 3S'), base = mid(3, ['9H', 'KH 3C', '4H 5D 6D']);
    let s = D.apply(D.apply(D.apply({ ...base, waste, wasteCount: 2 }, 0, A('9H')), 1, A('KH')), 2, A('4H'));
    expect(s.hands[1].length).toBe(1); expect(s.leader).toBe(1);
    s = D.apply(D.apply(D.apply({ ...mid(3, ['9H 2C', 'KH', '4H 5D 6D'], 0, { emptyLeader: 'draw' }), waste, wasteCount: 2 }, 0, A('9H')), 1, A('KH')), 2, A('4H'));
    expect(s.hands[1].length).toBe(1); expect(s.leader).toBe(1); expect((s.event as any).k).toBe('draw'); expect(s.waste.length).toBe(4);
    s = D.apply(D.apply(D.apply({ ...mid(3, ['9H 2C', 'KH', '4H 5D 6D']), waste, wasteCount: 2 }, 0, A('9H')), 1, A('KH')), 2, A('4H')); expect(s.leader).toBe(2); // no draw option: next player with cards
  });
  it('view hides hands and the waste pile', () => { const v = D.view(D.create(cfg(4), 2), 1); expect(v.hands[0].length).toBe(0); expect(v.waste.length).toBe(0); });
});
describe('simulation', () => {
  const run = (seed: number, c: D.DonkeyConfig) => {
    const rng = makeRng(seed + 91), lv = ['hard', 'medium', 'easy'] as const; let s = D.create(c, seed), steps = 0; const total = 52 * c.decks;
    while (s.phase !== 'gameEnd') {
      if (s.phase === 'roundEnd') { s = D.nextRound(s); continue; }
      const seat = s.turn; s = D.apply(s, seat, chooseAction(D.view(s, seat), seat, lv[seat % 3], rng));
      if (++steps > 30000) throw new Error('did not terminate');
      if (s.hands.flat().length + s.waste.length + s.trick.length !== total) throw new Error('card conservation broken');
    }
    return s;
  };
  for (const c of [cfg(4), cfg(3, { rounds: 2 }), cfg(10), cfg(6, { decks: 2 }), cfg(5, { emptyLeader: 'draw' }), cfg(8, { decks: 3, scoring: 'legs' })])
    it(`80 seeded games finish (${c.players} players, ${c.decks} decks, leader-out ${c.emptyLeader}, ${c.scoring})`, () => {
      for (let seed = 1; seed <= 80; seed++) { const s = run(seed, c); expect(s.history.length).toBe(c.rounds); expect(s.totals).toEqual(s.history[s.history.length - 1].totals); }
    });
});
