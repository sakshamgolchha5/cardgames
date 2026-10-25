import type { Card } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, arrange, handTotal, value } from './engine';

const rk = (c: Card) => (c.rank === 14 ? 1 : c.rank);
function validSets(hand: Card[]): Card[][] {
  const out: Card[][] = [], n = Math.min(hand.length, 9);
  for (let m = 1; m < 1 << n; m++) { const cs = hand.slice(0, n).filter((_, i) => m & (1 << i)); if (arrange(cs)) out.push(cs); }
  return out;
}
export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat], total = handTotal(hand);
  if (v.step === 'discard') {
    const opp = Math.min(...v.handSizes.filter((_, i) => i !== seat && v.active[i]), 9);
    const call = total <= v.config.threshold && (level === 'easy' ? rng() < 0.5 : level === 'medium' ? total <= 5 || rng() < 0.3 : total <= 4 || opp >= 4);
    if (call) return { type: 'yaniv' };
    const sets = validSets(hand);
    if (level === 'easy') return { type: 'discard', cards: sets[Math.floor(rng() * sets.length)] };
    const best = [...sets].sort((a, b) => handTotal(b) - handTotal(a) || b.length - a.length)[0];   // throw away as many points as you can
    return { type: 'discard', cards: best };
  }
  const options = v.avail.length ? (v.avail.length > 1 ? (['first', 'last'] as const) : (['first'] as const)) : [];
  if (level === 'easy') return !options.length || rng() < 0.5 ? { type: 'drawDeck' } : { type: 'drawDiscard', end: options[Math.floor(rng() * options.length)] };
  for (const end of options) {   // take a discard if it is cheap or fits something you already hold
    const c = end === 'first' ? v.avail[0] : v.avail[v.avail.length - 1];
    const fits = hand.some(h => h.rank === c.rank) || (value(c) <= 6 && hand.some(h => h.suit === c.suit && Math.abs(rk(h) - rk(c)) === 1));
    if ((value(c) <= 3 || fits) && rng() > 0.12) return { type: 'drawDiscard', end };
  }
  return { type: 'drawDeck' };
}
