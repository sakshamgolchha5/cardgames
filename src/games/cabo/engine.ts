import { Card, makeRng, shuffle, standardDeck } from '../../engine/cards';
import type { BaseState } from '../types';

/** Cabo (Cambio): four face-down cards, you may only look at two at the start. Draw, then swap the card into your grid or discard it; discarding a 7/8 lets you peek at one of
 *  your own cards, a 9/10 at someone else's, a J/Q lets you swap one of your cards with someone else's unseen. Call "Cabo" when you think you are lowest: everyone gets one more turn. */
export interface CaboConfig { players: number; limit: 25 | 50 | 100; powers: boolean; penalty: number }
export const defaultConfig: CaboConfig = { players: 4, limit: 50, powers: true, penalty: 10 };
export type Action = { type: 'take' } | { type: 'swap'; index: number } | { type: 'dump' } | { type: 'peek'; index: number } | { type: 'spy'; seat: number; index: number }
  | { type: 'trade'; mine: number; seat: number; index: number } | { type: 'cabo' } | { type: 'done' } | { type: 'skip' };
export interface RoundResult { round: number; caller: number; callerWon: boolean; hands: number[]; points: number[]; totals: number[] }
export type Power = 'self' | 'other' | 'swap' | null;
export interface State extends BaseState {
  config: CaboConfig; seed: number; history: RoundResult[]; grid: Card[][]; kn: (Card | null)[][][]; know: (Card | null)[][]; deck: Card[]; deckCount: number; discard: Card[];
  step: 'start' | 'drawn' | 'power' | 'seen'; drawn: Card | null; power: Power; peek: { seat: number; index: number; card: Card } | null; caller: number | null; finalLeft: number; revealed: boolean;
  handTotals: number[]; event: string;
}
/** Ace 1, 2-10 face value, Jack 11, Queen 12, black King 13, red King 0. */
export const value = (c: Card) => (c.rank === 13 ? (c.suit === 1 || c.suit === 2 ? 0 : 13) : c.rank === 14 ? 1 : c.rank);
export const total = (g: Card[]) => g.reduce((a, c) => a + value(c), 0);
export const powerOf = (c: Card): Power => (c.rank === 7 || c.rank === 8 ? 'self' : c.rank === 9 || c.rank === 10 ? 'other' : c.rank === 11 || c.rank === 12 ? 'swap' : null);

function deal(s: State): State {
  const n = s.config.players, deck = shuffle(standardDeck(), makeRng(s.seed * 1531 + s.round * 4999)), grid = Array.from({ length: n }, (_, i) => deck.slice(i * 4, i * 4 + 4));
  const kn: (Card | null)[][][] = Array.from({ length: n }, (_, v) => Array.from({ length: n }, (_, o) => [0, 1, 2, 3].map(k => (v === o && k >= 2 ? grid[o][k] : null))));   // everybody peeks at their bottom two cards
  return { ...s, grid, kn, deck: deck.slice(n * 4), deckCount: deck.length - n * 4, discard: [], step: 'start', drawn: null, power: null, peek: null, caller: null, finalLeft: 0, revealed: false, handTotals: Array(n).fill(0),
    hands: grid.map(() => []), handSizes: grid.map(() => 4), turn: (s.dealer + 1) % n, phase: 'playing', event: '', trick: [], lastTrick: null };
}
export function create(config: CaboConfig = defaultConfig, seed = 1): State {
  const n = config.players;
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(n).fill(0), history: [], grid: [], kn: [], know: [], deck: [], deckCount: 0,
    discard: [], step: 'start', drawn: null, power: null, peek: null, caller: null, finalLeft: 0, revealed: false, handTotals: [], event: '' });
}
export function check(s: State, seat: number, a: Action): string | null {
  if (s.phase !== 'playing' || seat !== s.turn) return 'Not your turn';
  const n = s.config.players, idx = (i: number) => Number.isInteger(i) && i >= 0 && i < 4;
  switch (a.type) {
    case 'take': return s.step === 'start' ? null : 'Not now';
    case 'cabo': return s.step === 'start' && s.caller === null ? null : 'You cannot call Cabo now';
    case 'swap': return s.step === 'drawn' && idx(a.index) ? null : 'Not now';
    case 'dump': return s.step === 'drawn' ? null : 'Not now';
    case 'peek': return s.step === 'power' && s.power === 'self' && idx(a.index) ? null : 'Not now';
    case 'spy': return s.step === 'power' && s.power === 'other' && a.seat !== seat && a.seat >= 0 && a.seat < n && idx(a.index) ? null : 'Not now';
    case 'trade': return s.step === 'power' && s.power === 'swap' && a.seat !== seat && a.seat >= 0 && a.seat < n && idx(a.mine) && idx(a.index) ? null : 'Not now';
    case 'skip': return s.step === 'power' ? null : 'Not now';
    case 'done': return s.step === 'seen' ? null : 'Not now';
  }
}
export const validate = (s: State, seat: number, a: Action) => check(s, seat, a) === null;
export function legalActions(s: State, seat: number): Action[] {
  if (s.phase !== 'playing' || seat !== s.turn) return [];
  if (s.step === 'start') return s.caller === null ? [{ type: 'take' }, { type: 'cabo' }] : [{ type: 'take' }];
  if (s.step === 'drawn') return [{ type: 'dump' }, ...[0, 1, 2, 3].map(index => ({ type: 'swap' as const, index }))];
  if (s.step === 'seen') return [{ type: 'done' }];
  const acts: Action[] = [{ type: 'skip' }];
  if (s.power === 'self') for (let index = 0; index < 4; index++) acts.push({ type: 'peek', index });
  return acts;
}
const endTurn = (s: State, seat: number, patch: Partial<State>): State => {
  const n = s.config.players, finalLeft = s.caller !== null ? s.finalLeft - 1 : 0, st: State = { ...s, ...patch, step: 'start', drawn: null, power: null, peek: null, finalLeft, turn: (seat + 1) % n, deckCount: (patch.deck ?? s.deck).length };
  return s.caller !== null && finalLeft <= 0 ? endRound(st) : st;
};
/** After two slots swap contents: players involved keep what they knew about the cards that moved; everybody else loses track of both slots. */
function moveKnowledge(kn: (Card | null)[][][], a: [number, number], b: [number, number]): (Card | null)[][][] {
  return kn.map((m, v) => { const c = m.map(r => [...r]); if (v === a[0] || v === b[0]) { const t = c[a[0]][a[1]]; c[a[0]][a[1]] = c[b[0]][b[1]]; c[b[0]][b[1]] = t; } else { c[a[0]][a[1]] = null; c[b[0]][b[1]] = null; } return c; });
}
export function apply(s: State, seat: number, a: Action): State {
  const err = check(s, seat, a); if (err) throw new Error(err);
  if (a.type === 'cabo') { const st = { ...s, caller: seat, finalLeft: s.config.players - 1, event: 'cabo' }; return endTurn({ ...st, finalLeft: s.config.players }, seat, {}); }
  if (a.type === 'take') {
    let deck = [...s.deck], discard = s.discard; if (!deck.length) { const top = discard[discard.length - 1]; deck = shuffle(discard.slice(0, -1), makeRng(s.seed * 97 + s.round * 7 + s.deckCount)); discard = [top]; }
    const drawn = deck.shift()!; return { ...s, deck, discard, deckCount: deck.length, drawn, step: 'drawn', event: '' };
  }
  const grid = s.grid.map(g => [...g]);
  if (a.type === 'swap') {   // the drawn card goes into your grid; the card it replaces goes face up on the discard pile
    const old = grid[seat][a.index]; grid[seat][a.index] = s.drawn!;
    const kn = s.kn.map((m, v) => { const c = m.map(r => [...r]); c[seat][a.index] = v === seat ? s.drawn! : null; return c; });
    return endTurn(s, seat, { grid, kn, discard: [...s.discard, old], event: 'swap' });
  }
  if (a.type === 'dump') {
    const card = s.drawn!, discard = [...s.discard, card], pw = s.config.powers ? powerOf(card) : null;
    return pw ? { ...s, discard, drawn: null, step: 'power', power: pw, event: 'dump' } : endTurn(s, seat, { discard, event: 'dump' });
  }
  if (a.type === 'skip') return endTurn(s, seat, {});
  if (a.type === 'peek' || a.type === 'spy') {
    const o = a.type === 'peek' ? seat : a.seat, card = s.grid[o][a.index], kn = s.kn.map(m => m.map(r => [...r])); kn[seat][o][a.index] = card;
    return { ...s, kn, step: 'seen', peek: { seat: o, index: a.index, card } };
  }
  if (a.type === 'trade') {
    const t = grid[seat][a.mine]; grid[seat][a.mine] = grid[a.seat][a.index]; grid[a.seat][a.index] = t;
    return endTurn(s, seat, { grid, kn: moveKnowledge(s.kn, [seat, a.mine], [a.seat, a.index]), event: 'trade' });
  }
  return endTurn(s, seat, {});   // done
}
function endRound(s: State): State {
  const n = s.config.players, hands = s.grid.map(total), caller = s.caller!, low = Math.min(...hands), callerWon = hands[caller] <= low;
  const winner = callerWon ? caller : hands.indexOf(low), points = hands.map((h, i) => (i === winner ? 0 : h + (i === caller ? s.config.penalty ?? 10 : 0)));
  const totals = s.totals.map((t, i) => t + points[i]), over = totals.some(t => t >= s.config.limit);
  return { ...s, totals, handTotals: hands, revealed: true, history: [...s.history, { round: s.round + 1, caller, callerWon, hands, points, totals }], phase: over ? 'gameEnd' : 'roundEnd', step: 'start', drawn: null, peek: null, turn: caller };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
/** You see your own known cards and anything you peeked at; the drawn card and a peek result are private to the player who made them. */
export const view = (s: State, seat: number): State => ({ ...s, grid: s.revealed ? s.grid : [], kn: [], know: s.kn[seat] ?? [], deck: [], drawn: s.turn === seat ? s.drawn : null, peek: s.peek && s.turn === seat ? s.peek : null });
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
