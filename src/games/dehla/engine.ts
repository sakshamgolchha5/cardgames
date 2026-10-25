import { Card, Suit, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';
import type { BaseState, Trick } from '../types';

/** cut: no trump until a player cannot follow suit; the suit they play becomes trump (Katte).
 *  band: the leader sets a card face down; its suit becomes trump when a player who cannot follow suit asks (Hide).
 *  random: a random card decides trump before play.  caller: leader names trump after seeing 5 cards. */
export type TrumpMode = 'cut' | 'band' | 'random' | 'caller';
export interface MendiConfig { trumpMode: TrumpMode; target: number; bonus: boolean }
export const defaultConfig: MendiConfig = { trumpMode: 'cut', target: 5, bonus: true };
export type Action = { type: 'trump'; suit: Suit } | { type: 'hide'; card: Card } | { type: 'ask' } | { type: 'play'; card: Card };
export interface RoundResult { round: number; trump: Suit | null; tens: number[]; tricks: number[]; points: number[]; totals: number[]; mendikot: boolean; whitewash: boolean }
export interface State extends BaseState {
  config: MendiConfig; seed: number; history: RoundResult[];
  leader: number; trump: Suit | null; hidden: { seat: number; card: Card | null } | null; mustTrump: number | null;
  rest: Card[][]; teamTricks: number[]; tens: number[]; played: Card[];
}
export const team = (seat: number) => seat % 2;

function deal(s: State): State {
  const rng = makeRng(s.seed * 1049 + s.round * 5693), deck = shuffle(standardDeck(), rng), leader = (s.dealer + 1) % 4;
  const base: State = { ...s, leader, trick: [], lastTrick: null, played: [], teamTricks: [0, 0], tens: [0, 0], mustTrump: null, hidden: null, trump: null, turn: leader, rest: [[], [], [], []] };
  if (s.config.trumpMode === 'caller') {
    const hands = [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 5, i * 5 + 5))), rest = [0, 1, 2, 3].map(i => deck.slice(20 + i * 8, 28 + i * 8));
    return { ...base, hands, handSizes: [5, 5, 5, 5], rest, phase: 'trump' };
  }
  const hands = [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 13, i * 13 + 13))), b = { ...base, hands, handSizes: [13, 13, 13, 13] };
  if (s.config.trumpMode === 'random') return { ...b, trump: deck[Math.floor(rng() * 52)].suit, phase: 'playing' };
  return { ...b, phase: s.config.trumpMode === 'band' ? 'trump' : 'playing' };
}
export function create(config: MendiConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: 1, hands: [], handSizes: [], trick: [], lastTrick: null, totals: [0, 0, 0, 0], history: [],
    leader: 1, trump: null, hidden: null, mustTrump: null, rest: [], teamTricks: [0, 0], tens: [0, 0], played: [] });
}
export function trickWinner(trick: Trick[], trump: Suit | null): Trick {
  const tr = trump === null ? [] : trick.filter(t => t.card.suit === trump);
  return (tr.length ? tr : trick.filter(t => t.card.suit === trick[0].card.suit)).reduce((a, b) => (b.card.rank > a.card.rank ? b : a));
}
export function legalPlays(s: State, seat: number): Card[] {
  const hand = s.hands[seat];
  if (s.mustTrump === seat) { const t = hand.filter(c => c.suit === s.trump); return t.length ? t : hand; }
  if (!s.trick.length) return hand;
  const follow = hand.filter(c => c.suit === s.trick[0].card.suit);
  return follow.length ? follow : hand;
}
export const canAsk = (s: State, seat: number) => s.config.trumpMode === 'band' && s.hidden !== null && s.trump === null && s.phase === 'playing' && seat === s.turn
  && s.trick.length > 0 && !s.hands[seat].some(c => c.suit === s.trick[0].card.suit);
export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn) return [];
  if (s.phase === 'trump') return s.config.trumpMode === 'band' ? s.hands[seat].map(card => ({ type: 'hide' as const, card })) : ([0, 1, 2, 3] as Suit[]).map(suit => ({ type: 'trump' as const, suit }));
  if (s.phase !== 'playing') return [];
  const acts: Action[] = legalPlays(s, seat).map(card => ({ type: 'play' as const, card }));
  if (canAsk(s, seat)) acts.push({ type: 'ask' });
  return acts;
}
/** Win rule for one deal: 3+ tens wins; 2-2 goes to the side with 7+ tricks. Mendikot (4 tens) and a 13-trick whitewash can score a bonus. */
export function scoreDeal(tens: number[], tricks: number[], cfg: MendiConfig) {
  const win = tens[0] >= 3 ? 0 : tens[1] >= 3 ? 1 : tricks[0] >= 7 ? 0 : 1;
  const whitewash = tricks[win] === 13, mendikot = tens[win] === 4;
  return { win, mendikot, whitewash, pts: cfg.bonus ? (whitewash ? 3 : mendikot ? 2 : 1) : 1 };
}

export function apply(s: State, seat: number, a: Action): State {
  if (seat !== s.turn) throw new Error(`Not seat ${seat}'s turn`);
  if (a.type === 'trump') {
    if (s.phase !== 'trump' || s.config.trumpMode !== 'caller') throw new Error('Cannot choose trump now');
    const hands = s.hands.map((h, i) => sortHand([...h, ...s.rest[i]]));
    return { ...s, trump: a.suit, hands, handSizes: [13, 13, 13, 13], rest: [[], [], [], []], phase: 'playing', turn: s.leader };
  }
  if (a.type === 'hide') {
    if (s.phase !== 'trump' || s.config.trumpMode !== 'band' || !s.hands[seat].some(c => sameCard(c, a.card))) throw new Error('Illegal hide');
    const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
    return { ...s, hands, handSizes: hands.map(h => h.length), hidden: { seat, card: a.card }, phase: 'playing', turn: s.leader };
  }
  if (a.type === 'ask') {
    if (!canAsk(s, seat)) throw new Error('Cannot ask for trump now');
    const hands = s.hands.map(h => [...h]), o = s.hidden!.seat; hands[o] = sortHand([...hands[o], s.hidden!.card!]);
    return { ...s, hands, handSizes: hands.map(h => h.length), trump: s.hidden!.card!.suit, hidden: null, mustTrump: seat };
  }
  if (s.phase !== 'playing' || !legalPlays(s, seat).some(c => sameCard(c, a.card))) throw new Error('Illegal play');
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card];
  const trump = s.config.trumpMode === 'cut' && s.trump === null && trick.length > 1 && a.card.suit !== trick[0].card.suit ? a.card.suit : s.trump;
  const st: State = { ...s, hands, handSizes: hands.map(h => h.length), trick, played, trump, mustTrump: null };
  if (trick.length < 4) return { ...st, turn: (seat + 1) % 4 };
  const winner = trickWinner(trick, trump).seat, tens = [...s.tens], tt = [...s.teamTricks];
  tens[team(winner)] += trick.filter(t => t.card.rank === 10).length; tt[team(winner)]++;
  let next: State = { ...st, trick: [], lastTrick: { cards: trick, winner }, turn: winner, leader: winner, tens, teamTricks: tt };
  if (next.hidden && next.hands[next.hidden.seat].length === 0 && next.hands.some(h => h.length > 0)) { // never revealed: card goes back for the last trick, no trump this deal
    const hs = next.hands.map(h => [...h]); hs[next.hidden.seat] = [next.hidden.card!]; next = { ...next, hands: hs, handSizes: hs.map(h => h.length), hidden: null };
  }
  return next.hands.every(h => h.length === 0) ? endDeal(next) : next;
}
function endDeal(s: State): State {
  const r = scoreDeal(s.tens, s.teamTricks, s.config), points = [0, 1, 2, 3].map(i => (team(i) === r.win ? r.pts : 0)), totals = s.totals.map((t, i) => t + points[i]);
  const history = [...s.history, { round: s.round + 1, trump: s.trump, tens: s.tens, tricks: s.teamTricks, points, totals, mendikot: r.mendikot, whitewash: r.whitewash }];
  return { ...s, totals, history, phase: Math.max(...totals) >= s.config.target ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % 4 });
}
export function view(s: State, seat: number): State {
  return { ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), rest: s.rest.map(() => []), hidden: s.hidden ? { seat: s.hidden.seat, card: s.hidden.seat === seat ? s.hidden.card : null } : null };
}
export const winners = (s: State) => (s.totals[0] >= s.totals[1] ? [0, 2] : [1, 3]);
