import { describe, it, expect } from 'vitest';
import { parseCards } from '../src/engine/cards';
import * as R from '../src/games/rummy/solver';

const P = (s: string) => parseCards(s);
describe('melds', () => {
  it('pure sequence: 3+ consecutive cards of one suit with no joker; Ace low or high but no wrap', () => {
    for (const ok of ['4H 5H 6H', 'AH 2H 3H', 'QH KH AH', '9S 10S JS QS']) expect(R.isPure(P(ok)), ok).toBe(true);
    for (const bad of ['4H 5H', '4H 5S 6H', 'KH AH 2H', '4H JK 6H', '4H 6H 7H']) expect(R.isPure(P(bad)), bad).toBe(false);
  });
  it('impure sequence: gaps filled by jokers or by wild-rank cards', () => {
    expect(R.isSequence(P('4H JK 6H'), 9)).toBe(true); expect(R.isSequence(P('4H 9D 6H'), 9)).toBe(true); expect(R.isSequence(P('4H 6H 7H'), 9)).toBe(false); expect(R.isSequence(P('4H JK JK JK 8H'), 9)).toBe(true); expect(R.isSequence(P('4H JK JK 8H'), 9)).toBe(false); expect(R.isSequence(P('4H JK JK 9H'), 2)).toBe(false);
  });
  it('set: 3-4 cards of one rank, all different suits; wilds may stand in', () => {
    expect(R.isSet(P('7H 7D 7S'), 3)).toBe(true); expect(R.isSet(P('7H 7D 7S 7C'), 3)).toBe(true); expect(R.isSet(P('7H 7H 7S'), 3)).toBe(false); expect(R.isSet(P('7H JK 7S'), 3)).toBe(true); expect(R.isSet(P('7H 7D'), 3)).toBe(false); expect(R.isSet(P('7H 7D 7S 7C 7H'), 3)).toBe(false);
  });
});
describe('showing a hand', () => {
  it('needs a pure sequence plus at least one more sequence; the rest may be sets', () => {
    expect(R.canShow(P('4H 5H 6H 7S 8S 9S JK 10D JD 5C 5D 5S 2C'.replace('2C', 'JK')), 13)).toBe(true);
    expect(R.canShow(P('AH 2H 3H 4S 5S 6S 7D 7C 7H 9D 9C 9S KD'.replace('KD', 'JK')), 13)).toBe(true);
    expect(R.canShow(P('AH 2H 3H 7D 7C 7S 9D 9C 9S KD KC KS KH'), 1)).toBe(false);          // only one sequence (and no wild rank in play)
    expect(R.canShow(P('AH 2H 3H 7D 7C 7S 9D 9C 9S KD KC KS KH'), 13)).toBe(true);           // but if Kings are wild, they can build a second sequence
    expect(R.canShow(P('4H 5H JK 7S 8S 9S 10D JD QD 5C 5D 5S 2C'), 13)).toBe(false);                            // one stray card (2C) is not in any group
  });
  it('showCard finds the card to throw away from a 14-card hand', () => {
    const h = P('4H 5H 6H 7S 8S 9S JK 10D JD 5C 5D 5S JK KD'.replace('KD', '2C')); expect(h[R.showCard(h, 13)].rank).toBe(2);
    expect(R.showCard(P('4H 5H 6H 7S 8S 9S 2C 3C 10D JD 5C 5D 5S KD'), 13)).toBe(-1);
  });
});
describe('points left over', () => {
  it('without a pure sequence the whole hand counts; with one only the unmatched cards count', () => {
    const none = R.solve(P('KH QD 5C 9S 8H 3D 2C 2S 7H 6D 4C KC JD'), 1); expect(none.hasPure).toBe(false); expect(none.deadwood).toBe(10 + 10 + 5 + 9 + 8 + 3 + 2 + 2 + 7 + 6 + 4 + 10 + 10);
    const some = R.solve(P('4H 5H 6H KD KC KS 9S 8H 3D 2C 7D 6D JD'), 1); expect(some.hasPure).toBe(true); expect(some.deadwood).toBe(9 + 8 + 3 + 2 + 7 + 6 + 10);
    expect(some.groups.length).toBe(2); expect(some.seqs).toBe(1);
  });
  it('printed jokers are worth 0', () => { expect(R.value(P('JK')[0])).toBe(0); expect(R.value(P('AH')[0])).toBe(10); expect(R.value(P('KH')[0])).toBe(10); expect(R.value(P('7H')[0])).toBe(7); });
});
