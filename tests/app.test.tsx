// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import App from '../src/App';

const click = (el: Element | null | undefined) => { if (el) fireEvent.click(el); return !!el; };
const byText = (root: HTMLElement, sel: string, t: string) => [...root.querySelectorAll(sel)].find(e => e.textContent?.includes(t));

describe.each([['Callbreak', '3 rounds'], ['Hearts', '50 pts'], ['Court Piece', '5 points'], ['Dehla Pakad', '3 points'], ['3-2-5', '3 rounds'], ['Confidence', '1 deck'], ['Bluff', '1 deal'], ['Seven', '1 deal'], ['Ghulam Chor', '1 deal'], ['Donkey', '1 deal'], ['President', '1 round'], ['Spoons', '3 letters'], ['Yaniv', '100 points'], ['Cambrio', '25 points'], ['13-card Rummy', '1 deal']])('%s through the real UI', (game, shortOpt) => {
  it.each([['bots', 1], ['pass & play', 2]])('plays a full match (%s) and stores the scorecard', (mode) => {
    vi.useFakeTimers(); localStorage.clear();
    const { container: c } = render(<App />);
    click([...c.querySelectorAll('.game-card')].find(el => el.textContent?.includes(game))?.querySelector('.game-launch')); expect(c.querySelector('.lobby')).toBeTruthy();
    click(byText(c, 'button', shortOpt)); click(byText(c, 'button', 'Fast'));
    if (game === 'Spoons') { const seg = [...c.querySelectorAll('.seg')].find(s => /Players/.test(s.parentElement?.textContent ?? '')); click([...seg!.querySelectorAll('button')].find(b => b.textContent?.trim() === '3')); }
    if (mode !== 'bots' && game !== 'Spoons') click(byText(c, 'button', 'Pass & Play'));
    click(byText(c, 'button', 'Start match')); expect(c.querySelector('.felt')).toBeTruthy();
    expect(c.querySelectorAll('.seat').length).toBe(game === '3-2-5' || game === 'Spoons' ? 2 : game === 'Confidence' ? 7 : 3);
    let finished = false;
    for (let i = 0; i < (game === 'Spoons' ? 20000 : 6000) && !finished; i++) {   // Spoons rounds depend on luck (when four of a kind appears), so allow more time
      act(() => { vi.advanceTimersByTime(150); });
      if (byText(c, '.panel h2', 'won!')) { finished = true; break; }
      if (click(byText(c, '.panel button', 'Next round'))) continue;
      if (click(byText(c, '.panel button', 'show my cards'))) continue;
      if (click(c.querySelector('.bidbox .btn:not(:disabled)'))) continue;
      if (click(c.querySelector('.trumpbox .btn'))) continue;
      if (byText(c, '.bidbox', 'hidden trump') && c.querySelector('.hand .card.ok')) { click(c.querySelector('.hand .card.ok')); continue; }
      if (click(c.querySelector('.askbox .btn'))) continue;
      if (byText(c, '.bidbox', 'give back') && c.querySelector('.hand .card.ok')) { click(c.querySelector('.hand .card.ok')); continue; }
      const hand = c.querySelector('.hand');
      if (c.querySelector('.passbox')) { if (c.querySelectorAll('.hand .card.sel').length < 3) click(hand?.querySelector('.card.ok:not(.sel)')); continue; }
      if (click(c.querySelector('.pickrow .card'))) continue;
      if (click(c.querySelector('.grabbtn:not(:disabled)'))) continue;
      if (click(c.querySelector('.deckpile.take'))) continue;
      if (game === 'Spoons') {   // play like a person: pass the card you have the fewest of
        const cards = [...c.querySelectorAll('.hand .card')], ranks = cards.map(x => (x.querySelector('.i')?.textContent ?? '').match(/^(10|[2-9JQKA])/)?.[0] ?? '?');
        const freq = ranks.map(r => ranks.filter(x => x === r).length), at = freq.indexOf(Math.min(...freq)); if (cards[at]?.classList.contains('ok') && !cards[at].classList.contains('sel')) { click(cards[at]); continue; }
      }
      if (c.querySelector('.actbar')) {
        const play = c.querySelector('.actbar .play') as HTMLButtonElement | null, btn = (t: string) => [...c.querySelectorAll('.actbar button')].find(b => b.textContent?.includes(t));
        if (!play) { click(btn('Pass') ?? btn('Let them win') ?? btn('Call')); continue; }
        if (i % 9 === 0 && click(btn('Pass'))) continue;
        if (play.disabled && game === 'President' && btn('Pass')) { click(btn('Pass')); continue; }
        if (play.disabled) click(hand?.querySelector('.card.ok:not(.sel)')); else click(play);
        continue;
      }
      click(hand?.querySelector('.card.ok'));
    }
    expect(finished).toBe(true);
    const saved = JSON.parse(localStorage.getItem('cca.history') ?? '[]');
    expect(saved.length).toBe(1); expect(c.querySelectorAll('.sc tbody tr').length).toBe(saved[0].rows.length + 1);
    expect(saved[0].game).toBe(game); expect(saved[0].placement).toBeGreaterThanOrEqual(1); expect(saved[0].reward).toBeGreaterThanOrEqual(25);
    expect(Number(localStorage.getItem('cca.coins'))).toBe(120 + saved[0].reward);
    vi.useRealTimers();
  }, 120000);
});
