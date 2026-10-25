import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState } from '../types';

/** declare: whoever starts a round names the rank; everyone after must claim that same rank until the round ends.
 *  sequence: the claimed rank climbs A,2,3...K,A... by one on every play. */
export interface BluffConfig { players: number; decks: number; rankMode: 'declare' | 'sequence'; perTurn: 'any' | 'one'; rounds: number }
export const defaultConfig: BluffConfig = { players: 4, decks: 1, rankMode: 'declare', perTurn: 'any', rounds: 3 };
export type Action = { type: 'claim'; cards: Card[]; rank: number } | { type: 'call' } | { type: 'skip' };
export type Event = { k: 'claim'; seat: number; count: number; rank: number } | { k: 'call'; seat: number; target: number; liar: boolean; taker: number; count: number }
  | { k: 'skip'; seat: number } | { k: 'clear'; count: number } | null;
export interface RoundResult { round: number; winner: number; points: number[]; totals: number[]; pickups: number[] }
export type Act = { k: 'claim'; count: number; rank: number } | { k: 'skip' } | { k: 'call' } | null;
export interface LastPlay { seat: number; count: number; rank: number; cards: Card[] }
export interface State extends BaseState {
  config: BluffConfig; seed: number; history: RoundResult[];
  pile: Card[]; pileCount: number; discarded: number; lastPlay: LastPlay | null; rank: number | null; seq: number;
  passed: boolean[]; streak: number; expect: number | null; pickups: number[]; event: Event; acts: Act[];
}
const seqRank = (i: number) => (i % 13 === 0 ? 14 : (i % 13) + 1);
const allowed = (s: State): number | null => (s.config.rankMode === 'sequence' ? seqRank(s.seq) : s.lastPlay ? s.rank : null);
const refresh = (s: State): State => ({ ...s, handSizes: s.hands.map(h => h.length), pileCount: s.pile.length, expect: allowed(s) });

function deal(s: State): State {
  const n = s.config.players, deck = shuffle(Array.from({ length: s.config.decks }).flatMap(() => standardDeck()), makeRng(s.seed * 1129 + s.round * 2971));
  const hands: Card[][] = Array.from({ length: n }, () => []); deck.forEach((c, i) => hands[i % n].push(c));
  const starter = (s.dealer + 1) % n;
  return refresh({ ...s, hands: hands.map(sortHand), turn: starter, phase: 'playing', trick: [], lastTrick: null, pile: [], discarded: 0, lastPlay: null, rank: null, passed: Array(n).fill(false), streak: 0, pickups: Array(n).fill(0), event: null, acts: Array(n).fill(null) });
}
export function create(config: BluffConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    pile: [], pileCount: 0, discarded: 0, lastPlay: null, rank: null, seq: 0, passed: [], streak: 0, expect: null, pickups: [], event: null, acts: [] });
}
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn || s.phase !== 'playing') return [];
  const acts: Action[] = [], lp = s.lastPlay, finishing = !!lp && s.handSizes[lp.seat] === 0; // handSizes (not hands) so a player's private view gives the same answer
  if (!finishing && !(s.config.rankMode === 'declare' && s.passed[seat])) {
    if (s.expect !== null) acts.push({ type: 'claim', cards: [], rank: s.expect });
    else for (let r = 2; r <= 14; r++) acts.push({ type: 'claim', cards: [], rank: r }); // round starter may name any rank
  }
  if (lp && lp.seat !== seat) acts.push({ type: 'call' });
  if (lp && lp.seat !== seat) acts.push({ type: 'skip' });
  return acts;
}
function endRound(s: State, winner: number): State {
  const n = s.config.players, points = Array(n).fill(0); points[winner] = 1;
  const totals = s.totals.map((t, i) => t + points[i]);
  return { ...s, totals, history: [...s.history, { round: s.round + 1, winner, points, totals, pickups: s.pickups }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn || s.phase !== 'playing') throw new Error(`Not seat ${seat}'s turn`);
  const n = s.config.players, ok = legalActions(s, seat);
  if (a.type === 'claim') {
    if (!ok.some(l => l.type === 'claim' && l.rank === a.rank) || a.cards.length < 1 || (s.config.perTurn === 'one' && a.cards.length !== 1)) throw new Error('Illegal claim');
    const hand = [...s.hands[seat]];
    for (const c of a.cards) { const i = hand.findIndex(h => sameCard(h, c)); if (i < 0) throw new Error('Card not in hand'); hand.splice(i, 1); } // one copy per card (several decks)
    const hands = s.hands.map((h, i) => (i === seat ? hand : h));
    return refresh({ ...s, hands, pile: [...s.pile, ...a.cards], lastPlay: { seat, count: a.cards.length, rank: a.rank, cards: a.cards }, rank: a.rank, seq: s.seq + 1, streak: 0,
      event: { k: 'claim', seat, count: a.cards.length, rank: a.rank }, acts: s.acts.map((x, i) => (i === seat ? { k: 'claim' as const, count: a.cards.length, rank: a.rank } : x)), turn: (seat + 1) % n });
  }
  const lp = s.lastPlay!;
  if (a.type === 'call') {
    if (!ok.some(l => l.type === 'call')) throw new Error('Nothing to call');
    const truth = lp.cards.every(c => c.rank === lp.rank), loser = truth ? seat : lp.seat, winner = truth ? lp.seat : seat;
    const hands = s.hands.map(h => [...h]); hands[loser] = sortHand([...hands[loser], ...s.pile]);
    const pickups = [...s.pickups]; pickups[loser] += s.pile.length;
    const base = refresh({ ...s, acts: s.acts.map((_, i) => (i === seat ? { k: 'call' as const } : null)), hands, pile: [], lastPlay: null, rank: null, passed: Array(n).fill(false), streak: 0, pickups, turn: winner,
      lastTrick: { cards: lp.cards.map(card => ({ seat: lp.seat, card })), winner }, event: { k: 'call', seat, target: lp.seat, liar: !truth, taker: loser, count: s.pile.length } });
    return truth && hands[lp.seat].length === 0 ? endRound(base, lp.seat) : base;
  }
  if (!ok.some(l => l.type === 'skip')) throw new Error('Cannot skip now');
  if (s.handSizes[lp.seat] === 0) return endRound(refresh({ ...s, event: { k: 'skip', seat } }), lp.seat); // nobody called the last cards: that player is out first
  const streak = s.streak + 1, passed = [...s.passed]; passed[seat] = true;
  if (streak >= n - 1) return refresh({ ...s, acts: Array(n).fill(null), passed: Array(n).fill(false), streak: 0, discarded: s.discarded + s.pile.length, pile: [], lastPlay: null, rank: null, turn: lp.seat, event: { k: 'clear', count: s.pile.length } });
  return refresh({ ...s, passed, streak, acts: s.acts.map((x, i) => (i === seat ? { k: 'skip' as const } : x)), turn: (seat + 1) % n, event: { k: 'skip', seat } });
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
/** Players never see the pile or another player's last cards - only how many and what was claimed. */
export const view = (s: State, seat: number): State => ({
  ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), pile: [], lastPlay: s.lastPlay ? { ...s.lastPlay, cards: s.lastPlay.seat === seat ? s.lastPlay.cards : [] } : null,
});
export const winners = (s: State) => { const m = Math.max(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
