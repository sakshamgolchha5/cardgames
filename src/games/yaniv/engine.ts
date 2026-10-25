import { Card, deckWithJokers, isJoker, makeRng, shuffle, sortHand, sameCard } from '../../engine/cards';
import type { BaseState } from '../types';

/** Yaniv: get the lowest hand and call "Yaniv!" when it is 7 or less. Each turn you discard a card, a set (same rank) or a run (3+ in a suit), then draw from the deck
 *  or take an end card of the previous player's discard. Jokers (value 0) are wild. If someone has an equal or lower hand when you call, it is an Assaf and you take a penalty. */
export interface YanivConfig { players: number; threshold: 5 | 7; limit: 100 | 200; bonus: boolean }
export const defaultConfig: YanivConfig = { players: 4, threshold: 7, limit: 200, bonus: false };
export type Action = { type: 'discard'; cards: Card[] } | { type: 'yaniv' } | { type: 'drawDeck' } | { type: 'drawDiscard'; end: 'first' | 'last' };
export interface RoundResult { round: number; caller: number; assaf: boolean; hands: number[]; points: number[]; totals: number[] }
export interface State extends BaseState {
  config: YanivConfig; seed: number; history: RoundResult[]; step: 'discard' | 'draw'; deck: Card[]; deckCount: number; pile: Card[]; pileCount: number;
  avail: Card[]; mine: Card[]; active: boolean[]; caller: number | null; revealed: boolean; assaf: boolean; handTotals: number[]; roundPoints: number[]; turns: number; stalemate: boolean;
}
export const ASSAF_PENALTY = 30;
export const HAND = 5;
/** Safety valve (very rare in real games): after this many turns per player with nobody able to call, the lowest hand wins the round with no penalty. */
export const STALEMATE_TURNS = 40;
/** Ace 1, 2-10 face value, J/Q/K 10, Joker 0. */
export const value = (c: Card) => (isJoker(c) ? 0 : c.rank === 14 ? 1 : c.rank >= 11 ? 10 : c.rank);
export const handTotal = (h: Card[]) => h.reduce((a, c) => a + value(c), 0);
const activeSeats = (a: boolean[]) => a.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
const nextActive = (a: boolean[], from: number) => { const n = a.length; for (let i = 1; i <= n; i++) { const q = (from + i) % n; if (a[q]) return q; } return from; };

/** Puts a legal discard in table order (runs ascending, jokers filling gaps) or returns null if the cards are not a legal discard. Ace is low only. */
export function arrange(cards: Card[]): Card[] | null {
  if (cards.length === 1) return [cards[0]];
  const nj = cards.filter(c => !isJoker(c)), jokers = cards.filter(isJoker);
  if (cards.length < 2) return null;
  if (!nj.length) return [...cards];
  if (nj.every(c => c.rank === nj[0].rank)) return [...nj, ...jokers];                       // a set
  if (cards.length >= 3 && nj.every(c => c.suit === nj[0].suit)) {                           // a run
    const rk = nj.map(c => (c.rank === 14 ? 1 : c.rank)).sort((a, b) => a - b); if (new Set(rk).size !== rk.length) return null;
    const L = cards.length;
    for (let s = 1; s + L - 1 <= 13; s++) if (rk[0] >= s && rk[rk.length - 1] <= s + L - 1) {
      const out: Card[] = []; let j = 0; for (let r = s; r <= s + L - 1; r++) out.push(nj.find(c => (c.rank === 14 ? 1 : c.rank) === r) ?? jokers[j++]); return out;
    }
  }
  return null;
}
function deal(s: State): State {
  const n = s.config.players, act = activeSeats(s.active), deck = shuffle(deckWithJokers(n > 5 ? 2 : 1), makeRng(s.seed * 1423 + s.round * 6007));
  const hands: Card[][] = Array.from({ length: n }, () => []); let k = 0; for (const seat of act) { hands[seat] = sortHand(deck.slice(k, k + HAND)); k += HAND; }
  const first = nextActive(s.active, s.dealer);
  return { ...s, hands, handSizes: hands.map(h => h.length), deck: deck.slice(k), deckCount: deck.length - k, pile: [], pileCount: 0, avail: [], mine: [], step: 'discard', turn: first, phase: 'playing', caller: null, revealed: false, assaf: false,
    handTotals: Array(n).fill(0), roundPoints: Array(n).fill(0), turns: 0, stalemate: false, trick: [], lastTrick: null };
}
export function create(config: YanivConfig = defaultConfig, seed = 1): State {
  const n = config.players;
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(n).fill(0), history: [], step: 'discard', deck: [], deckCount: 0, pile: [], pileCount: 0,
    avail: [], mine: [], active: Array(n).fill(true), caller: null, revealed: false, assaf: false, handTotals: [], roundPoints: [], turns: 0, stalemate: false });
}
/** The one rule check used by bots, the screen and the engine. */
export function check(s: State, seat: number, a: Action): string | null {
  if (s.phase !== 'playing' || seat !== s.turn) return 'Not your turn';
  const hand = s.hands[seat];
  if (a.type === 'yaniv') return s.step === 'discard' && handTotal(hand) <= s.config.threshold ? null : `You need ${s.config.threshold} or less to call Yaniv`;
  if (a.type === 'discard') {
    if (s.step !== 'discard') return 'Draw a card first'; const left = [...hand];
    for (const c of a.cards) { const i = left.findIndex(h => sameCard(h, c)); if (i < 0) return 'Not in your hand'; left.splice(i, 1); }
    return arrange(a.cards) ? null : 'Not a legal discard';
  }
  if (s.step !== 'draw') return 'Discard first';
  if (a.type === 'drawDeck') return s.deck.length + s.pile.length > 0 ? null : 'The deck is empty';
  return s.avail.length ? null : 'Nothing to take';
}
export const validate = (s: State, seat: number, a: Action) => check(s, seat, a) === null;
export function legalActions(s: State, seat: number): Action[] {
  if (s.phase !== 'playing' || seat !== s.turn) return [];
  if (s.step === 'draw') { const acts: Action[] = [{ type: 'drawDeck' }]; if (s.avail.length) { acts.push({ type: 'drawDiscard', end: 'first' }); if (s.avail.length > 1) acts.push({ type: 'drawDiscard', end: 'last' }); } return acts; }
  const acts: Action[] = s.hands[seat].map(c => ({ type: 'discard' as const, cards: [c] })); if (handTotal(s.hands[seat]) <= s.config.threshold) acts.push({ type: 'yaniv' }); return acts;
}
const refresh = (s: State): State => ({ ...s, handSizes: s.hands.map(h => h.length), deckCount: s.deck.length, pileCount: s.pile.length });
function endTurn(s: State, seat: number, hands: Card[][], deck: Card[], pile: Card[]): State {
  const next = refresh({ ...s, hands, deck, pile: [...pile], avail: s.mine, mine: [], step: 'discard', turn: nextActive(s.active, seat), turns: s.turns + 1 });
  if (next.turns >= STALEMATE_TURNS * activeSeats(s.active).length) { const act = activeSeats(s.active), low = act.reduce((x, y) => (handTotal(hands[y]) < handTotal(hands[x]) ? y : x)); return callYaniv(next, low, true); }
  return next;
}
export function apply(s: State, seat: number, a: Action): State {
  const err = check(s, seat, a); if (err) throw new Error(err);
  const hands = s.hands.map(h => [...h]);
  if (a.type === 'discard') { for (const c of a.cards) hands[seat].splice(hands[seat].findIndex(h => sameCard(h, c)), 1); return refresh({ ...s, hands, mine: arrange(a.cards)!, step: 'draw' }); }
  if (a.type === 'yaniv') return callYaniv(s, seat);
  let deck = [...s.deck], pile = [...s.pile], taken: Card;
  if (a.type === 'drawDeck') { if (!deck.length) { deck = shuffle(pile, makeRng(s.seed * 71 + s.round * 13 + s.pileCount)); pile = []; } taken = deck.shift()!; pile = [...pile, ...s.avail]; }
  else { const i = a.end === 'first' ? 0 : s.avail.length - 1; taken = s.avail[i]; pile = [...pile, ...s.avail.filter((_, k) => k !== i)]; }
  hands[seat] = sortHand([...hands[seat], taken]);
  return endTurn(s, seat, hands, deck, pile);
}
function callYaniv(s: State, caller: number, forced = false): State {
  const act = activeSeats(s.active), handTotals = s.hands.map(h => handTotal(h)), c = handTotals[caller];
  const others = act.filter(q => q !== caller), low = others.length ? Math.min(...others.map(q => handTotals[q])) : Infinity, assaf = !forced && low <= c;
  const points = Array(s.config.players).fill(0), winner = assaf ? others.find(q => handTotals[q] === low)! : -1;
  for (const q of act) points[q] = q === caller ? (assaf ? ASSAF_PENALTY : 0) : q === winner ? 0 : handTotals[q];
  const totals = s.totals.map((t, i) => { let v = t + points[i]; if (s.config.bonus && points[i] > 0 && v > 0 && v % 50 === 0) v -= 50; return v; });
  let active = s.active.map((a, i) => a && totals[i] <= s.config.limit);
  if (!active.some(Boolean)) { const best = act.reduce((x, y) => (totals[y] < totals[x] ? y : x)); active = s.active.map((_, i) => i === best); }
  const history = [...s.history, { round: s.round + 1, caller, assaf, hands: handTotals, points, totals }];
  return refresh({ ...s, stalemate: forced, totals, active, caller, assaf, handTotals, roundPoints: points, history, revealed: true, phase: activeSeats(active).length <= 1 ? 'gameEnd' : 'roundEnd' });
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: nextActive(s.active, s.dealer) });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat || s.revealed ? h : [])), deck: [], pile: [] });
export const winners = (s: State) => { const alive = activeSeats(s.active); if (alive.length === 1) return alive; const m = Math.min(...alive.map(i => s.totals[i])); return alive.filter(i => s.totals[i] === m); };
