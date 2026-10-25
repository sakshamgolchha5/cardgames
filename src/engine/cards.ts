export type Suit = 0 | 1 | 2 | 3 | 4; // 0 spades, 1 hearts, 2 diamonds, 3 clubs, 4 joker
export type CardSuit = Suit;
export interface Card { suit: Suit; rank: number } // rank 2..14 (14 = Ace); a joker is suit 4, rank 0
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣', '★'] as const;
export const rankLabel = (r: number) => ({ 0: 'JK', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[r] ?? String(r);
export const JOKER: Card = { suit: 4, rank: 0 };
export const isJoker = (c: Card) => c.suit === 4;
export const cardId = (c: Card) => `${'SHDCJ'[c.suit]}${c.rank}`;
export const sameCard = (a: Card, b: Card) => a.suit === b.suit && a.rank === b.rank;

export function standardDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ suit: s as Suit, rank: r });
  return d;
}
/** Deterministic PRNG (mulberry32) so every game and test can be replayed from a seed. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Decks of 52 plus two jokers each. */
export const deckWithJokers = (decks: number): Card[] => Array.from({ length: decks }).flatMap(() => [...standardDeck(), { ...JOKER }, { ...JOKER }]);
export const sortHand = (h: Card[]) => [...h].sort((a, b) => a.suit - b.suit || b.rank - a.rank);

/** Shorthand for examples and tests: parseCards('AS 10H 7D') -> cards. Suits S H D C; ranks 2-10 J Q K A. */
export function parseCards(s: string): Card[] {
  return s.split(/\s+/).filter(Boolean).map(t => t.toUpperCase() === 'JK' ? { ...JOKER } : ({ suit: 'SHDC'.indexOf(t.slice(-1).toUpperCase()) as Suit, rank: ({ A: 14, K: 13, Q: 12, J: 11 } as Record<string, number>)[t.slice(0, -1).toUpperCase()] ?? Number(t.slice(0, -1)) }));
}

export const rankPlural = (r: number) => ({ 14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks' } as Record<number, string>)[r] ?? `${r}s`;
