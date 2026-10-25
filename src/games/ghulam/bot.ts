import type { Level } from '../types';
import { Action, State } from './engine';

/** Ghulam Chor is almost pure luck: the victim re-shuffles after every draw, so no card position means anything. Every level picks at random. */
export function chooseAction(v: State, _seat: number, _level: Level, rng: () => number): Action {
  return { type: 'draw', index: Math.floor(rng() * v.handSizes[v.victim]) };
}
