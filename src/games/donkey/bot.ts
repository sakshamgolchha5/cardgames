import type { Card } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, legalPlays } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const plays = legalPlays(v, seat);
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: plays[Math.floor(rng() * plays.length)] };
  const asc = [...plays].sort((a, b) => a.rank - b.rank), hand = v.hands[seat], cnt = (s: number) => hand.filter(c => c.suit === s).length;
  const play = (card: Card): Action => ({ type: 'play', card });
  if (!v.trick.length) {   // lead from your shortest suit: it gets you void, so you can cut later
    const small = hand.length <= 2 && level === 'hard';
    return play([...asc].sort((a, b) => cnt(a.suit) - cnt(b.suit) || (small ? b.rank - a.rank : a.rank - b.rank))[0]);
  }
  const led = v.trick[0].card.suit, follow = asc.filter(c => c.suit === led);
  if (!follow.length) return play(asc[asc.length - 1]);            // cutting: throw away your highest card, and make someone else pick up
  const top = Math.max(...v.trick.filter(t => t.card.suit === led).map(t => t.card.rank)), under = follow.filter(c => c.rank < top);
  return play(under.length ? under[under.length - 1] : follow[0]);  // stay under the highest card if you can, otherwise go as low as possible
}
