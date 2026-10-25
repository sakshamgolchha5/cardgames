// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import App from '../src/App';
import { GAMES } from '../src/games/registry';
import { TUTORIALS } from '../src/tutorials';
import { parseCards } from '../src/engine/cards';

describe('tutorials', () => {
  it('every game has a lesson and every card string is valid', () => {
    for (const g of GAMES) { expect(TUTORIALS[g.id]?.length).toBeGreaterThanOrEqual(4); }
    for (const steps of Object.values(TUTORIALS)) for (const s of steps) for (const k of [...parseCards(s.hand ?? ''), ...(s.table ?? []).flatMap(([, c]) => parseCards(c))]) { if (k.suit === 4) { expect(k.rank).toBe(0); continue; } expect(k.rank).toBeGreaterThanOrEqual(2); expect(k.rank).toBeLessThanOrEqual(14); expect([0, 1, 2, 3]).toContain(k.suit); }
    expect(parseCards('10H AS 7D')).toEqual([{ suit: 1, rank: 10 }, { suit: 0, rank: 14 }, { suit: 2, rank: 7 }]);
  });
  it.each(GAMES.map(g => [g.name, g.id]))('%s: open from the lobby, step through every page, and close', (name, id) => {
    localStorage.clear(); const { container: c } = render(<App />);
    fireEvent.click([...c.querySelectorAll('.game-card')].find(e => e.textContent?.includes(name))!.querySelector('.game-launch')!);
    fireEvent.click([...c.querySelectorAll('button')].find(b => b.textContent?.includes('How to play'))!);
    expect(c.querySelector('.tut')).toBeTruthy();
    for (let i = 0; i < TUTORIALS[id].length - 1; i++) fireEvent.click([...c.querySelectorAll('.tut .btn')].find(b => b.textContent?.includes('Next'))!);
    expect(c.querySelector('.tutright h3')?.textContent).toBe(TUTORIALS[id][TUTORIALS[id].length - 1].title);
    fireEvent.click([...c.querySelectorAll('.tut .btn')].find(b => b.textContent === 'Got it!')!);
    expect(c.querySelector('.tut')).toBeNull();
  });
});
