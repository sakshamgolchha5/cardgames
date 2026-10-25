import type { Card } from '../../engine/cards';
import { sameCard } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, forbiddenBid, legalPlays, trickWinner } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat], n = v.config.players;
  if (v.phase === 'bidding') {
    const bad = forbiddenBid(v, seat), sz = v.sz;
    const raw = hand.reduce((a, c) => a + (c.suit === 1 ? (c.rank >= 12 ? 0.85 : c.rank >= 9 ? 0.5 : 0.25) : c.rank === 14 ? 0.55 : c.rank === 13 ? 0.3 : 0), 0) * (level === 'hard' ? 1 : 0.95);
    const noise = level === 'easy' ? (rng() - 0.5) * 3 : level === 'medium' ? (rng() - 0.5) : 0;
    let b = Math.max(0, Math.min(sz, Math.round(raw + noise)));
    if (level === 'easy' && rng() < 0.3) b = Math.floor(rng() * (sz + 1));
    if (b === bad) b = Math.abs(raw - (b + 1)) < Math.abs(raw - (b - 1)) && b + 1 <= sz || b === 0 ? b + 1 : b - 1;
    if (b < 0 || b > sz) b = b < 0 ? 1 : sz - 1;
    return { type: 'bid', n: b === bad ? (b === 0 ? 1 : b - 1) : b };
  }
  const plays = legalPlays(v, seat), pick = () => plays[Math.floor(rng() * plays.length)];
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: pick() };
  const need = (v.bids[seat] ?? 0) - v.won[seat], asc = [...plays].sort((a, b) => a.rank - b.rank);
  const lowNonTrump = asc.find(c => c.suit !== 1) ?? asc[0], decks = v.config.decks;
  const unseenHigher = (c: Card) => { let k = 0; for (let r = c.rank + 1; r <= 14; r++) { const seen = hand.filter(h => sameCard(h, { suit: c.suit, rank: r })).length + v.played.filter(p => sameCard(p, { suit: c.suit, rank: r })).length; k += Math.max(0, decks - seen); } return k; };
  if (!v.trick.length) {
    if (need > 0) {
      const strong = [...asc].reverse().filter(c => c.suit !== 1 && (level === 'hard' ? unseenHigher(c) === 0 : c.rank >= 13));
      return { type: 'play', card: strong[0] ?? (level === 'hard' ? asc[asc.length - 1] : asc[asc.length - 1]) };
    }
    return { type: 'play', card: lowNonTrump };
  }
  const wins = (c: Card) => trickWinner([...v.trick, { seat, card: c }]).seat === seat;
  const winning = asc.filter(wins), losing = asc.filter(c => !wins(c));
  if (need > 0) return { type: 'play', card: winning[0] ?? lowNonTrump };
  return { type: 'play', card: losing.length ? losing[losing.length - 1] : asc[0] }; // already made the bid: duck with the highest card that does not win
}
