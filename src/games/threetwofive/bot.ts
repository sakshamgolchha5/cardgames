import type { Card, Suit } from '../../engine/cards';
import { sameCard } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, legalPlays, trickWinner } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat], pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  if (v.phase === 'trump') {
    const held = ([0, 1, 2, 3] as Suit[]).filter(s => hand.some(c => c.suit === s));
    if (level === 'easy') return { type: 'trump', suit: pick(held) };
    const score = (s: Suit) => hand.filter(c => c.suit === s).reduce((a, c) => a + 12 + c.rank, 0);
    return { type: 'trump', suit: held.sort((a, b) => score(b) - score(a))[0] };
  }
  if (v.phase === 'exchange') {
    if (level === 'easy') return { type: 'give', card: pick(hand) };
    const worth = (c: Card) => (c.suit === v.trump ? 100 : 0) + c.rank + (c.rank === 7 && v.config.sevensTop ? 200 : 0);
    return { type: 'give', card: [...hand].sort((a, b) => worth(a) - worth(b))[0] }; // give back the weakest card
  }
  const plays = legalPlays(v, seat);
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: pick(plays) };
  const asc = [...plays].sort((a, b) => a.rank - b.rank), cheap = asc.find(c => c.suit !== v.trump) ?? asc[0];
  const unseenHigher = (c: Card) => { let n = 0; for (let r = c.rank + 1; r <= 14; r++) { const x = { suit: c.suit, rank: r }; if (!hand.some(h => sameCard(h, x)) && !v.played.some(p => sameCard(p, x)) && (r > 7 || (r === 7 && (c.suit === 0 || c.suit === 1)))) n++; } return n; };
  if (!v.trick.length) {
    const masters = asc.filter(c => (level === 'hard' ? unseenHigher(c) === 0 : c.rank === 14)).sort((a, b) => (a.suit === v.trump ? 1 : 0) - (b.suit === v.trump ? 1 : 0));
    return { type: 'play', card: masters[0] ?? cheap };
  }
  const wins = (c: Card) => trickWinner([...v.trick, { seat, card: c }], v.trump, v.config.sevensTop).seat === seat;
  return { type: 'play', card: asc.find(wins) ?? cheap }; // every trick counts: win with the cheapest winning card, else dump a low card
}
