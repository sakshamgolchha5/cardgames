import { Card, makeRng, shuffle, sortHand, standardDeck } from '../../engine/cards';
import type { BaseState, GAction, Level } from '../types';

/** Spoons: everyone holds 4 cards and, at the same moment, passes one card to the left. The first player draws from the deck and the last discards.
 *  With four of a kind you grab a spoon; once somebody has grabbed, everybody may. There is one spoon fewer than players: whoever is left without one gets a letter. */
export interface SpoonsConfig { players: number; limit: 'relaxed' | 'normal' | 'fast'; letters: 3 | 5 }
export const defaultConfig: SpoonsConfig = { players: 5, limit: 'normal', letters: 5 };
export const LIMIT_MS = { relaxed: 8000, normal: 5000, fast: 3000 } as const;
export const WORD = 'SPOON';
export type Action = { type: 'pick'; index: number } | { type: 'grab' };
export interface RoundResult { round: number; loser: number; letter: string; eliminated: boolean; order: number[]; points: number[]; totals: number[] }
export interface State extends BaseState {
  config: SpoonsConfig; seed: number; history: RoundResult[]; stage: 'pass' | 'grab'; deck: Card[]; waste: Card[]; deckCount: number;
  picks: (number | null)[]; picked: boolean[]; myPick: number | null; active: boolean[]; letters: number[]; spoons: number; grabbed: boolean[]; grabOrder: number[]; tick: number;
  ring: number[]; loser: number | null; revealed: boolean;
}
export const hasFour = (h: Card[]) => h.length === 4 && h.every(c => c.rank === h[0].rank);
const activeSeats = (a: boolean[]) => a.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
export const refresh = (s: State): State => ({ ...s, handSizes: s.hands.map(h => h.length), deckCount: s.deck.length, spoons: Math.max(0, activeSeats(s.active).length - 1 - s.grabOrder.length) });

function deal(s: State): State {
  const act = activeSeats(s.active), n = s.config.players, rng = makeRng(s.seed * 1409 + s.round * 5381), deck = shuffle(standardDeck(), rng);
  const hands: Card[][] = Array.from({ length: n }, () => []); let k = 0; for (const seat of act) { hands[seat] = sortHand(deck.slice(k, k + 4)); k += 4; }
  let dealer = s.dealer; if (!s.active[dealer]) dealer = act.find(a => a > dealer) ?? act[0];
  const start = act.find(a => a > dealer) ?? act[0], ring = act.map((_, i) => act[(act.indexOf(start) + i) % act.length]);
  const base: State = { ...s, dealer, hands, deck: deck.slice(k), waste: [], ring, stage: 'pass', picks: Array(n).fill(null), picked: Array(n).fill(false), myPick: null, grabbed: Array(n).fill(false), grabOrder: [],
    loser: null, revealed: false, tick: 0, phase: 'playing', turn: -1, trick: [], lastTrick: null };
  return refresh({ ...base, stage: act.some(a => hasFour(hands[a])) ? 'grab' : 'pass' });
}
export function create(config: SpoonsConfig = defaultConfig, seed = 1): State {
  const n = config.players;
  return deal({ config, seed, phase: 'playing', round: 0, dealer: 0, turn: -1, hands: [], handSizes: [], trick: [], lastTrick: null, totals: Array(n).fill(0), history: [], stage: 'pass', deck: [], waste: [], deckCount: 0,
    picks: [], picked: [], myPick: null, active: Array(n).fill(true), letters: Array(n).fill(0), spoons: n - 1, grabbed: [], grabOrder: [], tick: 0, ring: [], loser: null, revealed: false });
}
export const canGrab = (s: State, seat: number) => s.phase === 'playing' && s.stage === 'grab' && s.active[seat] && !s.grabbed[seat] && (hasFour(s.hands[seat]) || s.grabOrder.length > 0);
export function legalActions(s: State, seat: number): Action[] {
  if (s.phase !== 'playing' || !s.active[seat]) return [];
  const acts: Action[] = []; if (s.stage === 'pass') s.hands[seat].forEach((_, index) => acts.push({ type: 'pick', index })); if (canGrab(s, seat)) acts.push({ type: 'grab' }); return acts;
}
/** Everyone passes at once: ring[0] draws from the deck, each other player receives the previous player's card, and the last card goes to the waste pile. */
function runTick(s: State): State {
  const hands = s.hands.map(h => [...h]), out = s.ring.map(seat => hands[seat].splice(s.picks[seat]!, 1)[0]);
  let deck = [...s.deck], waste = [...s.waste];
  if (!deck.length) { deck = shuffle(waste, makeRng(s.seed * 61 + s.round * 17 + s.tick)); waste = []; }
  s.ring.forEach((seat, i) => { hands[seat] = sortHand([...hands[seat], i === 0 ? deck.shift()! : out[i - 1]]); });
  waste.push(out[out.length - 1]);
  const next = refresh({ ...s, hands, deck, waste, picks: s.picks.map(() => null), picked: s.picked.map(() => false), tick: s.tick + 1 });
  return { ...next, stage: s.ring.some(seat => hasFour(hands[seat])) ? 'grab' : 'pass' };
}
export function apply(s: State, seat: number, a: Action): State {
  if (s.phase !== 'playing' || !s.active[seat]) throw new Error('Not in the game');
  if (a.type === 'pick') {
    if (s.stage !== 'pass' || !Number.isInteger(a.index) || a.index < 0 || a.index >= s.hands[seat].length) throw new Error('Cannot pick now');
    const picks = [...s.picks], picked = [...s.picked]; picks[seat] = a.index; picked[seat] = true;
    const st = { ...s, picks, picked };
    return s.ring.every(q => picks[q] !== null) ? runTick(st) : st;
  }
  if (!canGrab(s, seat)) throw new Error('You cannot grab a spoon yet');
  const grabbed = [...s.grabbed], grabOrder = [...s.grabOrder, seat]; grabbed[seat] = true;
  const st = refresh({ ...s, grabbed, grabOrder });
  return grabOrder.length >= activeSeats(s.active).length - 1 ? endRound(st) : st;
}
function endRound(s: State): State {
  const loser = activeSeats(s.active).find(q => !s.grabbed[q])!, letters = [...s.letters]; letters[loser]++;
  const active = [...s.active], eliminated = letters[loser] >= s.config.letters; if (eliminated) active[loser] = false;
  const points = letters.map((_, i) => (i === loser ? 1 : 0)), history = [...s.history, { round: s.round + 1, loser, letter: WORD[letters[loser] - 1], eliminated, order: s.grabOrder, points, totals: letters }];
  return refresh({ ...s, letters, active, loser, totals: letters, history, revealed: true, phase: activeSeats(active).length <= 1 ? 'gameEnd' : 'roundEnd' });
}
export function nextRound(s: State): State {
  if (s.phase !== 'roundEnd') throw new Error('Round not finished');
  return deal({ ...s, round: s.round + 1, dealer: (s.dealer + 1) % s.config.players });
}
/** Hands stay private until the round is over; other players' picks are only "picked or not". */
export const view = (s: State, seat: number): State => ({ ...s, hands: s.hands.map((h, i) => (i === seat || s.revealed ? h : [])), deck: [], waste: [], picks: s.picks.map(() => null), myPick: s.picks[seat] ?? null });
export const winners = (s: State) => { const alive = activeSeats(s.active); if (alive.length === 1) return alive; const m = Math.min(...s.letters); return s.letters.map((l, i) => (l === m ? i : -1)).filter(i => i >= 0); };

// ---- what happens next, without a turn order (used by the app and by tests) ----
const keepCount = (h: Card[], c: Card) => h.filter(x => x.rank === c.rank).length;
/** Pass the card you have the fewest of, so the biggest group stays in hand. */
export const bestPass = (h: Card[], rng: () => number): number => { const m = Math.min(...h.map(c => keepCount(h, c))), cs = h.map((c, i) => (keepCount(h, c) === m ? i : -1)).filter(i => i >= 0); return cs[Math.floor(rng() * cs.length)]; };
const think = (l: Level, rng: () => number) => (l === 'easy' ? 900 + rng() * 900 : l === 'medium' ? 600 + rng() * 700 : 400 + rng() * 500);
const react = (l: Level, rng: () => number) => (l === 'easy' ? 1100 + rng() * 1100 : l === 'medium' ? 650 + rng() * 800 : 350 + rng() * 450);
export function plan(s: State, level: Level, rng: () => number, humans: Set<number>, limitMs: number): { key: string; seat: number; action: GAction; delay: number; human: boolean }[] {
  const out: { key: string; seat: number; action: GAction; delay: number; human: boolean }[] = [];
  if (s.phase !== 'playing') return out;
  for (const seat of activeSeats(s.active)) {
    const h = s.hands[seat], isHuman = humans.has(seat);
    if (s.stage === 'pass' && s.picks[seat] === null) {
      const index = level === 'easy' && !isHuman && rng() < 0.4 ? Math.floor(rng() * h.length) : bestPass(h, rng);
      out.push({ key: `p|${s.round}|${s.tick}|${seat}`, seat, action: { type: 'pick', index }, delay: isHuman ? limitMs : think(level, rng), human: isHuman });   // humans who run out of time are auto-played
    } else if (s.stage === 'grab' && !s.grabbed[seat] && (hasFour(h) || s.grabOrder.length > 0)) {
      // bots react like people; a human who never taps is auto-grabbed after a long wait so the game cannot freeze
      out.push({ key: `g|${s.round}|${s.tick}|${seat}`, seat, action: { type: 'grab' }, delay: isHuman ? limitMs * 2 : react(level, rng) + (hasFour(h) ? 0 : 250), human: isHuman });
    }
  }
  return out;
}
