import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState } from '../types';

/** start: which 7 opens the game (hearts = traditional Satte Pe Satta).  scoring: penalty by card values or by number of cards left. */
export interface SevenConfig { players: number; start: 'hearts' | 'diamonds'; scoring: 'pips' | 'count'; rounds: number }
export const defaultConfig: SevenConfig = { players: 4, start: 'hearts', scoring: 'pips', rounds: 3 };
export type Action = { type: 'play'; card: Card } | { type: 'skip' };
export type Row = { low: number; high: number } | null;
export type Act = { k: 'play'; card: Card } | { k: 'skip' } | null;
export interface RoundResult { round: number; winner: number; points: number[]; left: number[]; totals: number[] }
export interface State extends BaseState { config: SevenConfig; seed: number; history: RoundResult[]; rows: Row[]; lastCard: Card | null; acts: Act[]; starter: number }

/** Ace counts 1, 2-10 face value, J/Q/K 10 (the most common penalty scale). */
export const pips = (c: Card) => (c.rank === 14 ? 1 : c.rank >= 11 ? 10 : c.rank);
const startSuit = (c: SevenConfig) => (c.start === 'hearts' ? 1 : 2);

function deal(s: State): State {
  const n = s.config.players, deck = shuffle(standardDeck(), makeRng(s.seed * 1151 + s.round * 2539));
  const hands: Card[][] = Array.from({ length: n }, () => []); deck.forEach((c, i) => hands[i % n].push(c)); // everything is dealt; some players may hold one more card
  const starter = hands.findIndex(h => h.some(c => c.suit === startSuit(s.config) && c.rank === 7));
  return { ...s, hands: hands.map(sortHand), handSizes: hands.map(h => h.length), starter, turn: starter, phase: 'playing', trick: [], lastTrick: null, rows: [null, null, null, null], lastCard: null, acts: Array(n).fill(null) };
}
export function create(config: SevenConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [], rows: [], lastCard: null, acts: [], starter: 0 });
}
/** Cards you may play now. Until the opening 7 is down, only that 7 is legal; afterwards a 7 starts a new row, or extend a row by one up or down. */
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat], first = startSuit(s.config);
  if (s.rows[first] === null) return hand.filter(c => c.suit === first && c.rank === 7);
  return hand.filter(c => { const r = s.rows[c.suit]; return r === null ? c.rank === 7 : c.rank === r.low - 1 || c.rank === r.high + 1; });
}
/** You must play if you can; you may pass only when no card is playable. */
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn || s.phase !== 'playing') return [];
  const plays = legalPlays(s, seat); return plays.length ? plays.map(card => ({ type: 'play' as const, card })) : [{ type: 'skip' }];
}
export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn || s.phase !== 'playing') throw new Error(`Not seat ${seat}'s turn`);
  const n = s.config.players, acts = [...s.acts];
  if (a.type === 'skip') {
    if (legalPlays(s, seat).length) throw new Error('You must play when you can');
    acts[seat] = { k: 'skip' }; return { ...s, acts, turn: (seat + 1) % n };
  }
  if (!legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const rows = [...s.rows], r = rows[a.card.suit];
  rows[a.card.suit] = r === null ? { low: 7, high: 7 } : a.card.rank < r.low ? { low: a.card.rank, high: r.high } : { low: r.low, high: a.card.rank };
  acts[seat] = { k: 'play', card: a.card };
  const st: State = { ...s, hands, handSizes: hands.map(h => h.length), rows, lastCard: a.card, acts, turn: (seat + 1) % n };
  return hands[seat].length === 0 ? endRound(st, seat) : st;
}
function endRound(s: State, winner: number): State {
  const left = s.hands.map(h => h.length), points = s.hands.map(h => (s.config.scoring === 'count' ? h.length : h.reduce((a, c) => a + pips(c), 0)));
  const totals = s.totals.map((t, i) => t + points[i]);
  return { ...s, totals, history: [...s.history, { round: s.round + 1, winner, points, left, totals }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])) });
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
