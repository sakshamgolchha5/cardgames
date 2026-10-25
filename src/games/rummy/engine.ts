import { Card, deckWithJokers, isJoker, makeRng, shuffle, sameCard, sortHand } from '../../engine/cards';
import type { BaseState } from '../types';
import { canShow, showCard, solve, value } from './solver';

/** 13-card Rummy (points rummy): make at least two sequences, one of them pure (no joker), and sets or more sequences for the rest. Each turn draw from the stock or the open pile,
 *  then throw a card; throw your last card face-down as a "show" to win the deal. A random card sets the wild rank (the cut joker); printed jokers are wild too. */
export interface RummyConfig { players: number; rounds: number; drop: boolean }
export const defaultConfig: RummyConfig = { players: 4, rounds: 3, drop: true };
export type Action = { type: 'stock' } | { type: 'open' } | { type: 'throw'; card: Card } | { type: 'show'; card: Card } | { type: 'drop' };
export const CAP = 80, WRONG = 80, FIRST_DROP = 20, MID_DROP = 40, HAND = 13;
export interface RoundResult { round: number; winner: number | null; points: number[]; totals: number[]; notes: string[] }
export interface State extends BaseState {
  config: RummyConfig; seed: number; history: RoundResult[]; step: 'draw' | 'discard'; stock: Card[]; stockCount: number; open: Card[]; openCount: number; wild: number; wildCard: Card | null;
  active: boolean[]; moves: number[]; dealPoints: (number | null)[]; notes: string[]; revealed: boolean; winner: number | null; lastDraw: 'stock' | 'open' | null;
}
const nextActive = (a: boolean[], from: number) => { const n = a.length; for (let i = 1; i <= n; i++) { const q = (from + i) % n; if (a[q]) return q; } return from; };
const refresh = (s: State): State => ({ ...s, handSizes: s.hands.map(h => h.length), stockCount: s.stock.length, openCount: s.open.length });

function deal(s: State): State {
  const n = s.config.players, stock = shuffle(deckWithJokers(n > 6 ? 3 : 2), makeRng(s.seed * 1619 + s.round * 3989)), hands: Card[][] = [];
  for (let i = 0; i < n; i++) hands.push(sortHand(stock.splice(0, HAND)));
  while (isJoker(stock[0])) stock.push(stock.shift()!);           // the cut joker must be a normal card
  const wildCard = stock.shift()!; stock.push(wildCard);           // it is shown face up and tucked back under the stock
  const open = [stock.shift()!], first = (s.dealer + 1) % n;
  return refresh({ ...s, hands, stock, open, wild: wildCard.rank, wildCard, step: 'draw', turn: first, active: Array(n).fill(true), moves: Array(n).fill(0), dealPoints: Array(n).fill(null), notes: Array(n).fill(''),
    revealed: false, winner: null, lastDraw: null, phase: 'playing', trick: [], lastTrick: null });
}
export function create(config: RummyConfig = defaultConfig, seed = 1): State {
  const n = config.players;
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(n).fill(0), history: [], step: 'draw', stock: [], stockCount: 0, open: [], openCount: 0,
    wild: 0, wildCard: null, active: [], moves: [], dealPoints: [], notes: [], revealed: false, winner: null, lastDraw: null });
}
export function check(s: State, seat: number, a: Action): string | null {
  if (s.phase !== 'playing' || seat !== s.turn || !s.active[seat]) return 'Not your turn';
  const hand = s.hands[seat];
  if (a.type === 'stock') return s.step === 'draw' && s.stock.length + s.open.length > 1 ? null : 'Cannot draw from the stock';
  if (a.type === 'open') return s.step === 'draw' && s.open.length ? null : 'The open pile is empty';
  if (a.type === 'drop') return s.step === 'draw' && s.config.drop ? null : 'You cannot drop now';
  if (s.step !== 'discard') return 'Draw first';
  if (!hand.some(c => sameCard(c, a.card))) return 'Not in your hand';
  return null;
}
export const validate = (s: State, seat: number, a: Action) => check(s, seat, a) === null;
/** Would showing with this card (throwing it face-down) win? Used for the Show button's hint and by bots. */
export const canShowWith = (s: State, seat: number, card: Card) => { const i = s.hands[seat].findIndex(c => sameCard(c, card)); return i >= 0 && canShow(s.hands[seat].filter((_, k) => k !== i), s.wild); };
export function legalActions(s: State, seat: number): Action[] {
  if (s.phase !== 'playing' || seat !== s.turn || !s.active[seat]) return [];
  if (s.step === 'draw') { const a: Action[] = [{ type: 'stock' }]; if (s.open.length) a.push({ type: 'open' }); if (s.config.drop) a.push({ type: 'drop' }); return a; }
  return s.hands[seat].flatMap(card => [{ type: 'throw' as const, card }, ...(canShowWith(s, seat, card) ? [{ type: 'show' as const, card }] : [])]);
}
/** Cards left over after the best grouping (capped at 80); with no pure sequence the whole hand counts. */
export const deadwoodOf = (hand: Card[], wild: number) => Math.min(CAP, solve(hand, wild).deadwood);
export function apply(s: State, seat: number, a: Action): State {
  const err = check(s, seat, a); if (err) throw new Error(err);
  const hands = s.hands.map(h => [...h]), moves = [...s.moves];
  if (a.type === 'stock' || a.type === 'open') {
    let stock = [...s.stock], open = [...s.open];
    if (a.type === 'stock') { if (!stock.length) { const top = open.pop()!; stock = shuffle(open, makeRng(s.seed * 83 + s.round * 29 + s.openCount)); open = [top]; } hands[seat] = sortHand([...hands[seat], stock.shift()!]); }
    else hands[seat] = sortHand([...hands[seat], open.pop()!]);
    return refresh({ ...s, hands, stock, open, step: 'discard', lastDraw: a.type });
  }
  if (a.type === 'drop') {
    const pts = moves[seat] === 0 ? FIRST_DROP : MID_DROP, active = [...s.active], dealPoints = [...s.dealPoints], notes = [...s.notes]; active[seat] = false; dealPoints[seat] = pts; notes[seat] = `dropped (${pts})`;
    const stock = [...s.stock, ...hands[seat]]; hands[seat] = [];
    return afterLoss(refresh({ ...s, hands, stock, active, dealPoints, notes }), seat);
  }
  const at = hands[seat].findIndex(c => sameCard(c, a.card)); hands[seat].splice(at, 1); moves[seat]++;
  if (a.type === 'throw') return refresh({ ...s, hands, moves, open: [...s.open, a.card], step: 'draw', turn: nextActive(s.active, seat), lastDraw: null });
  if (canShow(hands[seat], s.wild)) return endDeal(refresh({ ...s, hands, moves, winner: seat }), seat);   // a valid show
  const active = [...s.active], dealPoints = [...s.dealPoints], notes = [...s.notes]; active[seat] = false; dealPoints[seat] = WRONG; notes[seat] = `wrong show (${WRONG})`;   // an invalid show costs 80 and you are out
  const stock = [...s.stock, ...hands[seat], a.card]; hands[seat] = [];
  return afterLoss(refresh({ ...s, hands, moves, stock, active, dealPoints, notes, step: 'draw' }), seat);
}
/** After a drop or a wrong show: if only one player is left in the deal, that player wins it. */
function afterLoss(s: State, seat: number): State {
  const left = s.active.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
  return left.length === 1 ? endDeal({ ...s, winner: left[0] }, left[0]) : { ...s, step: 'draw', turn: nextActive(s.active, seat), lastDraw: null };
}
function endDeal(s: State, winner: number): State {
  const n = s.config.players, notes = [...s.notes];
  const points = s.hands.map((h, i) => { if (i === winner) { notes[i] = 'won'; return 0; } if (s.dealPoints[i] !== null) return s.dealPoints[i]!; const d = deadwoodOf(h, s.wild); notes[i] = `${d} left`; return d; });
  const totals = s.totals.map((t, i) => t + points[i]);
  return refresh({ ...s, totals, notes, revealed: true, winner, history: [...s.history, { round: s.round + 1, winner, points, totals, notes }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd', turn: winner });
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
/** Only the top of the open pile is visible; hands stay private until the deal ends. */
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat || s.revealed ? h : [])), stock: [], open: s.open.slice(-1) });
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
/** Grouping of your own hand for display: melds first, then the leftover cards. */
export function suggestGroups(hand: Card[], wild: number): number[][] { const r = solve(hand, wild); return r.rest.length ? [...r.groups, r.rest] : r.groups; }
export { value };
