import type { Card, Suit } from '../engine/cards';
export type Level = 'easy' | 'medium' | 'hard';
export interface Trick { seat: number; card: Card }
/** Fields every trick-taking engine exposes so the shared table UI can render it. */
export interface BaseState {
  phase: 'bidding' | 'passing' | 'trump' | 'exchange' | 'playing' | 'roundEnd' | 'gameEnd';
  round: number; dealer: number; turn: number;
  hands: Card[][]; handSizes: number[]; trick: Trick[];
  lastTrick: { cards: Trick[]; winner: number } | null;
  totals: number[]; history: unknown[];
}
export type GAction = { type: 'bid'; n: number } | { type: 'play'; card: Card } | { type: 'pass'; cards: Card[] } | { type: 'trump'; suit: Suit } | { type: 'hide'; card: Card } | { type: 'ask' } | { type: 'give'; card: Card } | { type: 'claim'; cards: Card[]; rank: number } | { type: 'call' } | { type: 'skip' } | { type: 'draw'; index: number } | { type: 'stock' } | { type: 'open' } | { type: 'throw'; card: Card } | { type: 'show'; card: Card } | { type: 'drop' } | { type: 'set'; cards: Card[] } | { type: 'return'; cards: Card[] } | { type: 'pick'; index: number } | { type: 'grab' } | { type: 'discard'; cards: Card[] } | { type: 'discard'; card: Card } | { type: 'declare'; card: Card } | { type: 'yaniv' } | { type: 'take' } | { type: 'swap'; index: number } | { type: 'dump' } | { type: 'peek'; index: number } | { type: 'spy'; seat: number; index: number } | { type: 'trade'; mine: number; seat: number; index: number } | { type: 'cabo' } | { type: 'done' } | { type: 'drawDeck' } | { type: 'drawDiscard'; end: 'first' | 'last' };
export interface OptionDef { key: string; label: string; choices: [string | number | boolean, string][]; def: string | number | boolean }
export interface ScoreRow { label: string; cells: { sub?: string; pts: number }[] }
/** Everything the UI needs to know about a game; engines stay free of UI code. */
export interface GameDef {
  id: string; name: string; players: number; seatsOf?: (cfg: any) => number; icon: string; tagline: string; options: OptionDef[]; lowWins?: boolean; hint: string;
  create(cfg: any, seed: number): any; view(s: any, seat: number): any; apply(s: any, seat: number, a: GAction): any; nextRound(s: any): any;
  legalActions(s: any, seat: number): GAction[]; chooseAction(v: any, seat: number, level: Level, rng: () => number): GAction;
  validate?(s: any, seat: number, a: GAction): boolean; noPassPlay?: boolean; suggest?(s: any, seat: number): number[][]; summary?(s: any, names: string[]): string[]; limitMs?(cfg: any): number;
  /** Real-time games: what should happen next without a turn order. Bots act after a human-like delay; humans who run out of time are auto-played. Each item's key stays the same while the situation does, so running timers are not restarted. */
  plan?(s: any, level: Level, rng: () => number, humans: Set<number>, limitMs: number): { key: string; seat: number; action: GAction; delay: number; human: boolean }[]; eventText?(s: any, names: string[]): string; infoText?(s: any, names: string[]): string; seatNote?(s: any, seat: number): string; pace?: number; roundLabel(s: any, cfg: any): string; badge(v: any, seat: number): string; rows(history: any[]): ScoreRow[]; winners(s: any): number[];
}

/** Seats used in a match (most games are fixed; Confidence lets you pick 3-8). */
export const seatsOf = (def: GameDef, cfg: any): number => (def.seatsOf ? def.seatsOf(cfg) : def.players);
