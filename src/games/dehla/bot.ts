import type { Card, Suit } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, canAsk, legalPlays, trickWinner } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat], suits = [0, 1, 2, 3] as Suit[], strength = (s: Suit) => hand.filter(c => c.suit === s).reduce((a, c) => a + 20 + c.rank, 0);
  if (v.phase === 'trump') {
    if (v.config.trumpMode === 'band') {
      if (level === 'easy') return { type: 'hide', card: hand[Math.floor(rng() * hand.length)] };
      const best = [...suits].sort((a, b) => strength(b) - strength(a))[0], mine = hand.filter(c => c.suit === best).sort((a, b) => a.rank - b.rank);
      return { type: 'hide', card: mine[0] ?? hand[0] }; // hide the weakest card of the strongest suit
    }
    const held = suits.filter(s => hand.some(c => c.suit === s));
    return { type: 'trump', suit: level === 'easy' ? held[Math.floor(rng() * held.length)] : held.sort((a, b) => strength(b) - strength(a))[0] };
  }
  const plays = legalPlays(v, seat), w = v.trick.length ? trickWinner(v.trick, v.trump) : null;
  const partnerWin = !!w && w.seat === (seat + 2) % 4, tensIn = v.trick.filter(t => t.card.rank === 10).length;
  if (canAsk(v, seat) && (level === 'easy' ? rng() < 0.5 : (tensIn > 0 || !partnerWin) && rng() < 0.8)) return { type: 'ask' };
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: plays[Math.floor(rng() * plays.length)] };
  const asc = [...plays].sort((a, b) => a.rank - b.rank), tens = asc.filter(c => c.rank === 10), nonTen = asc.filter(c => c.rank !== 10), low = nonTen[0] ?? asc[0];
  if (!v.trick.length) { const aces = asc.filter(c => c.rank === 14 && c.suit !== v.trump); return { type: 'play', card: aces[0] ?? nonTen.filter(c => c.suit !== v.trump)[0] ?? low }; }
  const led = v.trick[0].card.suit, last = v.trick.length === 3;
  const wins = (c: Card) => trickWinner([...v.trick, { seat, card: c }], v.trump ?? (v.config.trumpMode === 'cut' && c.suit !== led ? c.suit : null)).seat === seat;
  if (partnerWin) return { type: 'play', card: (last || w!.card.rank >= 13 || w!.card.suit === v.trump) && tens.length ? tens[0] : low }; // feed tens to partner
  const winning = asc.filter(wins);
  if (winning.length && (tensIn > 0 || (level === 'hard' && last))) return { type: 'play', card: winning[0] };
  return { type: 'play', card: low };
}
