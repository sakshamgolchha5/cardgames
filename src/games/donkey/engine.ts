import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

/** Donkey / Bhabhi: shed all your cards. The Ace of Spades opens. If you cannot follow suit your off-suit card ("tochoo") ends the trick at once and the
 *  player who played the highest card of the led suit must pick up every card in it. If everyone follows, the cards are thrown away and the highest card leads.
 *  emptyLeader: if the player who would lead has no cards left, 'next' = the next player leads, 'draw' = they draw a random card from the waste pile and lead it. */
export interface DonkeyConfig { players: number; decks: number; emptyLeader: 'next' | 'draw'; scoring: 'one' | 'legs'; rounds: number }
export const defaultConfig: DonkeyConfig = { players: 4, decks: 1, emptyLeader: 'next', scoring: 'one', rounds: 3 };
export type Action = { type: 'play'; card: Card };
export type Event = { k: 'pickup'; seat: number; count: number } | { k: 'discard'; leader: number; count: number } | { k: 'draw'; seat: number } | null;
export interface RoundResult { round: number; loser: number | null; points: number[]; totals: number[]; legs: number }
export interface State extends BaseState {
  config: DonkeyConfig; seed: number; history: RoundResult[]; leader: number; toPlay: number[]; waste: Card[]; wasteCount: number; trickNo: number; cut: boolean;
  event: Event; pickups: number[]; loser: number | null;
}
const order = (hands: Card[][], from: number): number[] => { const n = hands.length, out: number[] = []; for (let i = 0; i < n; i++) { const q = (from + i) % n; if (hands[q].length) out.push(q); } return out; };
const nextWithCards = (hands: Card[][], from: number) => order(hands, (from + 1) % hands.length)[0] ?? -1;

function deal(s: State): State {
  const n = s.config.players, deck = shuffle(Array.from({ length: s.config.decks }).flatMap(() => standardDeck()), makeRng(s.seed * 1213 + s.round * 3571));
  const hands: Card[][] = Array.from({ length: n }, () => []); deck.forEach((c, i) => hands[i % n].push(c));
  const sorted = hands.map(sortHand), starter = sorted.findIndex(h => h.some(c => c.suit === 0 && c.rank === 14));
  return { ...s, hands: sorted, handSizes: sorted.map(h => h.length), leader: starter, turn: starter, toPlay: order(sorted, starter), waste: [], wasteCount: 0, trickNo: 0, cut: false, trick: [], lastTrick: null,
    event: null, pickups: Array(n).fill(0), loser: null, phase: 'playing' };
}
export function create(config: DonkeyConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    leader: 0, toPlay: [], waste: [], wasteCount: 0, trickNo: 0, cut: false, event: null, pickups: [], loser: null });
}
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat];
  if (!s.trick.length) return s.trickNo === 0 ? hand.filter(c => c.suit === 0 && c.rank === 14) : hand;
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit); return follow.length ? follow : hand;
}
export const legalActions = (s: State, seat: number): Action[] => (seat === s.turn && s.phase === 'playing' ? legalPlays(s, seat).map(card => ({ type: 'play' as const, card })) : []);
/** Highest card of the led suit; with several decks the first one played wins a tie. */
export const highest = (t: Trick[]) => t.filter(x => x.card.suit === t[0].card.suit).reduce((a, b) => (b.card.rank > a.card.rank ? b : a));

export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn || s.phase !== 'playing') throw new Error(`Not seat ${seat}'s turn`);
  if (!legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]), at = hands[seat].findIndex(c => sameCard(c, a.card)); hands[seat].splice(at, 1); // one copy only (several decks)
  const trick = [...s.trick, { seat, card: a.card }], cut = s.cut || (trick.length > 1 && a.card.suit !== trick[0].card.suit);
  const st: State = { ...s, hands, handSizes: hands.map(h => h.length), trick, cut, toPlay: s.toPlay.slice(1) };
  if (s.trickNo > 0 && cut) return resolve(st, true);                 // a cut ends the trick immediately
  if (!st.toPlay.length) return resolve(st, false);
  return { ...st, turn: st.toPlay[0] };
}
function resolve(st: State, cutEnds: boolean): State {
  const hi = highest(st.trick), cards = st.trick.map(t => t.card), hands = st.hands.map(h => [...h]), pickups = [...st.pickups];
  let waste = st.waste, leader = hi.seat, event: Event, drawn = false;
  if (cutEnds) { hands[hi.seat] = sortHand([...hands[hi.seat], ...cards]); pickups[hi.seat] += cards.length; event = { k: 'pickup', seat: hi.seat, count: cards.length }; }
  else { event = { k: 'discard', leader: hi.seat, count: cards.length }; }
  const base = { ...st, hands, pickups, lastTrick: { cards: st.trick, winner: hi.seat }, trick: [], cut: false, trickNo: st.trickNo + 1 };
  const holders = hands.map((h, i) => (h.length ? i : -1)).filter(i => i >= 0);
  if (!cutEnds) waste = [...st.waste, ...cards];
  if (holders.length <= 1) return endRound({ ...base, hands, handSizes: hands.map(h => h.length), waste, wasteCount: waste.length, event }, holders[0] ?? null);
  if (!hands[leader].length) {   // the player who would lead has gone out
    if (st.config.emptyLeader === 'draw' && st.waste.length) {
      const rng = makeRng(st.seed * 31 + st.round * 17 + st.trickNo), i = Math.floor(rng() * st.waste.length); hands[leader] = [st.waste[i]];
      waste = [...st.waste.filter((_, k) => k !== i), ...cards]; drawn = true; event = { k: 'draw', seat: leader };
    } else leader = nextWithCards(hands, leader);
  }
  void drawn;
  return { ...base, hands, handSizes: hands.map(h => h.length), waste, wasteCount: waste.length, event, leader, turn: leader, toPlay: order(hands, leader) };
}
function endRound(s: State, loser: number | null): State {
  const n = s.config.players, legs = loser === null ? 0 : s.hands[loser].length, points = Array(n).fill(0);
  if (loser !== null) points[loser] = s.config.scoring === 'legs' ? Math.max(1, legs) : 1;
  const totals = s.totals.map((t, i) => t + points[i]);
  return { ...s, loser, totals, history: [...s.history, { round: s.round + 1, loser, points, totals, legs }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), waste: [] });
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
