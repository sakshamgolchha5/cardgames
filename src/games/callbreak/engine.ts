import { Card, sameCard, sortHand, standardDeck, makeRng, shuffle } from '../../engine/cards';

export type Mode = 'normal' | 'super8' | 'blind';
export interface CallbreakConfig { rounds: 3 | 5; mode: Mode; mustBeat: boolean; redealNoSpade: boolean }
export const defaultConfig: CallbreakConfig = { rounds: 5, mode: 'normal', mustBeat: true, redealNoSpade: false };
export const MAX_BID = 8;

export type Action = { type: 'bid'; n: number } | { type: 'play'; card: Card };
export interface RoundResult { round: number; bids: number[]; won: number[]; points: number[]; totals: number[] }
export interface Trick { seat: number; card: Card }
export interface State {
  config: CallbreakConfig; seed: number;
  phase: 'bidding' | 'playing' | 'roundEnd' | 'gameEnd';
  round: number; dealer: number; leader: number; turn: number;
  hands: Card[][]; handSizes: number[];
  bids: (number | null)[]; won: number[];
  trick: Trick[]; lastTrick: { cards: Trick[]; winner: number } | null;
  played: Card[]; history: RoundResult[]; totals: number[];
}

function deal(s: State): State {
  let attempt = 0, hands: Card[][];
  do {
    const rng = makeRng(s.seed * 1009 + s.round * 7919 + attempt++);
    const deck = shuffle(standardDeck(), rng);
    hands = [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 13, i * 13 + 13)));
  } while (s.config.redealNoSpade && hands.some(h => !h.some(c => c.suit === 0)) && attempt < 50);
  const leader = (s.dealer + 1) % 4, super8 = s.config.mode === 'super8';
  return { ...s, hands, handSizes: [13, 13, 13, 13], leader, turn: leader, trick: [], lastTrick: null, played: [], won: [0, 0, 0, 0],
    bids: super8 ? [8, 8, 8, 8] : [null, null, null, null], phase: super8 ? 'playing' : 'bidding' };
}
export function create(config: CallbreakConfig = defaultConfig, seed = 1): State {
  return deal({ config, seed, phase: 'bidding', round: 0, dealer: 0, leader: 1, turn: 1, hands: [], handSizes: [], bids: [], won: [],
    trick: [], lastTrick: null, played: [], history: [], totals: [0, 0, 0, 0] });
}
export const currentWinner = (t: Trick[]): Trick => {
  const led = t[0].card.suit, sp = t.filter(x => x.card.suit === 0);
  return (sp.length ? sp : t.filter(x => x.card.suit === led)).reduce((a, b) => (b.card.rank > a.card.rank ? b : a));
};

export function legalActions(s: State, seat: number): Action[] {
  if (seat !== s.turn) return [];
  if (s.phase === 'bidding') return Array.from({ length: MAX_BID }, (_, i) => ({ type: 'bid' as const, n: i + 1 }));
  if (s.phase !== 'playing') return [];
  const hand = s.hands[seat], must = s.config.mustBeat;
  let cards = hand;
  if (s.trick.length) {
    const led = s.trick[0].card.suit, w = currentWinner(s.trick).card, follow = hand.filter(c => c.suit === led);
    if (follow.length) {
      const higher = follow.filter(c => c.rank > w.rank);
      cards = must && w.suit === led && higher.length ? higher : follow;
    } else {
      const sp = hand.filter(c => c.suit === 0);
      if (sp.length) { const higher = sp.filter(c => c.rank > w.rank); cards = must && w.suit === 0 && higher.length ? higher : sp; }
    }
  }
  return cards.map(card => ({ type: 'play' as const, card }));
}

export function apply(s: State, seat: number, a: Action): State {
  const ok = legalActions(s, seat).some(l => (l.type === 'bid' && a.type === 'bid' && l.n === a.n) || (l.type === 'play' && a.type === 'play' && sameCard(l.card, a.card)));
  if (!ok) throw new Error(`Illegal action by seat ${seat}`);
  if (a.type === 'bid') {
    const bids = [...s.bids]; bids[seat] = a.n;
    const done = bids.every(b => b !== null);
    return { ...s, bids, phase: done ? 'playing' : 'bidding', turn: done ? s.leader : (seat + 1) % 4 };
  }
  const hands = s.hands.map(h => [...h]); hands[seat] = hands[seat].filter(c => !sameCard(c, a.card));
  const handSizes = hands.map(h => h.length), trick = [...s.trick, { seat, card: a.card }], played = [...s.played, a.card];
  if (trick.length < 4) return { ...s, hands, handSizes, trick, played, turn: (seat + 1) % 4 };
  const winner = currentWinner(trick).seat, won = [...s.won]; won[winner]++;
  const next: State = { ...s, hands, handSizes, trick: [], played, won, lastTrick: { cards: trick, winner }, leader: winner, turn: winner };
  return hands[0].length ? next : endRound(next);
}
export const scoreOf = (bid: number, won: number) => (won >= bid ? Math.round((bid + (won - bid) / 10) * 10) / 10 : -bid);
function endRound(s: State): State {
  const bids = s.bids as number[], points = bids.map((b, i) => scoreOf(b, s.won[i]));
  const totals = s.totals.map((t, i) => Math.round((t + points[i]) * 10) / 10);
  const history = [...s.history, { round: s.round + 1, bids, won: s.won, points, totals }];
  return { ...s, totals, history, phase: s.round + 1 >= s.config.rounds ? 'gameEnd' : 'roundEnd' };
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % 4 });
}
/** What a seat may know: own hand only; in blind mode other bids stay hidden until the round ends. */
export function view(s: State, seat: number): State {
  const blind = s.config.mode === 'blind' && (s.phase === 'bidding' || s.phase === 'playing');
  return { ...s, hands: s.hands.map((h, i) => (i === seat ? h : [])), bids: s.bids.map((b, i) => (blind && i !== seat ? null : b)) };
}
export const winners = (s: State) => { const m = Math.max(...s.totals); return s.totals.map((t, i) => (t === m ? i : -1)).filter(i => i >= 0); };
