import type { Card } from '../../engine/cards';
import { sameCard } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State } from './engine';
import { showCard, solve, value } from './solver';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat];
  if (v.step === 'draw') {
    if (level === 'easy') return v.open.length && rng() < 0.4 ? { type: 'open' } : { type: 'stock' };
    const top = v.open[v.open.length - 1]; if (!top) return { type: 'stock' };
    const now = solve(hand, v.wild), with14 = solve([...hand, top], v.wild);
    const worst = with14.rest.length ? Math.max(...with14.rest.map(i => value([...hand, top][i]))) : 0;   // the card we would throw back
    return with14.deadwood - worst < now.deadwood - 2 ? { type: 'open' } : { type: 'stock' };
  }
  const i = level === 'easy' ? -1 : showCard(hand, v.wild);
  if (i >= 0) return { type: 'show', card: hand[i] };
  if (level === 'easy') return { type: 'throw', card: [...hand].sort((a, b) => value(b) - value(a))[Math.floor(rng() * 3)] };
  const s = solve(hand, v.wild), pool: Card[] = (s.rest.length ? s.rest : hand.map((_, k) => k)).map(k => hand[k]);
  return { type: 'throw', card: pool.sort((a, b) => value(b) - value(a))[0] };   // throw the most expensive card that is not in a group
}
export { sameCard };
