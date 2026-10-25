import type { Card } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, byPower, eff, legalSets, power } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat];
  if (v.phase === 'exchange') return { type: 'return', cards: byPower(hand).slice(0, v.xchg!.count) }; // give back your worst cards
  const sets = legalSets(v, seat), count = (r: number) => hand.filter(c => c.rank === r).length;
  const skipOk = !!v.table;
  if (!sets.length) return { type: 'skip' };
  if (level === 'easy') { if (skipOk && rng() < 0.25) return { type: 'skip' }; return { type: 'set', cards: sets[Math.floor(rng() * sets.length)] }; }
  const cost = (cs: Card[]) => {   // lower = better to play now: spend low cards first, keep 2s and aces, and do not break up bigger sets when a single is enough
    const r = cs[0].rank; let c = eff(r, v.rev) * 2 - cs.length * 1.5;
    if (level === 'hard' && count(r) > cs.length) c += 4 * (count(r) - cs.length);
    return c;
  };
  const best = [...sets].sort((a, b) => cost(a) - cost(b))[0], top = eff(best[0].rank, v.rev) >= 14;
  const nearEnd = hand.length <= 3 || v.handSizes.some((h, i) => i !== seat && h > 0 && h <= 2);
  if (skipOk && top && !nearEnd && hand.length > 4) return { type: 'skip' };   // do not waste a 2 or an ace early
  return { type: 'set', cards: best };
}
export { power };
