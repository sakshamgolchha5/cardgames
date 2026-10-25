import type { Card } from '../../engine/cards';
import { sameCard } from '../../engine/cards';
import type { Level } from '../types';
import { Action, State, legalActions, pips } from './engine';

export function chooseAction(v: State, seat: number, level: Level, rng: () => number): Action {
  const legal = legalActions(v, seat), plays = legal.filter((a): a is Extract<Action, { type: 'play' }> => a.type === 'play').map(a => a.card);
  if (!plays.length) return { type: 'skip' };
  if (level === 'easy' || plays.length === 1) return { type: 'play', card: plays[Math.floor(rng() * plays.length)] };
  const hand = v.hands[seat], has = (suit: number, rank: number) => hand.some(c => sameCard(c, { suit: suit as Card['suit'], rank }));
  const score = (c: Card) => {
    // keep long chains and blocking 7s for later; get rid of high-value cards early
    const dir = c.rank >= 7 ? 1 : -1; let chain = 0; for (let r = c.rank + dir; r >= 2 && r <= 14 && has(c.suit, r); r += dir) chain++;
    const suitCount = hand.filter(h => h.suit === c.suit).length;
    let sc = chain * 3 + suitCount * 1.5 + pips(c) / 5 - (c.rank === 7 ? 4 : 0);
    if (level === 'hard') { const next = c.rank + (c.rank >= 7 ? 1 : -1); if (next >= 2 && next <= 14 && c.rank !== 7 && !has(c.suit, next)) sc -= 2; } // do not open a card for opponents when I cannot follow up
    return sc;
  };
  return { type: 'play', card: [...plays].sort((a, b) => score(b) - score(a) + (level === 'medium' ? (rng() - 0.5) * 2 : 0))[0] };
}
