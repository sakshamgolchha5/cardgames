import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

export interface ConfConfig { players: number; decks: number; lastBidRule: boolean }
export const defaultConfig: ConfConfig = { players: 8, decks: 2, lastBidRule: true };
export type Action = { type: 'bid'; n: number } | { type: 'play'; card: Card };
export interface RoundResult { round: number; size: number; bids: number[]; won: number[]; points: number[]; totals: number[] }
export interface State extends BaseState {
  config: ConfConfig; seed: number; history: RoundResult[]; sz: number; bids: (number | null)[]; won: number[]; leader: number; played: Card[];
}
/** First round deals this many cards each (max 8); every round after deals one fewer, down to a single card. */
export const startSize = (c: ConfConfig) => Math.min(8, Math.floor((52 * c.decks) / c.players));
export const roundCount = startSize;

function deal(s: State): State {
  const n = s.config.players, sz = startSize(s.config) - s.round, deck = shuffle(Array.from({ length: s.config.decks }).flatMap(() => standardDeck()), makeRng(s.seed * 1103 + s.round * 3571));
  const hands = Array.from({ length: n }, (_, i) => sortHand(deck.slice(i * sz, (i + 1) * sz))), leader = (s.dealer + 1) % n;
  return { ...s, sz, hands, handSizes: hands.map(h => h.length), leader, turn: leader, phase: 'bidding', bids: Array(n).fill(null), won: Array(n).fill(0), trick: [], lastTrick: null, played: [] };
}
export function create(config: ConfConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'bidding', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    sz: 0, bids: [], won: [], leader: 0, played: [] });
}
/** Hearts always trump. Highest heart wins, else highest of the led suit. With two decks, if equal cards tie the first one played wins. */
export function trickWinner(t: Trick[]): Trick {
  const h = t.filter(x => x.card.suit === 1), pool = h.length ? h : t.filter(x => x.card.suit === t[0].card.suit);
  return pool.reduce((a, b) => (b.card.rank > a.card.rank ? b : a));
}
/** The dealer bids last and may not make the total of all bids equal the number of tricks. */
export const forbiddenBid = (s: State, seat: number): number => (s.config.lastBidRule && seat === s.dealer ? s.sz - s.bids.reduce<number>((a, b) => a + (b ?? 0), 0) : -1);
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat]; if (!s.trick.length) return hand;
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit); return follow.length ? follow : hand;
}
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn) return [];
  if (s.phase === 'bidding') { const bad = forbiddenBid(s, seat); return Array.from({ length: s.sz + 1 }, (_, n) => n).filter(n => n !== bad).map(n => ({ type: 'bid' as const, n })); }
  return s.phase === 'playing' ? legalPlays(s, seat).map(card => ({ type: 'play' as const, card })) : [];
}
export const scoreOf = (bid: number, won: number) => (won === bid ? bid * 10 + 10 : -10 * Math.max(bid, 1));

export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn) throw new Error(`Not seat ${seat}'s turn`);
  const n = s.config.players;
  if (a.type === 'bid') {
    if (s.phase !== 'bidding' || !legalActions(s, seat).some(l => l.type === 'bid' && l.n === a.n)) throw new Error('Illegal bid');
    const bids = [...s.bids]; bids[seat] = a.n; const done = bids.every(b => b !== null);
    return { ...s, bids, phase: done ? 'playing' : 'bidding', turn: done ? s.leader : (seat + 1) % n };
  }
  if (s.phase !== 'playing' || !legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]), at = hands[seat].findIndex(c => sameCard(c, a.card)); hands[seat].splice(at, 1); // remove ONE copy: with several decks a hand can hold identical cards
  const trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card], st = { ...s, hands, handSizes: hands.map(h => h.length), trick, played };
  if (trick.length < n) return { ...st, turn: (seat + 1) % n };
  const winner = trickWinner(trick).seat, won = [...s.won]; won[winner]++;
  const next: State = { ...st, trick: [], lastTrick: { cards: trick, winner }, won, leader: winner, turn: winner };
  return hands[0].length ? next : endRound(next);
}
function endRound(s: State): State {
  const bids = s.bids as number[], points = bids.map((b, i) => scoreOf(b, s.won[i])), totals = s.totals.map((t, i) => t + points[i]);
  const history = [...s.history, { round: s.round + 1, size: s.sz, bids, won: s.won, points, totals }];
  return { ...s, totals, history, phase: s.round + 1 >= roundCount(s.config) ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])) });
export const winners = (s: State) => { const m = Math.max(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
