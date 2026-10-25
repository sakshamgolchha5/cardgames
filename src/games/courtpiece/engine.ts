import { Card, Suit, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

/** single: winner collects each trick. double: tricks pile up; a player must win two in a row to collect the pile.
 *  doubleAce: as double, but two consecutive wins that are both won with Aces do not collect. */
export type Sir = 'single' | 'double' | 'doubleAce';
export interface CourtConfig { sir: Sir; trumpMode: 'caller' | 'beranga'; target: number }
export const defaultConfig: CourtConfig = { sir: 'single', trumpMode: 'caller', target: 7 };
export type Action = { type: 'trump'; suit: Suit } | { type: 'play'; card: Card };
export interface RoundResult { round: number; trump: Suit | null; tricks: number[]; points: number[]; totals: number[]; court: boolean }
export interface State extends BaseState {
  config: CourtConfig; seed: number; history: RoundResult[];
  caller: number; trump: Suit | null; rest: Card[][]; pile: Trick[][]; pending: number | null; pendingAce: boolean;
  teamTricks: number[]; played: Card[];
}
export const team = (seat: number) => seat % 2;

function deal(s: State): State {
  const deck = shuffle(standardDeck(), makeRng(s.seed * 1031 + s.round * 6151)), caller = (s.dealer + 1) % 4;
  const base = { ...s, caller, trick: [], lastTrick: null, pile: [], pending: null, pendingAce: false, teamTricks: [0, 0], played: [], turn: caller, trump: null as Suit | null };
  if (s.config.trumpMode === 'beranga') {
    const hands = [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 13, i * 13 + 13)));
    return { ...base, hands, handSizes: [13, 13, 13, 13], rest: [[], [], [], []], phase: 'playing' };
  }
  const hands = [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 5, i * 5 + 5))), rest = [0, 1, 2, 3].map(i => deck.slice(20 + i * 8, 28 + i * 8));
  return { ...base, hands, handSizes: [5, 5, 5, 5], rest, phase: 'trump' };
}
export function create(config: CourtConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'trump', round: 0, dealer: 0, turn: 1, hands: [], handSizes: [], trick: [], lastTrick: null, totals: [0, 0, 0, 0], history: [],
    caller: 1, trump: null, rest: [], pile: [], pending: null, pendingAce: false, teamTricks: [0, 0], played: [] });
}
export function trickWinner(trick: Trick[], trump: Suit | null): Trick {
  const tr = trump === null ? [] : trick.filter(t => t.card.suit === trump);
  return (tr.length ? tr : trick.filter(t => t.card.suit === trick[0].card.suit)).reduce((a, b) => (b.card.rank > a.card.rank ? b : a));
}
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat];
  if (!s.trick.length) return hand;
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit);
  return follow.length ? follow : hand;
}
export const legalActions = (s: State, seat: number): Action[] => {
  if (seat !== s.turn) return [];
  if (s.phase === 'trump') return ([0, 1, 2, 3] as Suit[]).map(suit => ({ type: 'trump' as const, suit }));
  return s.phase === 'playing' ? legalPlays(s, seat).map(card => ({ type: 'play' as const, card })) : [];
};

/** Decides who gets the trick (or the pile) under the chosen Sir rule. Pure, so it is unit-tested directly. */
export function resolveTrick(s: State, trick: Trick[]): State {
  const w = trickWinner(trick, s.trump), ace = w.card.rank === 14, tt = [...s.teamTricks];
  if (s.config.sir === 'single') { tt[team(w.seat)]++; return { ...s, teamTricks: tt, pile: [], pending: null, pendingAce: false }; }
  const pile = [...s.pile, trick];
  if (s.pending === w.seat && !(s.config.sir === 'doubleAce' && ace && s.pendingAce)) { tt[team(w.seat)] += pile.length; return { ...s, teamTricks: tt, pile: [], pending: null, pendingAce: false }; }
  return { ...s, pile, pending: w.seat, pendingAce: ace };
}

export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn) throw new Error(`Not seat ${seat}'s turn`);
  if (a.type === 'trump') {
    if (s.phase !== 'trump') throw new Error('Trump already chosen');
    const hands = s.hands.map((h, i) => sortHand([...h, ...s.rest[i]]));
    return { ...s, trump: a.suit, hands, handSizes: [13, 13, 13, 13], rest: [[], [], [], []], phase: 'playing', turn: s.caller };
  }
  if (s.phase !== 'playing' || !legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card];
  const trump = s.trump === null && trick.length > 1 && a.card.suit !== trick[0].card.suit ? a.card.suit : s.trump; // be-ranga: first void play sets trump
  const st: State = { ...s, hands, handSizes: hands.map(h => h.length), trick, played, trump };
  if (trick.length < 4) return { ...st, turn: (seat + 1) % 4 };
  const winner = trickWinner(trick, trump).seat, r = resolveTrick(st, trick);
  const next: State = { ...r, trick: [], lastTrick: { cards: trick, winner }, turn: winner };
  return hands[0].length ? next : endDeal(next, winner);
}
function endDeal(s: State, lastWinner: number): State {
  const tt = [...s.teamTricks]; tt[team(lastWinner)] += s.pile.length; // any unclaimed pile goes to the last trick's winner
  const win = tt[0] >= 7 ? 0 : 1, court = tt[win] === 13, pts = court ? 3 : 1;
  const points = [0, 1, 2, 3].map(i => (team(i) === win ? pts : 0)), totals = s.totals.map((t, i) => t + points[i]);
  const history = [...s.history, { round: s.round + 1, trump: s.trump, tricks: tt, points, totals, court }];
  return { ...s, teamTricks: tt, pile: [], pending: null, totals, history, phase: Math.max(...totals) >= s.config.target ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % 4 });
}
export function view(s: State, seat: number): State { return { ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), rest: s.rest.map(() => []) }; }
export const winners = (s: State) => (s.totals[0] >= s.totals[1] ? [0, 2] : [1, 3]);
