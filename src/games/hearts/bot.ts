import { Card, shuffle } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, cardPts, isQS, legalPlays, trickWinner } from './engine';

const hi = (a: Card[]) => a.reduce((x, y) => (y.rank > x.rank ? y : x));
const lo = (a: Card[]) => a.reduce((x, y) => (y.rank < x.rank ? y : x));

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat];
  if (v.phase === 'passing') {
    if (level === 'easy') return { type: 'pass', cards: shuffle(hand, rng).slice(0, v.passCount) };
    const spades = hand.filter(c => c.suit === 0).length, cnt = (s: number) => hand.filter(c => c.suit === s).length;
    const risk = (c: Card) => {
      let r = c.rank;
      if (isQS(c)) r += spades <= 5 ? 100 : 30;
      if (c.suit === 0 && c.rank >= 13 && spades <= 5 && !hand.some(isQS)) r += 40;
      if (c.suit === 1) r += c.rank * 0.8 + 6;
      if (level === 'hard' && c.suit !== 1 && c.suit !== 0 && cnt(c.suit) <= 2) r += 12;
      return r;
    };
    return { type: 'pass', cards: [...hand].sort((a, b) => risk(b) - risk(a)).slice(0, v.passCount) };
  }
  const plays = legalPlays(v, seat);
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: plays[Math.floor(rng() * plays.length)] };
  const holdsQS = hand.some(isQS);
  if (!v.trick.length) {
    const flush = level === 'hard' && !holdsQS && !v.played.some(isQS) && !hand.some(c => c.suit === 0 && c.rank >= 12);
    const cost = (c: Card) => c.rank + (c.suit === 0 && holdsQS && c.rank < 12 ? 25 : 0) + (c.suit === 1 ? 12 : 0) - (flush && c.suit === 0 ? 30 : 0);
    return { type: 'play', card: [...plays].sort((a, b) => cost(a) - cost(b))[0] };
  }
  const led = v.trick[0].card.suit, w = trickWinner(v.trick).card, follow = plays.filter(c => c.suit === led);
  if (follow.length) {
    const under = follow.filter(c => c.rank < w.rank);
    if (under.length) return { type: 'play', card: hi(under) };
    const pts = v.trick.reduce((a, t) => a + cardPts(t.card, v.config), 0);
    return { type: 'play', card: v.trick.length === v.config.players - 1 || pts === 0 ? hi(follow) : lo(follow) };
  }
  const q = plays.find(isQS), hearts = plays.filter(c => c.suit === 1);
  return { type: 'play', card: q ?? (hearts.length ? hi(hearts) : hi(plays)) };
}
