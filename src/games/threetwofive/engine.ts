import { Card, Suit, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

export interface TDPConfig { rounds: number; scoring: 'difference' | 'hands'; sevensTop: boolean }
export const defaultConfig: TDPConfig = { rounds: 5, scoring: 'difference', sevensTop: false };
export type Action = { type: 'trump'; suit: Suit } | { type: 'give'; card: Card } | { type: 'play'; card: Card };
export interface RoundResult { round: number; trump: Suit | null; targets: number[]; won: number[]; points: number[]; totals: number[]; pulls: number }
export interface Pull { puller: number; victim: number }
export interface State extends BaseState {
  config: TDPConfig; seed: number; history: RoundResult[]; leader: number; trump: Suit | null; targets: number[];
  rest: Card[][]; won: number[]; played: Card[]; pulls: Pull[]; pulled: Card | null;
}
/** 30 cards: 8 to Ace in every suit plus the 7 of hearts and 7 of spades. */
export const deck30 = () => standardDeck().filter(c => c.rank >= 8 || (c.rank === 7 && (c.suit === 0 || c.suit === 1)));
export const targetsFor = (dealer: number) => { const t = [0, 0, 0]; t[(dealer + 1) % 3] = 5; t[(dealer + 2) % 3] = 3; t[dealer] = 2; return t; };

/** Who may pull cards next round: every extra trick over target lets you pull one random card from someone who fell short. */
export function computePulls(won: number[], targets: number[], cur: number[]): Pull[] {
  const extra = won.map((w, i) => Math.max(0, w - targets[i])), short = won.map((w, i) => Math.max(0, targets[i] - w)), out: Pull[] = [];
  for (const p of [0, 1, 2].filter(i => extra[i] > 0).sort((a, b) => cur[b] - cur[a])) {
    while (extra[p] > 0) {
      const v = [0, 1, 2].filter(j => short[j] > 0).sort((a, b) => short[b] - short[a] || cur[a] - cur[b])[0];
      if (v === undefined) break; out.push({ puller: p, victim: v }); short[v]--; extra[p]--;
    }
  }
  return out;
}
function deal(s: State): State {
  const d = shuffle(deck30(), makeRng(s.seed * 1087 + s.round * 4909)), leader = (s.dealer + 1) % 3;
  const hands = [0, 1, 2].map(i => sortHand(d.slice(i * 5, i * 5 + 5))), rest = [0, 1, 2].map(i => d.slice(15 + i * 5, 20 + i * 5));
  return { ...s, hands, rest, handSizes: [5, 5, 5], leader, turn: leader, phase: 'trump', trump: null, targets: targetsFor(s.dealer), trick: [], lastTrick: null, won: [0, 0, 0], played: [], pulls: [], pulled: null };
}
export function create(config: TDPConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'trump', round: 0, dealer: 0, turn: 1, hands: [], handSizes: [], trick: [], lastTrick: null, totals: [0, 0, 0], history: [],
    leader: 1, trump: null, targets: [], rest: [], won: [], played: [], pulls: [], pulled: null });
}
/** Higher is stronger. With sevensTop, 7 of hearts then 7 of spades beat everything. */
const power = (c: Card, trump: Suit | null, led: Suit, top: boolean) =>
  top && c.rank === 7 && c.suit === 1 ? 1000 : top && c.rank === 7 && c.suit === 0 ? 999 : c.suit === trump ? 100 + c.rank : c.suit === led ? c.rank : 0;
export const trickWinner = (t: Trick[], trump: Suit | null, top: boolean) => t.reduce((a, b) => (power(b.card, trump, t[0].card.suit, top) > power(a.card, trump, t[0].card.suit, top) ? b : a));
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat]; if (!s.trick.length) return hand;
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit); return follow.length ? follow : hand;
}
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn) return [];
  if (s.phase === 'trump') return ([0, 1, 2, 3] as Suit[]).map(suit => ({ type: 'trump' as const, suit }));
  if (s.phase === 'exchange') return s.hands[seat].map(card => ({ type: 'give' as const, card }));
  return s.phase === 'playing' ? legalPlays(s, seat).map(card => ({ type: 'play' as const, card })) : [];
}
function startPull(s: State): State {
  if (!s.pulls.length) return { ...s, phase: 'playing', turn: s.leader, pulled: null };
  const { puller, victim } = s.pulls[0], rng = makeRng(s.seed * 31 + s.round * 131 + s.pulls.length);
  const card = s.hands[victim][Math.floor(rng() * s.hands[victim].length)], hands = s.hands.map(h => [...h]);
  hands[victim] = hands[victim].filter(c => !sameCard(c, card)); hands[puller] = sortHand([...hands[puller], card]);
  return { ...s, hands, handSizes: hands.map(h => h.length), phase: 'exchange', turn: puller, pulled: card };
}
export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn) throw new Error(`Not seat ${seat}'s turn`);
  if (a.type === 'trump') {
    if (s.phase !== 'trump') throw new Error('Trump already chosen');
    const hands = s.hands.map((h, i) => sortHand([...h, ...s.rest[i]])), prev = s.history[s.history.length - 1];
    return startPull({ ...s, trump: a.suit, hands, handSizes: [10, 10, 10], rest: [[], [], []], pulls: prev ? computePulls(prev.won, prev.targets, s.targets) : [] });
  }
  if (a.type === 'give') {
    if (s.phase !== 'exchange' || !s.hands[seat].some(c => sameCard(c, a.card))) throw new Error('Illegal give');
    const victim = s.pulls[0].victim, hands = s.hands.map(h => [...h]);
    hands[seat] = hands[seat].filter(c => !sameCard(c, a.card)); hands[victim] = sortHand([...hands[victim], a.card]);
    return startPull({ ...s, hands, handSizes: hands.map(h => h.length), pulls: s.pulls.slice(1) });
  }
  if (s.phase !== 'playing' || !legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card], st = { ...s, hands, handSizes: hands.map(h => h.length), trick, played };
  if (trick.length < 3) return { ...st, turn: (seat + 1) % 3 };
  const winner = trickWinner(trick, s.trump, s.config.sevensTop).seat, won = [...s.won]; won[winner]++;
  const next: State = { ...st, trick: [], lastTrick: { cards: trick, winner }, won, leader: winner, turn: winner };
  return hands[0].length ? next : endRound(next);
}
function endRound(s: State): State {
  const points = s.won.map((w, i) => (s.config.scoring === 'hands' ? w : w - s.targets[i])), totals = s.totals.map((t, i) => t + points[i]);
  const prev = s.history[s.history.length - 1];
  const pulls = prev ? computePulls(prev.won, prev.targets, s.targets).length : 0;
  const history = [...s.history, { round: s.round + 1, trump: s.trump, targets: s.targets, won: s.won, points, totals, pulls }];
  return { ...s, totals, history, phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % 3 });
}
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), rest: s.rest.map(() => []), pulled: s.turn === seat ? s.pulled : null });
export const winners = (s: State) => { const m = Math.max(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
