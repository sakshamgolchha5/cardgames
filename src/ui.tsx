import type { CSSProperties } from 'react';
import { Card, SUIT_SYMBOLS, rankLabel } from './engine/cards';
import type { ScoreRow } from './games/types';

export const CardFace = ({ c, cls = '', onClick }: { c: Card; cls?: string; onClick?: () => void }) => (
  <div className={`card ${c.suit === 1 || c.suit === 2 ? 'r' : c.suit === 4 ? 'jk' : ''} ${cls}`} onClick={onClick}>
    <div className="i">{rankLabel(c.rank)}<br />{SUIT_SYMBOLS[c.suit]}</div><div className="b">{SUIT_SYMBOLS[c.suit]}</div>
  </div>
);
export const CardBack = ({ cls = '', style, onClick }: { cls?: string; style?: CSSProperties; onClick?: () => void }) => <div className={`card back ${cls}`} style={style} onClick={onClick} />;

const hash = (s: string) => { let x = 2166136261; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'], HAIR = ['#1b1b1b', '#4a2c17', '#a0522d', '#2c2c54', '#777'];
const BG = ['#2a9d8f', '#e76f51', '#457b9d', '#8e6bbf', '#e9a23b', '#3a86ff'], SHIRT = ['#264653', '#e63946', '#f4a261', '#2b9348', '#5e60ce', '#111'];
const TURBAN = ['#f4b400', '#d62828', '#1d3557', '#ff6f00', '#2a9d8f'];
export function Avatar({ seed }: { seed: string }) {
  const x = hash(seed), pk = (a: string[], k: number) => a[(x >>> k) % a.length], style = (x >>> 9) % 4, glasses = (x >>> 13) % 4 === 0;
  const skin = pk(SKIN, 3), hair = pk(HAIR, 5);
  return (
    <svg viewBox="0 0 100 100" className="avatar"><circle cx="50" cy="50" r="50" fill={pk(BG, 1)} />
      <path d="M10 100c0-24 17-34 40-34s40 10 40 34z" fill={pk(SHIRT, 7)} /><rect x="43" y="56" width="14" height="14" fill={skin} />
      <circle cx="50" cy="43" r="21" fill={skin} />
      {style === 0 && <path d="M29 41a21 21 0 0 1 42 0c-8-9-34-9-42 0z" fill={hair} />}
      {style === 1 && <><path d="M26 46a24 24 0 0 1 48 0v24h-9V46H35v24h-9z" fill={hair} /><path d="M29 39a21 21 0 0 1 42 0c-10-8-32-8-42 0z" fill={hair} /></>}
      {style === 2 && <><ellipse cx="50" cy="29" rx="26" ry="17" fill={pk(TURBAN, 11)} /><path d="M28 36c14-6 30-6 44 0" stroke="#0004" strokeWidth="2" fill="none" /></>}
      <circle cx="42" cy="45" r="2.4" fill="#222" /><circle cx="58" cy="45" r="2.4" fill="#222" />
      <path d="M42 53q8 7 16 0" stroke="#222" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {glasses && <g fill="none" stroke="#222" strokeWidth="2"><circle cx="42" cy="45" r="6" /><circle cx="58" cy="45" r="6" /><path d="M48 45h4" /></g>}
    </svg>
  );
}

export const Spoon = ({ size = 30, dim = false }: { size?: number; dim?: boolean }) => (
  <svg viewBox="0 0 24 48" width={size * 0.5} height={size} style={{ opacity: dim ? 0.22 : 1, flex: 'none' }}>
    <ellipse cx="12" cy="11" rx="8" ry="11" fill="#e4e7ec" stroke="#7d8591" strokeWidth="1.5" />
    <rect x="10" y="20" width="4" height="26" rx="2" fill="#cfd4db" stroke="#7d8591" strokeWidth="1.2" />
  </svg>
);

export function Scorecard({ rows, names, totals, lowWins, hint }: { rows: ScoreRow[]; names: string[]; totals: number[]; lowWins?: boolean; hint?: string }) {
  const best = lowWins ? Math.min(...totals) : Math.max(...totals), cls = (p: number) => (p === 0 ? '' : (lowWins ? p < 0 : p > 0) ? 'pos' : 'neg');
  return (
    <div className="sc-wrap"><table className="sc"><thead><tr><th>Round</th>{names.map(n => <th key={n}>{n}</th>)}</tr></thead>
      <tbody>{rows.map(r => (
        <tr key={r.label}><td>{r.label}</td>{r.cells.map((c, i) => <td key={i}>{c.sub && <small>{c.sub}</small>}<b className={cls(c.pts)}>{c.pts > 0 ? '+' : ''}{c.pts}</b></td>)}</tr>))}
        {!rows.length && <tr><td colSpan={names.length + 1}>No rounds finished yet</td></tr>}
        <tr className="tot"><td>Total</td>{totals.map((t, i) => <td key={i} className={t === best && rows.length ? 'lead' : ''}><b>{t}</b></td>)}</tr>
      </tbody></table>{hint && <p className="hint">{hint}</p>}</div>
  );
}
