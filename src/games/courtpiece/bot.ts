import type { Card, Suit } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, legalPlays, trickWinner } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat];
  if (v.phase === 'trump') {
    const held = ([0, 1, 2, 3] as Suit[]).filter(s => hand.some(c => c.suit === s));
    if (level === 'easy') return { type: 'trump', suit: held[Math.floor(rng() * held.length)] };
    const score = (s: Suit) => hand.filter(c => c.suit === s).reduce((a, c) => a + 10 + c.rank, 0);
    return { type: 'trump', suit: held.sort((a, b) => score(b) - score(a))[0] };
  }
  const plays = legalPlays(v, seat);
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: plays[Math.floor(rng() * plays.length)] };
  const asc = [...plays].sort((a, b) => a.rank - b.rank), nonTrump = asc.filter(c => c.suit !== v.trump), cheap = nonTrump[0] ?? asc[0];
  if (!v.trick.length) {
    const aces = nonTrump.filter(c => c.rank === 14);
    return { type: 'play', card: aces[0] ?? (level === 'hard' && v.trump !== null && asc.some(c => c.suit === v.trump && c.rank >= 13) && v.trick.length === 0 && v.played.length > 8 ? asc[asc.length - 1] : cheap) };
  }
  const led = v.trick[0].card.suit, w = trickWinner(v.trick, v.trump), partner = (seat + 2) % 4;
  const wins = (c: Card) => trickWinner([...v.trick, { seat, card: c }], v.trump ?? (c.suit !== led ? c.suit : null)).seat === seat;
  if (w.seat === partner && (v.trick.length === 3 || w.card.rank >= 13 || w.card.suit === v.trump)) return { type: 'play', card: cheap };
  const winning = asc.filter(wins);
  return { type: 'play', card: winning[0] ?? cheap };
}
