// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import App from '../src/App';

afterEach(() => cleanup());

const clickText = (root: HTMLElement, selector: string, text: string) => {
  const item = [...root.querySelectorAll(selector)].find(el => el.textContent?.includes(text));
  if (!item) throw new Error(`Missing ${selector} containing ${text}`);
  fireEvent.click(item);
};

describe('mobile hub features', () => {
  it('claims one daily reward and shows a warm default plus a cosmetic collection', () => {
    localStorage.clear(); const { container: c } = render(<App />);
    clickText(c, '.coin-pill', '120');
    expect(c.querySelectorAll('.cosmetic-card')).toHaveLength(13);
    clickText(c, 'button', 'Daily check-in +25');
    expect(JSON.parse(localStorage.getItem('cca.coins') || '0')).toBe(145);
    clickText(c, '.shop-tabs button', 'Card backs');
    expect(c.querySelectorAll('.cosmetic-card')).toHaveLength(12);
    expect(c.textContent).toContain('card backs');
  });

  it('shows a tagged guest profile and lets the player change name and avatar', () => {
    localStorage.clear(); const { container: c } = render(<App />);
    fireEvent.click(c.querySelector('.player-chip')!);
    expect(c.querySelector('.profile-panel')?.textContent).toContain('Player ID');
    expect(c.querySelector('.profile-panel')?.textContent).toMatch(/CCA-[A-Z0-9-]+/i);
    const name = c.querySelector<HTMLInputElement>('.profile-form input')!;
    fireEvent.change(name, { target: { value: 'Asha' } });
    clickText(c, '.avatar-picker button', '♥');
    expect(c.querySelector('.profile-identity h2')?.textContent).toBe('Asha');
    expect(c.querySelector('.profile-avatar')?.textContent).toBe('♥');
    expect(c.querySelector('.recent-match')).toBeNull();
  });

  it('keeps invite names in Friends and opens a room-code lobby from an invite', () => {
    localStorage.clear(); const { container: c } = render(<App />);
    fireEvent.click(c.querySelector('.friends-menu summary')!);
    clickText(c, '.manage-friends', 'Manage friends');
    fireEvent.change(c.querySelector<HTMLInputElement>('#friend-name')!, { target: { value: 'Asha' } });
    clickText(c, '.add-friend-form button', 'Add player');
    expect(c.querySelector('.friend-row')?.textContent).toContain('Asha');
    clickText(c, '.friend-row button', 'Create room invite');
    expect(c.querySelector('.lobby')).toBeTruthy();
    expect([...c.querySelectorAll('.tile.on b')].some(el => el.textContent === 'Room Code')).toBe(true);
  });

  it('unlocks cosmetics with play coins and applies their appearance to the game shell', async () => {
    localStorage.clear(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container: c } = render(<App />);
    clickText(c, '.coin-pill', '120');
    clickText(c, '.shop-tabs button', 'Table themes');
    clickText(c, '.cosmetic-details button', '◈ 90');
    await waitFor(() => expect(JSON.parse(localStorage.getItem('cca.profile') || '{}').theme).toBe('jade'));
    expect(JSON.parse(localStorage.getItem('cca.coins') || '0')).toBe(30);
    expect(confirm).toHaveBeenCalledOnce(); confirm.mockRestore();
  });

  it('keeps Games visible while navigating and returns from other sections', () => {
    localStorage.clear(); const { container: c } = render(<App />);
    clickText(c, '.top-nav-link', 'Settings');
    expect(c.querySelector('.back-games')?.textContent).toContain('Games');
    expect([...c.querySelectorAll('.top-nav-link')].some(el => el.textContent?.includes('Games'))).toBe(true);
    clickText(c, '.back-games', 'Games');
    expect(c.querySelector('.game-library')).toBeTruthy();
  });

  it('opens on the full library, with labelled navigation and no Quick Play or search', () => {
    localStorage.clear(); const { container: c } = render(<App />);
    expect(c.querySelectorAll('.game-card')).toHaveLength(15);
    expect(c.querySelectorAll('.game-mark svg')).toHaveLength(15);
    expect(c.querySelector('.quick-play-panel')).toBeNull();
    expect(c.querySelector('[aria-label="Search games"]')).toBeNull();
    expect([...c.querySelectorAll('.top-nav-link')].some(el => el.textContent?.includes('Games'))).toBe(true);
    expect(c.textContent).not.toMatch(/backend required|online sign-in is not connected|release documents are drafts|local demo coins/i);
  });

  it('applies an equipped theme and card back before opening a game, then persists them', () => {
    localStorage.clear(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container: c } = render(<App />);
    clickText(c, '.coin-pill', '120');
    clickText(c, 'button', 'Daily check-in +25');
    clickText(c, '.shop-tabs button', 'Table themes');
    clickText(c, '.cosmetic-details button', '◈ 90');
    expect(c.querySelector('.app')?.getAttribute('data-theme')).toBe('jade');
    clickText(c, '.shop-tabs button', 'Card backs');
    clickText(c, '.cosmetic-details button', '◈ 35');
    expect(c.querySelector('.app')?.getAttribute('data-back')).toBe('blue');
    clickText(c, '.top-nav-link', 'Games');
    clickText(c, '.game-launch', 'Hearts');
    expect(c.querySelector('.app')?.getAttribute('data-theme')).toBe('jade');
    expect(JSON.parse(localStorage.getItem('cca.profile') || '{}')).toMatchObject({ theme: 'jade', back: 'blue' });
    confirm.mockRestore();
  });

  it('offers recent human opponents from the last ten matches in the Friends dropdown', () => {
    localStorage.clear();
    localStorage.setItem('cca.history', JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ date: new Date(Date.now() - i * 1000).toISOString(), game: 'Hearts', names: ['Guest', `Friend ${i + 1}`, 'Bot A', 'Bot B'], humanPlayers: [`Friend ${i + 1}`], totals: [0, 1, 2, 3], rows: [{}], you: 0 }))));
    const { container: c } = render(<App />);
    fireEvent.click(c.querySelector('.friends-menu summary')!);
    expect(c.querySelectorAll('.recent-player-row')).toHaveLength(8);
    expect(c.textContent).toContain('Last 10 matches');
  });

  it('opens a shared room invite with accept and decline choices', () => {
    localStorage.clear();
    window.history.replaceState({}, '', '/?invite=123456&game=hearts&host=Asha');
    const { container: c } = render(<App />);
    expect(c.querySelector('.incoming-invite')?.textContent).toContain('Asha');
    expect(c.querySelector('.incoming-invite')?.textContent).toContain('Hearts');
    fireEvent.click(c.querySelector('[aria-label="Accept invitation"]')!);
    expect(c.querySelector('.code-in')).toBeTruthy();
    expect(c.querySelector<HTMLInputElement>('.code-in')?.value).toBe('123456');
    window.history.replaceState({}, '', '/');
  });
});
