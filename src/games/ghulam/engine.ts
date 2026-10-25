import { Card, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState } from '../types';

/** Ghulam Chor ("thief Jack"): one Jack is removed, so one Jack can never be paired. Throw away pairs, draw blind from the next player,
 *  and whoever is left holding the lone Jack at the end loses the deal. */
export interface GhulamConfig { players: number; decks: number; rounds: number }
export const defaultConfig: GhulamConfig = { players: 4, decks: 1, rounds: 3 };
export type Action = { type: 'draw'; index: number };
export type Act = { k: 'draw'; pair: number | null } | { k: 'lost' } | { k: 'safe' } | null;
export interface RoundResult { round: number; loser: number; points: number[]; totals: number[]; pairs: number[] }
export interface State extends BaseState {
  config: GhulamConfig; seed: number; history: RoundResult[]; pairs: number[]; acts: Act[]; draws: number; victim: number; loser: number | null;
}
/** The deck: every card of every deck except one Jack of clubs. */
export const makeDeck = (decks: number): Card[] => { const d = Array.from({ length: decks }).flatMap(() => standardDeck()), i = d.findIndex(c => c.suit === 3 && c.rank === 11); d.splice(i, 1); return d; };
/** Throw away pairs of equal rank; what remains has at most one card per rank. */
export function discardPairs(hand: Card[]): { hand: Card[]; pairs: number } {
  const by = new Map<number, Card[]>(); for (const c of hand) by.set(c.rank, [...(by.get(c.rank) ?? []), c]);
  let pairs = 0; const keep: Card[] = [];
  for (const cs of by.values()) { pairs += Math.floor(cs.length / 2); if (cs.length % 2) keep.push(cs[0]); }
  return { hand: sortHand(keep), pairs };
}
const nextWithCards = (hands: Card[][], from: number): number => { const n = hands.length; for (let i = 1; i <= n; i++) { const q = (from + i) % n; if (hands[q].length) return q; } return -1; };

function deal(s: State): State {
  const n = s.config.players, deck = shuffle(makeDeck(s.config.decks), makeRng(s.seed * 1187 + s.round * 3203));
  const raw: Card[][] = Array.from({ length: n }, () => []); deck.forEach((c, i) => raw[i % n].push(c));
  const res = raw.map(discardPairs), hands = res.map(r => r.hand), first = nextWithCards(hands, s.dealer);
  return { ...s, hands, handSizes: hands.map(h => h.length), pairs: res.map(r => r.pairs), acts: Array(n).fill(null), draws: 0, loser: null, phase: 'playing', trick: [], lastTrick: null,
    turn: first, victim: nextWithCards(hands, first) };
}
export function create(config: GhulamConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    pairs: [], acts: [], draws: 0, victim: 0, loser: null });
}
/** You draw one face-down card from the next player who still has cards. */
export const legalActions = (s: State, seat: number): Action[] => (seat === s.turn && s.phase === 'playing' ? s.hands[s.victim].map((_, index) => ({ type: 'draw' as const, index })) : []);
export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn || s.phase !== 'playing') throw new Error(`Not seat ${seat}'s turn`);
  const n = s.config.players, vh = s.hands[s.victim];
  if (a.type !== 'draw' || !Number.isInteger(a.index) || a.index < 0 || a.index >= vh.length) throw new Error('Illegal draw');
  const card = vh[a.index], victimHand = shuffle(vh.filter((_, i) => i !== a.index), makeRng(s.seed * 977 + s.round * 131 + s.draws)); // the victim re-shuffles so positions give nothing away
  const mine = [...s.hands[seat]], match = mine.findIndex(c => c.rank === card.rank), pairs = [...s.pairs], acts = [...s.acts];
  if (match >= 0) { mine.splice(match, 1); pairs[seat]++; } else mine.push(card);
  const hands = s.hands.map(h => [...h]); hands[seat] = sortHand(mine); hands[s.victim] = victimHand;
  acts[seat] = { k: 'draw', pair: match >= 0 ? card.rank : null }; acts[s.victim] = { k: 'lost' };
  if (!hands[seat].length) acts[seat] = { k: 'safe' }; if (!hands[s.victim].length) acts[s.victim] = { k: 'safe' };
  const holders = hands.map((h, i) => (h.length ? i : -1)).filter(i => i >= 0), st = { ...s, hands, handSizes: hands.map(h => h.length), pairs, acts, draws: s.draws + 1 };
  if (holders.length <= 1) return endRound(st, holders[0] ?? seat);
  const turn = nextWithCards(hands, seat);
  return { ...st, turn, victim: nextWithCards(hands, turn) };
}
function endRound(s: State, loser: number): State {
  const n = s.config.players, points = Array(n).fill(0); points[loser] = 1; const totals = s.totals.map((t, i) => t + points[i]);
  return { ...s, loser, totals, history: [...s.history, { round: s.round + 1, loser, points, totals, pairs: s.pairs }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])) });
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
