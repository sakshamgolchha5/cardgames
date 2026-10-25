import { Card, sameCard } from '../../engine/cards';
import { Action, State, currentWinner, legalActions, MAX_BID } from './engine';

export type Level = 'easy' | 'medium' | 'hard';
const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)];

function strength(hand: Card[]): number {
  let s = 0;
  for (let suit = 0; suit < 4; suit++) {
    const cs = hand.filter(c => c.suit === suit), has = (r: number) => cs.some(c => c.rank === r);
    if (suit === 0) { s += (has(14) ? 1 : 0) + (has(13) ? 0.9 : 0) + (has(12) && cs.length >= 3 ? 0.7 : 0) + Math.max(0, cs.length - 4) * 0.6; }
    else { s += (has(14) ? 0.9 : 0) + (has(13) && cs.length >= 2 ? 0.6 : 0) + (cs.length === 0 ? 0.4 : 0); }
  }
  return s;
}
/** Cards of the same suit that outrank `c` and are still unseen (not in own hand, not yet played). */
function higherUnseen(c: Card, hand: Card[], played: Card[]): number {
  let n = 0;
  for (let r = c.rank + 1; r <= 14; r++) { const x = { suit: c.suit, rank: r }; if (!hand.some(h => sameCard(h, x)) && !played.some(p => sameCard(p, x))) n++; }
  return n;
}

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const legal = legalActions(v, seat);
  if (!legal.length) throw new Error('No legal action');
  if (level === 'easy') return pick(legal, rng);
  if (v.phase === 'bidding') {
    const noise = level === 'medium' ? (rng() - 0.5) : 0;
    return { type: 'bid', n: Math.max(1, Math.min(MAX_BID, Math.round(strength(v.hands[seat]) + noise))) };
  }
  const plays = legal.filter((a): a is { type: 'play'; card: Card } => a.type === 'play').map(a => a.card);
  const need = (v.bids[seat] ?? 1) - v.won[seat], asc = [...plays].sort((a, b) => a.rank - b.rank);
  const lowNonTrump = asc.find(c => c.suit !== 0) ?? asc[0];
  const card = (() => {
    if (!v.trick.length) {
      if (need > 0) {
        const nt = plays.filter(c => c.suit !== 0);
        const masters = level === 'hard' ? nt.filter(c => higherUnseen(c, v.hands[seat], v.played) === 0) : [];
        if (masters.length) return masters[0];
        const top = [...(nt.length ? nt : plays)].sort((a, b) => b.rank - a.rank)[0];
        return level === 'hard' && higherUnseen(top, v.hands[seat], v.played) > 2 && asc.length > 1 ? lowNonTrump : top;
      }
      return lowNonTrump;
    }
    const w = currentWinner(v.trick).card;
    const beats = (c: Card) => c.suit === w.suit ? c.rank > w.rank : c.suit === 0;
    const winning = asc.filter(beats), losing = asc.filter(c => !beats(c));
    if (need > 0 && winning.length) return winning[0];
    return losing.length ? losing[0] : asc[0];
  })();
  return { type: 'play', card };
}
