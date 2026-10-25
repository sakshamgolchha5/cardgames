import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeRng, shuffle } from './engine/cards';
import { seatsOf, type GAction, type GameDef, type Level } from './games/types';
import { BOT_NAMES } from './games/names';

export type Speed = 'fast' | 'normal' | 'slow';
export interface Setup { game: string; name: string; humans: number; level: Level; cfg: any; speed: Speed; seed: number }
export { BOT_NAMES };
const FACTOR: Record<Speed, number> = { fast: 0.5, normal: 1, slow: 1.7 };

/** Runs any GameDef: bot pacing, the pause that keeps a finished trick on the table, and pass & play hand-over. */
export function useGame(def: GameDef, setup: Setup) {
  const f = FACTOR[setup.speed] * (def.pace ?? 1), multi = setup.humans > 1, n = seatsOf(def, setup.cfg);
  const names = useMemo(() => {
    const bots = shuffle(BOT_NAMES, makeRng(setup.seed ^ 0x9e3779b1));
    return Array.from({ length: n }, (_, i) => (i >= setup.humans ? bots[i] : setup.humans === 1 ? setup.name || 'You' : i === 0 ? setup.name || 'Player 1' : `Player ${i + 1}`));
  }, [setup, n]);
  const rng = useRef(makeRng(setup.seed));
  const [s, setS] = useState<any>(() => def.create(setup.cfg, setup.seed));
  const sRef = useRef(s);
  const [hold, setHold] = useState<any>(null);
  const [seen, setSeen] = useState(multi ? -1 : 0);
  const isHuman = (seat: number) => seat < setup.humans;

  const commit = useCallback((seat: number, a: GAction) => {
    const prev = sRef.current; let next: any;
    try { next = def.apply(prev, seat, a); } catch (e) { console.warn('Ignored illegal move', e); return; } // a stale or double tap must never crash the game
    sRef.current = next; setS(next);
    if (next.lastTrick && next.lastTrick !== prev.lastTrick) { setHold(next.lastTrick); setTimeout(() => setHold(null), 1000 * f); }
  }, [f, def]);

  const active = s.phase !== 'roundEnd' && s.phase !== 'gameEnd', timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => {
    if (def.plan) {   // real-time game: no turn order; bots react after a human-like delay and idle humans are auto-played. Running timers survive other players' moves.
      const T = timers.current;
      if (!active) { T.forEach(clearTimeout); T.clear(); return; }
      const humans = new Set(Array.from({ length: setup.humans }, (_, i) => i));
      const items = def.plan(sRef.current, setup.level, rng.current, humans, def.limitMs ? def.limitMs(setup.cfg) : 5000), keep = new Set(items.map(i => i.key));
      for (const [k, t] of T) if (!keep.has(k)) { clearTimeout(t); T.delete(k); }
      for (const it of items) if (!T.has(it.key)) T.set(it.key, setTimeout(() => { T.delete(it.key); commit(it.seat, it.action); }, it.human ? it.delay : it.delay * f));
      return;
    }
    if (hold || !active || isHuman(s.turn)) return;
    const t = setTimeout(() => { const seat = sRef.current.turn; commit(seat, def.chooseAction(def.view(sRef.current, seat), seat, setup.level, rng.current)); }, (300 + rng.current() * 450) * f);
    return () => clearTimeout(t);
  }, [s, hold]); // eslint-disable-line

  const needHandover = !def.plan && multi && active && !hold && isHuman(s.turn) && seen !== s.turn;
  const viewer = multi ? Math.max(seen, 0) : 0;
  const canAct = def.plan ? active && isHuman(viewer) : active && !hold && isHuman(s.turn) && !needHandover && s.turn === viewer;
  return {
    s, names, hold, viewer, needHandover, canAct,
    act: (a: GAction) => { if (canAct) commit(viewer, a); },
    reveal: () => setSeen(s.turn),
    next: () => { const nx = def.nextRound(sRef.current); sRef.current = nx; setS(nx); if (multi) setSeen(-1); },
    roundOver: !hold && (s.phase === 'roundEnd' || s.phase === 'gameEnd'),
  };
}

import type { ClientRoom, HostRoom } from './net/room';
/** Drives a networked game: the host also runs the bots; every player sees only their own view. */
export function useRoomGame(room: HostRoom | ClientRoom, def: GameDef, speed: Speed, isHost: boolean) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const f = FACTOR[speed] * (def.pace ?? 1), rng = useRef(makeRng(Date.now() & 0xffff)), [, force] = useState(0), [hold, setHold] = useState<any>(null);
  useEffect(() => room.onChange(() => force(x => x + 1)), [room]);
  const s = room.state, key = s?.lastTrick ? JSON.stringify(s.lastTrick) : '';
  useEffect(() => { if (!key) return; setHold(s.lastTrick); const t = setTimeout(() => setHold(null), 1000 * f); return () => clearTimeout(t); }, [key]); // eslint-disable-line
  const ver = isHost ? (room as HostRoom).version : 0;
  useEffect(() => {
    if (!isHost || !s) return;
    if (def.plan) {
      const T = timers.current;
      if (s.phase === 'roundEnd' || s.phase === 'gameEnd') { T.forEach(clearTimeout); T.clear(); return; }
      const hr = room as HostRoom;
      const items = def.plan(hr.state, hr.o.level, rng.current, hr.humans, def.limitMs ? def.limitMs(hr.o.cfg) : 5000), keep = new Set(items.map(i => i.key));
      for (const [k, t] of T) if (!keep.has(k)) { clearTimeout(t); T.delete(k); }
      for (const it of items) if (!T.has(it.key)) T.set(it.key, setTimeout(() => { T.delete(it.key); hr.act(it.seat, it.action); }, it.human ? it.delay : it.delay * f));
      return;
    }
    if (hold) return;
    const t = setTimeout(() => (room as HostRoom).botStep(rng.current), (300 + rng.current() * 450) * f);
    return () => clearTimeout(t);
  }, [ver, hold]); // eslint-disable-line
  const viewer = room.seat, active = !!s && s.phase !== 'roundEnd' && s.phase !== 'gameEnd';
  const canAct = active && !hold && (def.plan ? true : s.turn === viewer);
  return {
    s, names: room.names, hold, viewer, needHandover: false, canAct,
    act: (a: GAction) => { if (!canAct) return; if (isHost) (room as HostRoom).act(0, a); else (room as ClientRoom).act(a); },
    reveal: () => {}, next: () => { if (isHost) (room as HostRoom).nextRound(); },
    roundOver: !hold && !!s && (s.phase === 'roundEnd' || s.phase === 'gameEnd'),
  };
}
