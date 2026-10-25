import { Card, isJoker } from '../../engine/cards';

/** Rummy meld rules. A "wild" is a printed joker or any card of the wild rank (the cut joker). Ace counts low (A-2-3) or high (Q-K-A), never both (no K-A-2). */
export const value = (c: Card) => (isJoker(c) ? 0 : c.rank >= 11 || c.rank === 14 ? 10 : c.rank);
const pop = (m: number) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const aceOptions = (ranks: number[]): number[][] => ranks.reduce<number[][]>((acc, r) => (r === 14 ? acc.flatMap(a => [[...a, 1], [...a, 14]]) : acc.map(a => [...a, r])), [[]]);
/** all cards natural, one suit, consecutive ranks, no jokers */
export function isPure(cs: Card[]): boolean {
  if (cs.length < 3 || cs.some(isJoker) || cs.some(c => c.suit !== cs[0].suit)) return false;
  return aceOptions(cs.map(c => c.rank)).some(r => { const s = [...r].sort((a, b) => a - b); return new Set(s).size === s.length && s[s.length - 1] - s[0] + 1 === s.length; });
}
export function isSequence(cs: Card[], wild: number): boolean {
  if (cs.length < 3) return false;
  const nat = cs.filter(c => !(isJoker(c) || c.rank === wild)); if (!nat.length || nat.some(c => c.suit !== nat[0].suit)) return false;
  return aceOptions(nat.map(c => c.rank)).some(r => { const s = [...r].sort((a, b) => a - b); return new Set(s).size === s.length && s[s.length - 1] - s[0] + 1 <= cs.length && cs.length <= 14; });
}
export function isSet(cs: Card[], wild: number): boolean {
  if (cs.length < 3 || cs.length > 4) return false;
  const nat = cs.filter(c => !(isJoker(c) || c.rank === wild)); if (!nat.length) return false;
  return nat.every(c => c.rank === nat[0].rank) && new Set(nat.map(c => c.suit)).size === nat.length;
}
interface Meld { mask: number; pure: boolean; seq: boolean }
function melds(cards: Card[], wild: number): Meld[] {
  const n = cards.length, out: Meld[] = [];
  for (let m = 7; m < 1 << n; m++) {
    if (pop(m) < 3) continue; const cs = cards.filter((_, i) => m & (1 << i)), pure = isPure(cs), seq = pure || isSequence(cs, wild);
    if (seq || isSet(cs, wild)) out.push({ mask: m, pure, seq });
  }
  return out;
}
export interface Solved { groups: number[][]; rest: number[]; deadwood: number; hasPure: boolean; seqs: number }
/** Best way to group a hand: fewest leftover points, with a pure sequence required to count any group (otherwise the whole hand counts). */
export function solve(cards: Card[], wild: number): Solved {
  const n = cards.length, full = (1 << n) - 1, all = melds(cards, wild), by: Meld[][] = Array.from({ length: n }, () => []);
  for (const m of all) by[31 - Math.clz32(m.mask & -m.mask) === 0 ? 0 : 31 - Math.clz32(m.mask & -m.mask)].push(m);
  const val = cards.map(value), total = val.reduce((a, b) => a + b, 0), memo = new Map<number, { v: number; pick: Meld | null }>();
  const g = (rem: number, pure: number): { v: number; pick: Meld | null } => {   // minimum leftover value; the lowest card is either left over or goes into a meld
    if (!rem) return { v: pure ? 0 : Infinity, pick: null };
    const key = rem * 2 + pure, hit = memo.get(key); if (hit) return hit;
    const i = 31 - Math.clz32(rem & -rem); let best = { v: g(rem & (rem - 1), pure).v + val[i], pick: null as Meld | null };
    for (const m of by[i]) if ((m.mask & rem) === m.mask) { const r = g(rem & ~m.mask, pure || (m.pure ? 1 : 0)).v; if (r < best.v) best = { v: r, pick: m }; }
    memo.set(key, best); return best;
  };
  const start = g(full, 0), hasPure = start.v !== Infinity;
  if (!hasPure) return { groups: [], rest: cards.map((_, i) => i), deadwood: total, hasPure: false, seqs: 0 };
  const groups: number[][] = [], rest: number[] = []; let rem = full, pure = 0, seqs = 0;
  while (rem) {
    const i = 31 - Math.clz32(rem & -rem), r = g(rem, pure);
    if (r.pick) { groups.push(cards.map((_, k) => k).filter(k => r.pick!.mask & (1 << k))); rem &= ~r.pick.mask; if (r.pick.pure) pure = 1; if (r.pick.seq) seqs++; } else { rest.push(i); rem &= rem - 1; }
  }
  return { groups, rest, deadwood: start.v, hasPure: true, seqs };
}
/** A 13-card hand can be shown if every card sits in a valid group, with at least two sequences of which one is pure. */
export function canShow(cards: Card[], wild: number): boolean {
  const n = cards.length, all = melds(cards, wild), by: Meld[][] = Array.from({ length: n }, () => []);
  for (const m of all) by[31 - Math.clz32(m.mask & -m.mask)].push(m);
  const memo = new Map<number, boolean>();
  const h = (rem: number, pure: number, seq: number): boolean => {
    if (!rem) return !!pure && seq >= 2; const key = (rem * 2 + pure) * 3 + seq, hit = memo.get(key); if (hit !== undefined) return hit;
    const i = 31 - Math.clz32(rem & -rem); let ok = false;
    for (const m of by[i]) if ((m.mask & rem) === m.mask && h(rem & ~m.mask, pure || (m.pure ? 1 : 0), Math.min(2, seq + (m.seq ? 1 : 0)))) { ok = true; break; }
    memo.set(key, ok); return ok;
  };
  return h((1 << n) - 1, 0, 0);
}
/** Index of a card to discard so the other 13 can be shown, or -1. */
export function showCard(cards14: Card[], wild: number): number {
  const order = cards14.map((c, i) => i).sort((a, b) => value(cards14[b]) - value(cards14[a]));
  for (const i of order) if (canShow(cards14.filter((_, k) => k !== i), wild)) return i;
  return -1;
}
