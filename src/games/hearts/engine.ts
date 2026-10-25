import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

export interface HeartsConfig { players: number; target: number; passing: boolean; jackOfDiamonds: boolean; moon: 'others26' | 'minus26'; queenBreaks: boolean }
export const defaultConfig: HeartsConfig = { players: 4, target: 100, passing: true, jackOfDiamonds: false, moon: 'others26', queenBreaks: false };
export type Action = { type: 'pass'; cards: Card[] } | { type: 'play'; card: Card };
export interface RoundResult { round: number; taken: number[]; points: number[]; totals: number[]; moon: number | null; dir: number }
export interface State extends BaseState {
  config: HeartsConfig; seed: number; history: RoundResult[];
  passDir: number; passCount: number; passSel: (Card[] | null)[]; broken: boolean; trickNo: number; openRank: number;
  played: Card[]; pts: number[]; hearts: number[]; qs: number | null; leader: number;
}
export const isQS = (c: Card) => c.suit === 0 && c.rank === 12;
export const isJD = (c: Card) => c.suit === 2 && c.rank === 11;
export const cardPts = (c: Card, cfg: HeartsConfig) => (c.suit === 1 ? 1 : isQS(c) ? 13 : cfg.jackOfDiamonds && isJD(c) ? -10 : 0);

/** To deal evenly, the lowest diamonds and clubs are removed (3 players: 2♦; 5: 2♦ 2♣; 6 and 8: 2♦ 2♣ 3♦ 3♣; 7: 2♦ 2♣ 3♦). */
export const removedCards = (n: number): Card[] => ([{ suit: 2, rank: 2 }, { suit: 3, rank: 2 }, { suit: 2, rank: 3 }, { suit: 3, rank: 3 }] as Card[]).slice(0, 52 % n);
export const handSizeFor = (n: number) => (52 - (52 % n)) / n;
export const passCountFor = (n: number) => (n === 3 ? 4 : n <= 5 ? 3 : 2);
/** Passing directions cycle: left, right, (across if the table is even), then keep. */
export const passCycle = (n: number) => (n % 2 === 0 ? [0, 1, 2, -1] : [0, 1, -1]);
export const passOffset = (dir: number, n: number) => (dir === 0 ? 1 : dir === 1 ? n - 1 : n / 2);

function startPlay(s: State): State {
  const leader = s.hands.findIndex(h => h.some(c => c.suit === 3 && c.rank === s.openRank));
  return { ...s, phase: 'playing', leader, turn: leader, passSel: Array(s.config.players).fill(null) };
}
function deal(s: State): State {
  const n = s.config.players, gone = removedCards(n), size = handSizeFor(n);
  const deck = shuffle(standardDeck().filter(c => !gone.some(g => sameCard(g, c))), makeRng(s.seed * 1013 + s.round * 7907));
  const hands = Array.from({ length: n }, (_, i) => sortHand(deck.slice(i * size, (i + 1) * size)));
  const cycle = passCycle(n), dir = s.config.passing ? cycle[s.round % cycle.length] : -1;
  const openRank = Math.min(...deck.filter(c => c.suit === 3).map(c => c.rank));
  const base: State = { ...s, hands, handSizes: hands.map(h => h.length), trick: [], lastTrick: null, played: [], broken: false, trickNo: 0, pts: Array(n).fill(0), hearts: Array(n).fill(0),
    qs: null, passDir: dir, passCount: passCountFor(n), passSel: Array(n).fill(null), openRank };
  return dir < 0 ? startPlay(base) : { ...base, phase: 'passing', turn: 0 };
}
export function create(config: HeartsConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'passing', round: 0, dealer: 0, turn: 0, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(config.players).fill(0), history: [],
    passDir: -1, passCount: 3, passSel: [], broken: false, trickNo: 0, openRank: 2, played: [], pts: [], hearts: [], qs: null, leader: 0 });
}
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat];
  if (!s.trick.length) {
    if (s.trickNo === 0) return hand.filter(c => c.suit === 3 && c.rank === s.openRank);
    if (s.broken) return hand;
    const nh = hand.filter(c => c.suit !== 1); return nh.length ? nh : hand;
  }
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit);
  if (follow.length) return follow;
  if (s.trickNo === 0) { const safe = hand.filter(c => c.suit !== 1 && !isQS(c)); return safe.length ? safe : hand; }
  return hand;
}
export const legalActions = (s: State, seat: number): Action[] => (seat === s.turn && s.phase === 'playing' ? legalPlays(s, seat).map(card => ({ type: 'play' as const, card })) : []);
export const trickWinner = (t: Trick[]) => t.filter(x => x.card.suit === t[0].card.suit).reduce((a, b) => (b.card.rank > a.card.rank ? b : a));

/** Applies the shoot-the-moon rule to one hand's captured points. */
export function settle(pts: number[], hearts: number[], qs: number | null, cfg: HeartsConfig): { points: number[]; moon: number | null } {
  const moon = qs !== null && hearts[qs] === 13 ? qs : null;
  if (moon === null) return { points: [...pts], moon };
  return { moon, points: pts.map((_, i) => (cfg.moon === 'others26' ? (i === moon ? 0 : 26) : i === moon ? -26 : 0)) };
}

export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn) throw new Error(`Not seat ${seat}'s turn`);
  const n = s.config.players;
  if (a.type === 'pass') {
    const hand = s.hands[seat];
    if (s.phase !== 'passing' || a.cards.length !== s.passCount || !a.cards.every(c => hand.some(h => sameCard(h, c))) || new Set(a.cards.map(c => c.suit * 20 + c.rank)).size !== s.passCount) throw new Error('Illegal pass');
    const passSel = [...s.passSel]; passSel[seat] = a.cards;
    const next = passSel.findIndex(p => p === null);
    if (next >= 0) return { ...s, passSel, turn: next };
    const sel = passSel as Card[][], off = passOffset(s.passDir, n);
    const hands = s.hands.map((h, i) => sortHand([...h.filter(c => !sel[i].some(x => sameCard(x, c))), ...sel[(i - off + n) % n]]));
    return startPlay({ ...s, hands, handSizes: hands.map(h => h.length), passSel });
  }
  if (s.phase !== 'playing' || !legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card];
  const broken = s.broken || a.card.suit === 1 || (s.config.queenBreaks && isQS(a.card));
  const st = { ...s, hands, handSizes: hands.map(h => h.length), trick, played, broken };
  if (trick.length < n) return { ...st, turn: (seat + 1) % n };
  const winner = trickWinner(trick).seat, pts = [...s.pts], hearts = [...s.hearts];
  let qs = s.qs;
  for (const t of trick) { pts[winner] += cardPts(t.card, s.config); if (t.card.suit === 1) hearts[winner]++; if (isQS(t.card)) qs = winner; }
  const next: State = { ...st, trick: [], lastTrick: { cards: trick, winner }, leader: winner, turn: winner, trickNo: s.trickNo + 1, pts, hearts, qs };
  return hands[0].length ? next : endHand(next);
}
function endHand(s: State): State {
  const { points, moon } = settle(s.pts, s.hearts, s.qs, s.config);
  const totals = s.totals.map((t, i) => t + points[i]), min = Math.min(...totals);
  const over = Math.max(...totals) >= s.config.target && totals.filter(t => t === min).length === 1;
  return { ...s, totals, history: [...s.history, { round: s.round + 1, taken: s.pts, points, totals, moon, dir: s.passDir }], phase: over ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
export function view(s: State, seat: number): State {
  return { ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), passSel: s.passSel.map((p, i) => (i === seat ? p : p ? [] : null)) };
}
export const winners = (s: State) => { const m = Math.min(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
