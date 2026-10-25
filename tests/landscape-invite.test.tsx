// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import Landscape, { frameFor } from '../src/Landscape';
import App, { InviteSheet } from '../src/App';

beforeEach(() => { localStorage.clear(); cleanupDom(); });
const cleanupDom = () => { document.body.innerHTML = ''; };

describe('always landscape', () => {
  it('turns the app 90 degrees on an upright phone and leaves landscape screens alone', () => {
    expect(frameFor(390, 844)).toEqual({ turned: true, fw: 844, fh: 390 });
    expect(frameFor(844, 390)).toEqual({ turned: false, fw: 844, fh: 390 });
    expect(frameFor(1280, 720).turned).toBe(false); expect(frameFor(768, 1024).turned).toBe(true); expect(frameFor(1024, 1366).turned).toBe(false);   // big portrait monitors are left alone
  });
  it('sizes its own frame (so vh/vw units and container queries match the rotated screen)', () => {
    Object.assign(window, { innerWidth: 390, innerHeight: 844 });
    const { container } = render(<Landscape><span>hello</span></Landscape>), root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains('turned')).toBe(true); expect(root.style.transform).toBe('rotate(90deg)'); expect(root.style.width).toBe('844px'); expect(root.style.height).toBe('390px'); expect(root.style.getPropertyValue('--vh')).toBe('3.9px');
    Object.assign(window, { innerWidth: 1024, innerHeight: 768 });
  });
});
describe('History is a tab like the others', () => {
  it('opens inside the menu and keeps the whole navigation, so you can switch tabs from it', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /History/ })[0]);
    expect(screen.getByRole('heading', { name: 'Match history' })).toBeTruthy();
    for (const tab of ['Games', 'Rules', 'Collection', 'Settings']) expect(screen.getAllByRole('button', { name: new RegExp(tab) }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /Settings/ })[0]); expect(screen.queryByRole('heading', { name: 'Match history' })).toBeNull();
  });
});
describe('invite popup for a room', () => {
  it('lists saved friends and recent players and shares a link carrying the room code', () => {
    localStorage.setItem('cca.profile', JSON.stringify({ friends: ['Aman'] }));
    localStorage.setItem('cca.history', JSON.stringify([{ game: 'Callbreak', date: new Date().toISOString(), names: ['Me', 'Karan', 'Dev', 'Asha'], totals: [], rows: [], you: 0, humanPlayers: ['Karan'] }]));
    const open = vi.fn(); window.open = open as any; const onClose = vi.fn();
    render(<InviteSheet code="482913" game="callbreak" host="Me" onClose={onClose} />);
    expect(screen.getByText('Aman')).toBeTruthy(); expect(screen.getByText('Karan')).toBeTruthy(); expect(screen.queryByText('Dev')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }));
    const url = decodeURIComponent(String(open.mock.calls[0][0])); expect(url).toContain('wa.me'); expect(url).toContain('482913'); expect(url).toContain('invite=482913'); expect(url).toContain('Callbreak');
    fireEvent.click(screen.getByRole('button', { name: 'Invite Aman' })); expect(open.mock.calls.length).toBe(2); expect(decodeURIComponent(String(open.mock.calls[1][0]))).toContain('Hi Aman!');
    fireEvent.click(screen.getByRole('button', { name: 'Close' })); expect(onClose).toHaveBeenCalled();
  });
  it('still works with nobody saved yet', () => {
    render(<InviteSheet code="111222" game="hearts" host="Me" onClose={() => {}} />);
    expect(screen.getByText(/None yet/)).toBeTruthy(); expect(screen.getByText(/Players you meet/)).toBeTruthy();
  });
});
