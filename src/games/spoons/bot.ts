import type { Level } from '../types';
import { Action, State, bestPass, canGrab } from './engine';

/** Turn-free game: this is only used if something asks a bot for one immediate action. */
export function chooseAction(v: State, seat: number, _level: Level, rng: () => number): Action {
  return canGrab(v, seat) ? { type: 'grab' } : { type: 'pick', index: bestPass(v.hands[seat], rng) };
}
