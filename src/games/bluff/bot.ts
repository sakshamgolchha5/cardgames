import type { Card } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, legalActions } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const hand = v.hands[seat], legal = legalActions(v, seat), lp = v.lastPlay, total = 4 * v.config.decks;
  const claims = legal.filter(a => a.type === 'claim') as Extract<Action, { type: 'claim' }>[], canCall = legal.some(a => a.type === 'call');
  if (canCall && lp) {
    const have = hand.filter(c => c.rank === lp.rank).length, finishing = v.handSizes[lp.seat] === 0;
    if (have + lp.count > total) return { type: 'call' };                          // more of that rank than exist: certain bluff
    const p = finishing ? (level === 'easy' ? 0.4 : 0.85) : level === 'easy' ? 0.1 : (0.08 + 0.12 * (lp.count - 1) + 0.07 * have + (v.handSizes[lp.seat] <= 2 ? 0.15 : 0)) * (level === 'hard' ? 1.15 : 1);
    if (rng() < p) return { type: 'call' };
  }
  if (!claims.length) return { type: 'skip' };
  const count = (r: number) => hand.filter(c => c.rank === r).length;
  const rank = claims.length === 1 ? claims[0].rank : [...claims].sort((a, b) => count(b.rank) - count(a.rank) || rng() - 0.5)[0].rank;
  const mine = hand.filter(c => c.rank === rank), canSkip = legal.some(a => a.type === 'skip');
  if (mine.length) return { type: 'claim', rank, cards: v.config.perTurn === 'one' || level === 'easy' ? [mine[0]] : mine };
  const bluffP = level === 'easy' ? 0.55 : level === 'medium' ? 0.4 : Math.max(0.12, 0.55 - v.pileCount * 0.025 - (hand.length <= 3 ? 0.15 : 0));
  if (canSkip && rng() > bluffP) return { type: 'skip' };
  const singles = [...hand].sort((a, b) => count(a.rank) - count(b.rank) || a.rank - b.rank) as Card[];   // throw away cards you hold least of
  const k = v.config.perTurn === 'one' ? 1 : 1 + (rng() < 0.3 && hand.length > 4 ? 1 : 0);
  return { type: 'claim', rank, cards: singles.slice(0, k) };
}
