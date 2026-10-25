import { Card, sameCard, makeRng, shuffle, standardDeck } from '../../engine/cards';
import type { BaseState } from '../types';

/** President / Scum: shed your cards by playing sets (1-4+ cards of one rank) that beat the last play with the same number of higher cards, or pass.
 *  Rank order low to high: 3 4 5 6 7 8 9 10 J Q K A 2. First out is President, last is Scum. */
export interface PresConfig { players: number; decks: number; swap: 'two' | 'one' | 'none'; revolution: boolean; rounds: number }
export const defaultConfig: PresConfig = { players: 4, decks: 1, swap: 'two', revolution: false, rounds: 3 };
export type Action = { type: 'set'; cards: Card[] } | { type: 'skip' } | { type: 'return'; cards: Card[] };
export type Event = { k: 'out'; seat: number; place: number } | { k: 'rev'; on: boolean } | { k: 'clear'; leader: number } | null;
export type Act = { k: 'set'; count: number; rank: number } | { k: 'skip' } | { k: 'out'; place: number } | null;
export interface Table { seat: number; cards: Card[]; rank: number; count: number }
export interface Xchg { high: number; low: number; count: number }
export interface RoundResult { round: number; order: number[]; points: number[]; totals: number[] }
export interface State extends BaseState {
  config: PresConfig; seed: number; history: RoundResult[]; table: Table | null; rev: boolean; streak: number; order: number[]; leader: number;
  xchg: Xchg | null; pending: Xchg[]; received: Card[]; acts: Act[]; event: Event;
}
/** 3 lowest ... 2 highest (normal order); a revolution mirrors it. */
export const power = (rank: number) => (rank === 2 ? 15 : rank);
export const eff = (rank: number, rev: boolean) => (rev ? 18 - power(rank) : power(rank));
export const byPower = (h: Card[]) => [...h].sort((a, b) => power(a.rank) - power(b.rank) || a.suit - b.suit);
export const placeName = (pos: number, n: number) => (pos === 0 ? 'President' : pos === n - 1 ? 'Scum' : n >= 4 && pos === 1 ? 'Vice President' : n >= 4 && pos === n - 2 ? 'Vice Scum' : 'Neutral');

const nextActive = (hands: Card[][], from: number): number => { const n = hands.length; for (let i = 1; i <= n; i++) { const q = (from + i) % n; if (hands[q].length) return q; } return -1; };
function exchanges(order: number[], cfg: PresConfig): Xchg[] {
  const n = order.length; if (cfg.swap === 'none' || n < 3) return [];
  const k = cfg.swap === 'two' ? 2 : 1, out: Xchg[] = [{ high: order[0], low: order[n - 1], count: k }];
  if (cfg.swap === 'two' && n >= 4) out.push({ high: order[1], low: order[n - 2], count: 1 });
  return out;
}
/** Takes the low player's best cards for the high player (automatic); the high player then chooses what to give back. */
function startExchange(s: State): State {
  if (!s.pending.length) return { ...s, phase: 'playing', xchg: null, received: [], turn: s.leader };
  const x = s.pending[0], hands = s.hands.map(h => [...h]), best = byPower(hands[x.low]).slice(-x.count);
  for (const c of best) hands[x.low].splice(hands[x.low].findIndex(h => sameCard(h, c)), 1);
  hands[x.high] = byPower([...hands[x.high], ...best]); hands[x.low] = byPower(hands[x.low]);
  return { ...s, hands, handSizes: hands.map(h => h.length), phase: 'exchange', xchg: x, received: best, turn: x.high };
}
function deal(s: State): State {
  const n = s.config.players, deck = shuffle(Array.from({ length: s.config.decks }).flatMap(() => standardDeck()), makeRng(s.seed * 1301 + s.round * 4177));
  const raw: Card[][] = Array.from({ length: n }, () => []); deck.forEach((c, i) => raw[i % n].push(c));
  const prev = s.history[s.history.length - 1], leader = prev ? prev.order[n - 1] : (s.dealer + 1) % n, hands = raw.map(byPower);
  const base: State = { ...s, hands, handSizes: hands.map(h => h.length), table: null, rev: false, streak: 0, order: [], leader, turn: leader, acts: Array(n).fill(null), event: null, xchg: null, received: [],
    pending: prev ? exchanges(prev.order, s.config) : [], phase: 'playing', trick: [], lastTrick: null };
  return startExchange(base);
}
export function create(config: PresConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    table: null, rev: false, streak: 0, order: [], leader: 0, xchg: null, pending: [], received: [], acts: [], event: null });
}
/** Returns an error text, or null if the action is legal - the single rule check used by bots, the screen and the engine. */
export function check(s: State, seat: number, a: Action): string | null {
  if (seat !== s.turn) return 'Not your turn';
  const hand = s.hands[seat];
  const owns = (cards: Card[]) => { const left = [...hand]; for (const c of cards) { const i = left.findIndex(h => sameCard(h, c)); if (i < 0) return false; left.splice(i, 1); } return true; };
  if (a.type === 'return') return s.phase === 'exchange' && s.xchg && a.cards.length === s.xchg.count && owns(a.cards) ? null : 'Illegal return';
  if (s.phase !== 'playing') return 'Not playing';
  if (a.type === 'skip') return s.table ? null : 'You must lead';
  if (!a.cards.length || !owns(a.cards) || a.cards.some(c => c.rank !== a.cards[0].rank)) return 'Illegal set';
  if (s.table && (a.cards.length !== s.table.count || eff(a.cards[0].rank, s.rev) <= eff(s.table.rank, s.rev))) return 'Does not beat the last play';
  return null;
}
export const validate = (s: State, seat: number, a: Action) => check(s, seat, a) === null;
/** One representative card set per legal rank/size (suits do not matter in this game). */
export function legalSets(s: State, seat: number): Card[][] {
  if (s.phase !== 'playing' || seat !== s.turn) return [];
  const by = new Map<number, Card[]>(); for (const c of s.hands[seat]) by.set(c.rank, [...(by.get(c.rank) ?? []), c]);
  const out: Card[][] = [];
  for (const [rank, cs] of by) {
    if (s.table) { if (cs.length >= s.table.count && eff(rank, s.rev) > eff(s.table.rank, s.rev)) out.push(cs.slice(0, s.table.count)); }
    else for (let k = 1; k <= cs.length; k++) out.push(cs.slice(0, k));
  }
  return out;
}
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn) return [];
  if (s.phase === 'exchange') return [{ type: 'return', cards: byPower(s.hands[seat]).slice(0, s.xchg!.count) }];
  if (s.phase !== 'playing') return [];
  const acts: Action[] = legalSets(s, seat).map(cards => ({ type: 'set' as const, cards })); if (s.table) acts.push({ type: 'skip' }); return acts;
}
export function apply(s: State, seat: number, a: Action): State {
  const err = check(s, seat, a); if (err) throw new Error(err);
  const n = s.config.players;
  if (a.type === 'return') {
    const x = s.xchg!, hands = s.hands.map(h => [...h]);
    for (const c of a.cards) hands[x.high].splice(hands[x.high].findIndex(h => sameCard(h, c)), 1);
    hands[x.low] = byPower([...hands[x.low], ...a.cards]); hands[x.high] = byPower(hands[x.high]);
    return startExchange({ ...s, hands, handSizes: hands.map(h => h.length), pending: s.pending.slice(1) });
  }
  const acts = [...s.acts], active = (hs: Card[][]) => hs.filter(h => h.length).length;
  if (a.type === 'skip') {
    const streak = s.streak + 1, lp = s.table!.seat, others = s.hands.filter((h, i) => h.length && i !== lp).length; acts[seat] = { k: 'skip' };
    if (streak >= others) { const leader = s.hands[lp].length ? lp : nextActive(s.hands, lp); return { ...s, acts, table: null, streak: 0, leader, turn: leader, event: { k: 'clear', leader } }; }
    return { ...s, acts, streak, turn: nextActive(s.hands, seat) };
  }
  const hands = s.hands.map(h => [...h]); for (const c of a.cards) hands[seat].splice(hands[seat].findIndex(h => sameCard(h, c)), 1);
  const rank = a.cards[0].rank, flip = s.config.revolution && a.cards.length >= 4, rev = flip ? !s.rev : s.rev;
  let order = s.order, event: Event = flip ? { k: 'rev', on: rev } : null; acts[seat] = { k: 'set', count: a.cards.length, rank };
  if (!hands[seat].length) { order = [...order, seat]; acts[seat] = { k: 'out', place: order.length - 1 }; event = { k: 'out', seat, place: order.length - 1 }; }
  const st: State = { ...s, hands, handSizes: hands.map(h => h.length), table: { seat, cards: a.cards, rank, count: a.cards.length }, rev, streak: 0, order, acts, event };
  if (active(hands) <= 1) { const last = hands.findIndex(h => h.length); return endRound({ ...st, order: last >= 0 ? [...order, last] : order }); }
  if (eff(rank, rev) >= 15) { const leader = hands[seat].length ? seat : nextActive(hands, seat); return { ...st, table: null, leader, turn: leader, event: event ?? { k: 'clear', leader } }; } // nothing can beat it
  return { ...st, turn: nextActive(hands, seat) };
}
function endRound(s: State): State {
  const n = s.config.players, points = Array(n).fill(0); s.order.forEach((seat, pos) => { points[seat] = n - 1 - pos; });
  const totals = s.totals.map((t, i) => t + points[i]);
  return { ...s, totals, table: s.table, history: [...s.history, { round: s.round + 1, order: s.order, points, totals }], phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), received: s.turn === seat ? s.received : [] });
export const winners = (s: State) => { const m = Math.max(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
