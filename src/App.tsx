import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, CardBack, CardFace, Scorecard, Spoon } from './ui';
import { GAMES, byId } from './games/registry';
import { seatsOf, type GameDef, type ScoreRow } from './games/types';
import { Setup, Speed, useGame, useRoomGame } from './useGame';
import { ClientRoom, HostRoom } from './net/room';
import { Tutorial } from './Tutorial';
import { joinCode, openHost } from './net/transport';
import { Card, sameCard, rankPlural, rankLabel, SUIT_SYMBOLS } from './engine/cards';
import { Home as ClubHome, inviteTargets, type IncomingInvite } from './Home';

interface Saved { date: string; game: string; names: string[]; totals: number[]; rows: ScoreRow[]; lowWins?: boolean; hint: string; you?: number; options?: string[]; placement?: number; reward?: number; humanPlayers?: string[] }
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T; } catch { return d; } };
const store = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const DIRS = ['left', 'right', 'across'];

type HostOpts = { cfg: any; level: 'easy' | 'medium' | 'hard'; speed: Speed; name: string };
type Screen = { n: 'home' } | { n: 'lobby'; id: string; room?: boolean } | { n: 'host'; id: string; opts: HostOpts } | { n: 'join'; code?: string } | { n: 'net'; room: HostRoom | ClientRoom; isHost: boolean; speed: Speed } | { n: 'game'; setup: Setup } | { n: 'history'; rec?: Saved };

function lockLandscapeWhenInstalled() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> };
  if (standalone && typeof orientation?.lock === 'function') void orientation.lock('landscape').catch(() => {});
}

function readIncomingInvite(): IncomingInvite | null {
  const params = new URLSearchParams(window.location.search), code = params.get('invite') ?? '';
  if (!/^\d{6}$/.test(code)) return null;
  const definition = GAMES.find(game => game.id === params.get('game'));
  return { code, game: definition?.name ?? 'Card game', host: (params.get('host') ?? 'A player').slice(0, 24) };
}

function clearInviteLink() {
  const url = new URL(window.location.href);
  ['invite', 'game', 'host'].forEach(key => url.searchParams.delete(key));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function App() {
  const [scr, setScr] = useState<Screen>({ n: 'home' });
  const [name, setName] = useState(() => load('cca.name', '') || 'Guest');
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(readIncomingInvite);
  useEffect(() => store('cca.name', name), [name]);
  const acceptInvite = () => { if (!incomingInvite) return; const code = incomingInvite.code; setIncomingInvite(null); clearInviteLink(); setScr({ n: 'join', code }); };
  const declineInvite = () => { setIncomingInvite(null); clearInviteLink(); };
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'invite') return <div className="app" data-theme="clubhouse"><InviteSheet code="482913" game="callbreak" host="Saksham" onClose={() => {}} /></div>;   // design preview, development only
  return (
    <div className="app" data-theme={load<{ theme?: string }>('cca.profile', {}).theme ?? 'clubhouse'} data-back={load<{ back?: string }>('cca.profile', {}).back ?? 'crimson'}>
      {false && <div className="rotate must-rotate"><div className="rotate-card"><span className="rotate-symbol">↻</span><b>Please rotate your phone to landscape</b><small>Your game will be ready when your screen turns.</small></div></div>}
      {scr.n === 'home' && <ClubHome name={name} setName={setName} openGame={(id, room) => setScr({ n: 'lobby', id, room })} openJoin={() => setScr({ n: 'join' })} renderHistory={() => <History />} incomingInvite={incomingInvite} acceptInvite={acceptInvite} declineInvite={declineInvite} />}
      {scr.n === 'lobby' && <Lobby id={scr.id} name={name} go={setScr} initialRoom={scr.room} />}
      {scr.n === 'host' && <HostWait id={scr.id} opts={scr.opts} go={setScr} />}
      {scr.n === 'join' && <JoinRoom name={name} go={setScr} initialCode={scr.code} />}
      {scr.n === 'net' && <NetGame room={scr.room} isHost={scr.isHost} speed={scr.speed} exit={() => setScr({ n: 'home' })} />}
      {scr.n === 'game' && <LocalGame key={scr.setup.seed} setup={scr.setup} exit={() => setScr({ n: 'home' })} again={() => setScr({ n: 'lobby', id: scr.setup.game })} />}
    </div>
  );
}

function Seg({ v, set, opts }: { v: any; set: (x: any) => void; opts: [any, string][] }) {
  return <div className="seg">{opts.map(([o, l]) => <button key={String(o)} className={o === v ? 'on' : ''} onClick={() => set(o)}>{l}</button>)}</div>;
}
const Opt = ({ l, children }: { l: string; children: React.ReactNode }) => <div className="opt"><label>{l}</label>{children}</div>;

function Lobby({ id, name, go, initialRoom = false }: { id: string; name: string; go: (s: Screen) => void; initialRoom?: boolean }) {
  const def = byId(id);
  const [mode, setMode] = useState<'bots' | 'pass' | 'room'>(initialRoom ? 'room' : 'bots'), [level, setLevel] = useState<'easy' | 'medium' | 'hard'>('medium'), [speed, setSpeed] = useState<Speed>('normal');
  const [cfg, setCfg] = useState<Record<string, any>>(() => Object.fromEntries(def.options.map(o => [o.key, o.def]))), [humans, setHumans] = useState(2);
  const [tut, setTut] = useState(false);
  const start = () => { lockLandscapeWhenInstalled(); return mode === 'room' ? go({ n: 'host', id, opts: { cfg, level, speed, name } }) : go({ n: 'game', setup: { game: id, name, humans: mode === 'bots' ? 1 : Math.min(humans, seatsOf(def, cfg)), level, cfg, speed, seed: Math.floor(Math.random() * 1e9) } }); };
  return (
    <div className="lobby">
      <div className="top"><button className="btn ghost" onClick={() => go({ n: 'home' })}>‹ Back</button><h2>{def.name}</h2></div>
      <div className="lob-body">
        <div className="modes">
          <button className={`tile sm ${mode === 'bots' ? 'on' : ''}`} onClick={() => setMode('bots')}>🤖<b>Vs Bots</b></button>
          <button className={`tile sm ${mode === 'pass' ? 'on' : ''} ${def.noPassPlay ? 'off' : ''}`} disabled={def.noPassPlay} onClick={() => setMode('pass')}>📱<b>Pass & Play</b>{def.noPassPlay && <small>one screen each</small>}</button>
          <button className={`tile sm ${mode === 'room' ? 'on' : ''}`} onClick={() => setMode('room')}>🔑<b>Room Code</b></button>
        </div>
        <div className="opts">
          <div className="learn"><span>New to {def.name}? Learn it in a minute.</span><button className="btn" onClick={() => setTut(true)}>? How to play</button></div>
          {mode === 'pass' && <Opt l="Human players"><Seg v={humans} set={setHumans} opts={Array.from({ length: seatsOf(def, cfg) - 1 }, (_, i) => [i + 2, String(i + 2)] as [number, string])} /></Opt>}
          <Opt l="Bot difficulty"><Seg v={level} set={setLevel} opts={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} /></Opt>
          {def.options.map(o => <Opt key={o.key} l={o.label}><Seg v={cfg[o.key]} set={x => setCfg({ ...cfg, [o.key]: x })} opts={o.choices as [any, string][]} /></Opt>)}
          <Opt l="Bot speed"><Seg v={speed} set={setSpeed} opts={[['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']]} /></Opt>
          <p className="hint">{def.hint}</p>
        </div>
      </div>
      {tut && <Tutorial id={id} name={def.name} onClose={() => setTut(false)} />}
      <div className="foot"><button className="btn big" onClick={start}>{mode === 'room' ? '🔑 Create room' : '▶ Start match'}</button></div>
    </div>
  );
}

function LocalGame({ setup, exit, again }: { setup: Setup; exit: () => void; again: () => void }) {
  const def = byId(setup.game), g = useGame(def, setup);
  return <GameView def={def} g={g} cfg={setup.cfg} exit={exit} again={again} humanSeats={Array.from({ length: setup.humans }, (_, seat) => seat)} />;
}

function NetGame({ room, isHost, speed, exit }: { room: HostRoom | ClientRoom; isHost: boolean; speed: Speed; exit: () => void }) {
  const def = byId(room.gameId), g = useRoomGame(room, def, speed, isHost), leave = () => { room.dispose(); exit(); };
  const humanSeats = Array.isArray(room.humans) ? room.humans : [...room.humans];
  return (<>
    <GameView def={def} g={g} cfg={room.cfg} exit={leave} canNext={isHost} humanSeats={humanSeats} />
    {!isHost && room.lost && <div className="modal"><div className="panel"><h2>Connection lost</h2><button className="btn" onClick={leave}>Menu</button></div></div>}
  </>);
}

function GameView({ def, g, cfg, exit, again, canNext = true, humanSeats }: { def: GameDef; g: any; cfg: any; exit: () => void; again?: () => void; canNext?: boolean; humanSeats: number[] }) {
  const n = seatsOf(def, cfg), dense = n > 5;
  const [showSc, setShowSc] = useState(false), [tut, setTut] = useState(false), [tradeMine, setTradeMine] = useState<number | null>(null), [sel, setSel] = useState<Card[]>([]), [selIdx, setSelIdx] = useState<number[]>([]), [rk, setRk] = useState<number | null>(null), saved = useRef(false);
  const v = def.view(g.s, g.viewer);
  const legal = g.canAct ? def.legalActions(g.s, g.viewer) : [];
  const legalCards = legal.flatMap(a => (a.type === 'play' ? [a.card] : []));
  const yanivMode = v.step !== undefined && v.avail !== undefined && v.stage === undefined;
  const caboMode = v.know !== undefined && v.step !== undefined && v.peek !== undefined && v.stage === undefined;
  const rummyMode = v.wildCard !== undefined && v.step !== undefined;
  const myKey = v.hands[g.viewer].map((c: Card) => `${c.suit}.${c.rank}`).join(',') + '|' + v.wild;
  const groups = useMemo(() => (rummyMode && def.suggest && v.hands[g.viewer].length ? def.suggest(v, g.viewer) : null), [myKey]); // eslint-disable-line
  const cardAt = (o: number, k: number): Card | null => v.grid?.[o]?.[k] ?? v.know?.[o]?.[k] ?? null;
  const prompt = g.canAct ? (rummyMode && g.s.phase === 'playing' ? 'rummy' : caboMode && g.s.phase === 'playing' ? 'cabo' : yanivMode && g.s.phase === 'playing' ? 'yaniv' : v.table !== undefined && g.s.phase === 'playing' ? 'pres' : v.table !== undefined && g.s.phase === 'exchange' ? 'return' : v.victim !== undefined && g.s.phase === 'playing' ? 'draw' : v.pileCount !== undefined && g.s.phase === 'playing' ? 'bluff' : v.rows !== undefined && g.s.phase === 'playing' && legal.some(a => a.type === 'skip') ? 'seven' : g.s.phase === 'bidding' ? 'bid' : g.s.phase === 'passing' ? 'pass' : g.s.phase === 'trump' ? (legal.some(a => a.type === 'hide') ? 'hide' : 'trump') : g.s.phase === 'exchange' ? 'give' : null) : null;
  const done = g.s.phase === 'gameEnd' && !g.hold;
  const place = 1 + g.s.totals.filter((x: number) => def.lowWins ? x < g.s.totals[g.viewer] : x > g.s.totals[g.viewer]).length;
  const matchReward = ([100, 60, 35, 20, 10, 10][Math.min(place - 1, 5)]) + 15;
  useEffect(() => setSel([]), [g.s.phase, g.viewer, g.s.round]);
  useEffect(() => { setSelIdx([]); setRk(null); }, [g.s.turn, g.s.round, g.s.phase, v.pileCount]);
  const myHand: Card[] = v.hands[g.viewer], claimRanks: number[] = prompt === 'bluff' ? legal.flatMap(a => (a.type === 'claim' ? [a.rank] : [])) : [];
  const bestRank = claimRanks.length ? [...claimRanks].sort((a, b) => myHand.filter(c => c.rank === b).length - myHand.filter(c => c.rank === a).length)[0] : 14;
  const presRanks = new Set<number>(prompt === 'pres' ? legal.flatMap(a => (a.type === 'set' ? [a.cards[0].rank] : [])) : []);
  const claimRank = claimRanks.length === 1 ? claimRanks[0] : rk !== null && claimRanks.includes(rk) ? rk : bestRank;
  const RL = (r: number) => ({ 14: 'A', 13: 'K', 12: 'Q', 11: 'J' } as Record<number, string>)[r] ?? String(r);
  useEffect(() => {
    if (done && !saved.current) {
      saved.current = true;
      const score = g.s.totals[g.viewer], placement = 1 + g.s.totals.filter((x: number) => def.lowWins ? x < score : x > score).length;
      const reward = ([100, 60, 35, 20, 10, 10][Math.min(placement - 1, 5)]) + 15;
      const humanPlayers = humanSeats.filter(seat => seat !== g.viewer).map(seat => g.names[seat]).filter((player: string) => Boolean(player) && !/^Player \d+$/i.test(player));
      const rec: Saved = { date: new Date().toISOString(), game: def.name, names: g.names, totals: g.s.totals, rows: def.rows(g.s.history), lowWins: def.lowWins, hint: def.hint, you: g.viewer, options: def.options.map(o => `${o.label}: ${String(cfg[o.key])}`), placement, reward, humanPlayers };
      store('cca.history', [rec, ...load<Saved[]>('cca.history', []).filter(r => r.rows)].slice(0, 100));
      store('cca.coins', load<number>('cca.coins', 120) + reward);
    }
  }, [done]); // eslint-disable-line
  const center = g.hold ? g.hold.cards : g.s.trick;
  const sub = [def.infoText ? def.infoText(v, g.names) : '', def.eventText && v.event ? def.eventText(v, g.names) : ''].filter(Boolean).join(' · ');
  const pos = (seat: number) => {
    const r = (seat - g.viewer + n) % n, th = ((90 + (r * 360) / n) * Math.PI) / 180;
    // many players: seat the opponents along an arc over the top so nobody overlaps your hand; 9-10 players use two tidy rows
    const a = dense && r > 0 ? ((200 + ((r - 1) * 140) / (n - 2)) * Math.PI) / 180 : th;
    let lx = 50 + (dense ? 43 : 41) * Math.cos(a), ty = dense ? 57 + 31 * Math.sin(a) : 46 + 36 * Math.sin(a);
    if (n > 8 && r > 0) { const m = n - 1, k = r - 1, top = Math.ceil(m / 2), row = k < top ? 0 : 1, cnt = row ? m - top : top; lx = 50 + ((row ? k - top : k) - (cnt - 1) / 2) * (88 / top); ty = row ? 46 : 19; }
    return { r, c: Math.cos(th), s: Math.sin(th), lx, ty };
  };
  const spoonsMode = v.spoons !== undefined && v.stage !== undefined, limit = def.limitMs ? def.limitMs(cfg) : 5000, canGrab = legal.some(a => a.type === 'grab');
  const clickCard = (c: Card, idx: number) => {
    if (prompt === 'yaniv') { if (v.step === 'discard') setSelIdx(p => (p.includes(idx) ? p.filter(x => x !== idx) : [...p, idx])); return; }
    if (prompt === 'rummy') { if (v.step === 'discard') setSelIdx(p => (p.includes(idx) ? [] : [idx])); return; }
    if (spoonsMode) { if (g.canAct && v.stage === 'pass') g.act({ type: 'pick', index: idx }); return; }
    if (prompt === 'pres' && !presRanks.has(c.rank) && !selIdx.includes(idx)) return;   // only cards that could be part of a legal play
    if (prompt === 'pres' || prompt === 'return') { setSelIdx(p => (p.includes(idx) ? p.filter(x => x !== idx) : prompt === 'return' && p.length >= g.s.xchg.count ? p : [...p, idx])); return; }
    if (prompt === 'bluff') { if (!claimRanks.length) return; setSelIdx(p => (p.includes(idx) ? p.filter(x => x !== idx) : cfg.perTurn === 'one' ? [idx] : [...p, idx])); return; }
    if (prompt === 'hide') g.act({ type: 'hide', card: c });
    else if (prompt === 'give') g.act({ type: 'give', card: c });
    else if (prompt === 'pass') setSel(p => (p.some(x => sameCard(x, c)) ? p.filter(x => !sameCard(x, c)) : p.length < g.s.passCount ? [...p, c] : p));
    else if (legalCards.some(l => sameCard(l, c))) g.act({ type: 'play', card: c });
  };
  const handCls = (c: Card, idx: number) => {
    if (prompt === 'yaniv') return v.step === 'discard' ? (selIdx.includes(idx) ? 'ok sel' : 'ok') : '';
    if (prompt === 'rummy') return v.step === 'discard' ? (selIdx.includes(idx) ? 'ok sel' : 'ok') : '';
    if (spoonsMode) return v.stage === 'pass' && g.canAct ? (v.myPick === idx ? 'ok sel' : 'ok') : '';
    if (prompt === 'pres') return selIdx.includes(idx) ? 'ok sel' : presRanks.has(c.rank) ? 'ok' : 'dim';
    if (prompt === 'return') return selIdx.includes(idx) ? 'ok sel' : 'ok';
    if (prompt === 'bluff') return !claimRanks.length ? 'dim' : selIdx.includes(idx) ? 'ok sel' : 'ok';
    if (prompt === 'hide' || prompt === 'give') return 'ok';
    if (prompt === 'draw') return '';
    if (prompt === 'pass') return sel.some(x => sameCard(x, c)) ? 'ok sel' : 'ok';
    return g.s.phase === 'playing' && g.canAct ? (legalCards.some(l => sameCard(l, c)) ? 'ok' : 'dim') : '';
  };
  return (
    <div className="game">
      <div className="top"><button className="btn ghost" onClick={exit}>‹ Menu</button>
        <div className="ttl"><div className="title">{def.name} · {def.roundLabel(g.s, cfg)}</div>{sub && <div className="sub">{sub}</div>}</div>
        <span><button className="btn ghost" onClick={() => setTut(true)}>?</button> <button className="btn ghost" onClick={() => setShowSc(true)}>Scorecard</button></span></div>
      <div className={`felt ${dense ? 'dense' : ''} ${n > 8 ? 'denser' : ''}`}>
        {g.names.map((nm: string, seat: number) => {
          const p = pos(seat); if (p.r === 0) return null;
          return (
            <div key={seat} className={`seat ${!dense && p.ty < 26 ? 'tops' : ''} ${g.s.turn === seat && !g.hold && g.s.phase !== 'roundEnd' && g.s.phase !== 'gameEnd' ? 'turn' : ''}`} style={!dense && p.ty < 26 ? { left: `${p.lx}%`, top: 16, transform: 'translateX(-50%)' } : { left: `${p.lx}%`, top: `${p.ty}%` }}>
              <div className="av"><Avatar seed={nm} />{g.s.dealer === seat && <i className="dealer">D</i>}</div>
              <div className="nm">{nm}</div><div className="badge">{def.badge(v, seat)}</div>{def.seatNote && def.seatNote(v, seat) && <div className="bubble">{def.seatNote(v, seat)}</div>}
              {caboMode ? <div className="g4">{[0, 1, 2, 3].map(k => { const c = cardAt(seat, k), target = prompt === 'cabo' && v.step === 'power' && (v.power === 'other' || (v.power === 'swap' && tradeMine !== null));
                const click = () => { if (!target) return; if (v.power === 'other') g.act({ type: 'spy', seat, index: k }); else { g.act({ type: 'trade', mine: tradeMine!, seat, index: k }); setTradeMine(null); } };
                return c ? <CardFace key={k} c={c} cls={`xs2 ${target ? 'target' : ''}`} onClick={click} /> : <CardBack key={k} cls={`xs2 ${target ? 'target' : ''}`} onClick={click} />; })}</div> : dense ? (/card/.test(def.badge(v, seat)) ? null : <div className="cnt"><span className="mini" /> ×{v.handSizes[seat]}</div>) : <div className="fan">{[...Array(Math.min(v.handSizes[seat], 9))].map((_, i, a) => <CardBack key={i} cls="xs" style={{ transform: `rotate(${(i - (a.length - 1) / 2) * Math.min(9, 70 / a.length)}deg)` }} />)}</div>}
            </div>);
        })}
        <div className="center">
          {rummyMode && g.s.phase === 'playing' && (
            <div className="yanivbox">
              {v.wildCard && <div className="minecards"><small>wild joker</small><div className="availcards"><CardFace c={v.wildCard} cls="md" /></div></div>}
              <div className={`deckpile ${prompt === 'rummy' && v.step === 'draw' ? 'take' : ''}`} onClick={() => prompt === 'rummy' && v.step === 'draw' && g.act({ type: 'stock' })}><CardBack /><b>{v.stockCount}</b></div>
              <div className="availcards">{v.open.length ? <CardFace c={v.open[v.open.length - 1]} cls={`md ${prompt === 'rummy' && v.step === 'draw' ? 'takeable' : ''}`} onClick={() => prompt === 'rummy' && v.step === 'draw' && g.act({ type: 'open' })} /> : <small>open pile</small>}</div>
            </div>)}
          {caboMode && g.s.phase === 'playing' && (
            <div className="yanivbox">
              <div className={`deckpile ${prompt === 'cabo' && v.step === 'start' ? 'take' : ''}`} onClick={() => prompt === 'cabo' && v.step === 'start' && g.act({ type: 'take' })}><CardBack /><b>{v.deckCount}</b></div>
              <div className="availcards">{v.discard.length ? <CardFace c={v.discard[v.discard.length - 1]} cls="md" /> : <small>discard pile</small>}</div>
              {v.drawn && <div className="minecards"><small>you drew</small><div className="availcards"><CardFace c={v.drawn} cls="md takeable" /></div></div>}
            </div>)}
          {yanivMode && g.s.phase === 'playing' && (
            <div className="yanivbox">
              <div className={`deckpile ${prompt === 'yaniv' && v.step === 'draw' ? 'take' : ''}`} onClick={() => prompt === 'yaniv' && v.step === 'draw' && g.act({ type: 'drawDeck' })}><CardBack /><b>{v.deckCount}</b></div>
              <div className="availcards">{v.avail.map((c: Card, i: number) => { const can = prompt === 'yaniv' && v.step === 'draw' && (i === 0 || i === v.avail.length - 1);
                return <CardFace key={i} c={c} cls={`md ${can ? 'takeable' : ''}`} onClick={() => can && g.act({ type: 'drawDiscard', end: i === 0 ? 'first' : 'last' })} />; })}{!v.avail.length && <small>no discard yet</small>}</div>
              {v.mine.length > 0 && <div className="minecards"><small>discarded</small><div className="availcards">{v.mine.map((c: Card, i: number) => <CardFace key={i} c={c} cls="md" />)}</div></div>}
            </div>)}
          {spoonsMode && g.s.phase === 'playing' && (
            <div className="spoonbox"><div className="spoons">{Array.from({ length: n - 1 }, (_, k) => <Spoon key={k} size={dense ? 22 : 30} dim={k >= v.spoons} />)}</div>
              <button className={`grabbtn ${canGrab ? 'on' : ''}`} disabled={!canGrab} onClick={() => g.act({ type: 'grab' })}>GRAB!</button></div>)}
          {v.table !== undefined && !g.hold && (
            <div className="lastbox">{v.table ? <><div className="lcards">{v.table.cards.map((c: Card, i: number) => <CardFace key={i} c={c} cls="md" />)}</div><b>{g.names[v.table.seat]}: {v.table.count} × {rankPlural(v.table.rank)}</b></> : <b>{g.s.phase === 'exchange' ? 'Card swap' : 'Lead any set'}</b>}</div>)}
          {v.rows !== undefined && (
            <div className="sev">{[0, 1, 2, 3].map(suit => (
              <div key={suit} className="srow"><i className={suit === 1 || suit === 2 ? 'r' : ''}>{'♠♥♦♣'[suit]}</i>
                {Array.from({ length: 13 }, (_, k) => { const rank = k + 2, r = v.rows[suit], on = !!r && rank >= r.low && rank <= r.high, last = v.lastCard && v.lastCard.suit === suit && v.lastCard.rank === rank;
                  return <b key={rank} className={`slot ${on ? 'on' : ''} ${suit === 1 || suit === 2 ? 'r' : ''} ${last ? 'last' : ''} ${rank === 7 ? 'seven' : ''}`}>{on ? RL(rank) : ''}</b>; })}
              </div>))}</div>)}
          {v.pileCount !== undefined && !g.hold && (
            <div className="pilebox"><div className="stack">{[0, 1, 2].map(k => <CardBack key={k} style={{ left: k * 7, top: k * 4 }} />)}</div>
              <b>{v.pileCount} card{v.pileCount === 1 ? '' : 's'} in the pile</b>
              <small>{v.lastPlay ? `${g.names[v.lastPlay.seat]} claims ${v.lastPlay.count} × ${rankPlural(v.lastPlay.rank)}` : v.expect ? `New round · ${rankPlural(v.expect)}` : 'New round · name any rank'}</small></div>)}
          {dense ? <div className="strip">{center.map((t: any, ci: number) => <div key={`${t.seat}-${ci}`} className={`stc ${g.hold?.winner === t.seat ? 'win' : ''}`}><CardFace c={t.card} cls="md" /><small>{g.names[t.seat]}</small></div>)}</div> : center.map((t: any, ci: number) => { const p = pos(t.seat), same = center.filter((x: any) => x.seat === t.seat), at = same.indexOf(t); return <div key={`${t.seat}-${ci}`} className={`played ${g.hold?.winner === t.seat ? 'win' : ''}`} style={{ marginLeft: (at - (same.length - 1) / 2) * 26, left: `${50 + (dense ? 19 : 14) * p.c}%`, top: `${60 + (dense ? 20 : 17) * p.s}%`, transform: `translate(-50%,-50%) rotate(${(p.r * 37) % 9 - 4}deg)` }}><CardFace c={t.card} cls="md" /></div>; })}
          {prompt === 'bid' && (
            <div className="bidbox"><b>How many tricks will you win?</b>{g.s.sz !== undefined && <small className="hint"> Bids so far: {g.s.bids.reduce((a: number, b: number | null) => a + (b ?? 0), 0)} · tricks this round: {g.s.sz}</small>}<div>{legal.map(a => a.type === 'bid' && <button key={a.n} className="btn" onClick={() => g.act(a)}>{a.n}</button>)}</div></div>)}
          {prompt === 'trump' && (
            <div className="bidbox trumpbox"><b>Choose the trump suit (rang)</b><div>{legal.map(a => a.type === 'trump' && <button key={a.suit} className="btn" onClick={() => g.act(a)}>{'♠♥♦♣'[a.suit]}</button>)}</div></div>)}
          {prompt === 'hide' && <div className="bidbox"><b>Tap a card to set it face down as the hidden trump</b></div>}
          {g.canAct && g.s.phase === 'playing' && legal.some(a => a.type === 'ask') && <div className="bidbox askbox"><b>You can't follow suit</b><div><button className="btn" onClick={() => g.act({ type: 'ask' })}>Ask: reveal the trump</button></div></div>}
          {prompt === 'give' && <div className="bidbox"><b>{v.pulled ? `You pulled ${'A K Q J 10 9 8 7'.split(' ')[14 - v.pulled.rank] ?? v.pulled.rank}${'♠♥♦♣'[v.pulled.suit]}. ` : ''}Tap a card to give back</b></div>}
          {prompt === 'pass' && (
            <div className="bidbox passbox"><b>Pass {g.s.passCount} cards {DIRS[g.s.passDir]} to {g.names[(g.viewer + (g.s.passDir === 0 ? 1 : g.s.passDir === 1 ? n - 1 : n / 2)) % n]}</b>
              <div><button className="btn" disabled={sel.length !== g.s.passCount} onClick={() => { g.act({ type: 'pass', cards: sel }); setSel([]); }}>Pass {sel.length}/{g.s.passCount}</button></div></div>)}
        </div>
        {prompt === 'draw' && (
          <div className="pickbox"><b>Pick a card from {g.names[v.victim]}</b>
            <div className="pickrow">{Array.from({ length: v.handSizes[v.victim] }, (_, i) => <CardBack key={i} cls="pick" style={{ cursor: 'pointer' }} onClick={() => g.act({ type: 'draw', index: i })} />)}</div></div>)}
        {(prompt === 'pres' || prompt === 'return') && (
          <div className="actbar">
            {prompt === 'return' && <span style={{ alignSelf: 'center', fontSize: 13 }}>You received {v.received.map((c: Card) => `${rankLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`).join(' ')} — give back {g.s.xchg.count}</span>}
            <button className="btn play" disabled={!selIdx.length || !def.validate?.(g.s, g.viewer, prompt === 'pres' ? { type: 'set', cards: selIdx.map(i => myHand[i]) } : { type: 'return', cards: selIdx.map(i => myHand[i]) })}
              onClick={() => { g.act(prompt === 'pres' ? { type: 'set', cards: selIdx.map(i => myHand[i]) } : { type: 'return', cards: selIdx.map(i => myHand[i]) }); setSelIdx([]); }}>{prompt === 'pres' ? `Play ${selIdx.length || ''}` : 'Give back'}</button>
            {prompt === 'pres' && legal.some(a => a.type === 'skip') && <button className="btn ghost" onClick={() => g.act({ type: 'skip' })}>Pass</button>}
          </div>)}
        {prompt === 'yaniv' && v.step === 'discard' && (
          <div className="actbar">
            <button className="btn play" disabled={!selIdx.length || !def.validate?.(g.s, g.viewer, { type: 'discard', cards: selIdx.map(i => myHand[i]) })} onClick={() => { g.act({ type: 'discard', cards: selIdx.map(i => myHand[i]) }); setSelIdx([]); }}>Discard {selIdx.length || ''}</button>
            {legal.some(a => a.type === 'yaniv') && <button className="btn yaniv" onClick={() => g.act({ type: 'yaniv' })}>Yaniv!</button>}
          </div>)}
        {prompt === 'rummy' && (
          <div className="actbar">
            {v.step === 'draw' && <><span style={{ alignSelf: 'center', fontSize: 13 }}>Draw: tap the stock or the open card</span>{legal.some(a => a.type === 'drop') && <button className="btn ghost" onClick={() => g.act({ type: 'drop' })}>Drop ({v.moves[g.viewer] === 0 ? 20 : 40})</button>}</>}
            {v.step === 'discard' && (() => { const sel = selIdx.length ? v.hands[g.viewer][selIdx[0]] : null, showOk = !!sel && legal.some(a => a.type === 'show' && sameCard(a.card, sel));
              return <><button className="btn play" disabled={!sel} onClick={() => { g.act({ type: 'throw', card: sel! }); setSelIdx([]); }}>Discard</button>
                <button className={`btn ${showOk ? 'yaniv' : 'ghost'}`} disabled={!sel} onClick={() => { g.act({ type: 'show', card: sel! }); setSelIdx([]); }}>{showOk ? 'Show ✓' : 'Show (risky)'}</button></>; })()}
          </div>)}
        {prompt === 'cabo' && (
          <div className="actbar">
            {v.step === 'start' && <><span style={{ alignSelf: 'center', fontSize: 13 }}>Tap the deck to draw</span>{legal.some(a => a.type === 'cabo') && <button className="btn ghost" onClick={() => g.act({ type: 'cabo' })}>Call Cambrio!</button>}</>}
            {v.step === 'drawn' && <><span style={{ alignSelf: 'center', fontSize: 13 }}>Tap one of your cards to swap, or</span><button className="btn play" onClick={() => g.act({ type: 'dump' })}>Discard it</button></>}
            {v.step === 'power' && <><span style={{ alignSelf: 'center', fontSize: 13 }}>{v.power === 'self' ? 'Peek: tap one of your cards' : v.power === 'other' ? 'Spy: tap a card of another player' : tradeMine === null ? 'Swap: first tap one of YOUR cards' : 'Now tap the other player\'s card'}</span><button className="btn play" onClick={() => { setTradeMine(null); g.act({ type: 'skip' }); }}>Skip</button></>}
            {v.step === 'seen' && v.peek && <><span style={{ alignSelf: 'center', fontSize: 13 }}>{v.peek.seat === g.viewer ? 'Your card' : g.names[v.peek.seat] + "'s card"} #{v.peek.index + 1}:</span><CardFace c={v.peek.card} cls="md" /><button className="btn play" onClick={() => g.act({ type: 'done' })}>OK</button></>}
          </div>)}
        {prompt === 'seven' && <div className="actbar"><span style={{ alignSelf: 'center', fontSize: 13 }}>No card fits — </span><button className="btn" onClick={() => g.act({ type: 'skip' })}>Pass</button></div>}
        {prompt === 'bluff' && (
          <div className="actbar">
            {claimRanks.length > 1 && <div className="rk">{claimRanks.map(r => <button key={r} className={r === claimRank ? 'on' : ''} onClick={() => setRk(r)}>{RL(r)}</button>)}</div>}
            {claimRanks.length > 0 && <button className="btn play" disabled={!selIdx.length} onClick={() => { g.act({ type: 'claim', cards: selIdx.map(i => myHand[i]), rank: claimRank }); setSelIdx([]); }}>Play {selIdx.length || ''} as {rankPlural(claimRank)}</button>}
            {legal.some(a => a.type === 'call') && <button className="btn" onClick={() => g.act({ type: 'call' })}>🔔 Call Bluff</button>}
            {legal.some(a => a.type === 'skip') && <button className="btn ghost" onClick={() => g.act({ type: 'skip' })}>{v.lastPlay && v.handSizes[v.lastPlay.seat] === 0 ? 'Let them win' : 'Pass'}</button>}
          </div>)}
        {spoonsMode && g.canAct && v.stage === 'pass' && v.myPick === null && <div className="timer" key={`${v.round}-${v.tick}`}><i style={{ animationDuration: `${limit}ms` }} /></div>}
        <div className="me"><div className="av sm"><Avatar seed={g.names[g.viewer]} /></div><div><div className="nm">{g.names[g.viewer]}</div><div className="badge">{def.badge(v, g.viewer)}</div>{def.seatNote && def.seatNote(v, g.viewer) && <div className="bubble">{def.seatNote(v, g.viewer)}</div>}</div></div>
      </div>
      {caboMode ? (
        <div className="hand cabohand">{[0, 1, 2, 3].map(k => { const c = cardAt(g.viewer, k), pickable = prompt === 'cabo' && (v.step === 'drawn' || (v.step === 'power' && (v.power === 'self' || v.power === 'swap')));
          const cls = `${pickable ? 'ok' : ''} ${tradeMine === k ? 'sel' : ''}`;
          const click = () => { if (!pickable) return; if (v.step === 'drawn') g.act({ type: 'swap', index: k }); else if (v.power === 'self') g.act({ type: 'peek', index: k }); else setTradeMine(k); };
          return c ? <CardFace key={k} c={c} cls={cls} onClick={click} /> : <CardBack key={k} cls={cls} onClick={click} />; })}</div>
      ) : null}
      {rummyMode && groups && !g.needHandover && (
        <div className="hand rummyhand">{groups.map((grp: number[], gi: number) => (
          <div key={gi} className={`grp ${gi === groups.length - 1 && grp.length && groups.length > 0 && v.hands[g.viewer].length && gi >= 0 && grp.some((i: number) => true) && gi === groups.length - 1 && groups.length > 1 && false ? '' : ''}`}>
            {grp.map((i: number) => <CardFace key={i} c={v.hands[g.viewer][i]} cls={handCls(v.hands[g.viewer][i], i)} onClick={() => clickCard(v.hands[g.viewer][i], i)} />)}</div>))}</div>)}
      <div className={`hand ${g.canAct ? 'mine' : ''}`}  style={{ ['--ovf' as any]: v.hands[g.viewer].length > 20 ? -0.78 : v.hands[g.viewer].length > 14 ? -0.66 : -0.52, ...(caboMode || (rummyMode && groups) ? { display: 'none' } : {}) }}>
        {!g.needHandover && v.hands[g.viewer].map((c: Card, idx: number) => <CardFace key={`${c.suit}-${c.rank}-${idx}`} c={c} cls={handCls(c, idx)} onClick={() => clickCard(c, idx)} />)}
      </div>
      {tut && <Tutorial id={def.id} name={def.name} onClose={() => setTut(false)} />}
      {g.needHandover && <div className="modal"><div className="panel"><h2>Pass the phone to {g.names[g.s.turn]}</h2><button className="btn big" onClick={g.reveal}>I'm {g.names[g.s.turn]} — show my cards</button></div></div>}
      {(showSc || g.roundOver) && (
        <div className="modal"><div className="panel wide">
          <h2>{done ? `🏆 ${def.winners(g.s).map((i: number) => g.names[i]).join(' & ')} won!` : g.roundOver ? `Round ${g.s.round + 1} complete` : 'Scorecard'}</h2>
          {done && <div className="reward-toast">Your finish: {place}{place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'} · +{matchReward} play coins (including +15 completion reward)</div>}
          {def.summary && g.roundOver && <div className="summary">{def.summary(def.view(g.s, g.viewer), g.names).map((l: string, i: number) => <div key={i}>{l}</div>)}</div>}
          <Scorecard rows={def.rows(g.s.history)} names={g.names} totals={g.s.totals} lowWins={def.lowWins} hint={def.hint} />
          <div className="row end">
            {done ? <>{again && <button className="btn" onClick={again}>Play again</button>}<button className="btn ghost" onClick={exit}>Menu</button></>
              : g.roundOver ? (canNext ? <button className="btn big" onClick={() => { setShowSc(false); g.next(); }}>Next round ▶</button> : <p className="hint">Waiting for the host to start the next round…</p>)
                : <button className="btn" onClick={() => setShowSc(false)}>Close</button>}
          </div></div></div>)}
    </div>
  );
}

function History() {
  const [rec, setRec] = useState<Saved | undefined>(), [search, setSearch] = useState(''), [result, setResult] = useState('all'), [range, setRange] = useState('all'), [order, setOrder] = useState('newest');
  const list = load<Saved[]>('cca.history', []).filter(r => r.rows)
    .filter(r => `${r.game} ${r.names.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(r => range === 'all' || Date.now() - Date.parse(r.date) <= Number(range) * 86400000)
    .filter(r => {
      if (result === 'all' || r.you === undefined) return true;
      const best = r.lowWins ? Math.min(...r.totals) : Math.max(...r.totals), won = r.totals[r.you] === best;
      return result === 'won' ? won : !won;
    }).sort((a, b) => (Date.parse(a.date) - Date.parse(b.date)) * (order === 'oldest' ? 1 : -1));
  return (
    <div className="history-embedded">{rec && <div className="history-back"><button className="outline-action" onClick={() => setRec(undefined)}>‹ All matches</button><h2>{rec.game}</h2></div>}
      {rec ? <><div className="history-meta"><b>{new Date(rec.date).toLocaleString()}</b><span>{rec.names.map((nm, j) => `${nm} ${rec.totals[j]}`).join(' · ')}</span>{rec.options?.length ? <small>{rec.options.join(' · ')}</small> : null}</div><Scorecard rows={rec.rows} names={rec.names} totals={rec.totals} lowWins={rec.lowWins} hint={rec.hint} /></> : <>
        <div className="history-toolbar"><input aria-label="Search history" placeholder="Search games or players" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter by result" value={result} onChange={e => setResult(e.target.value)}><option value="all">All results</option><option value="won">Wins</option><option value="other">Other results</option></select><select aria-label="Filter by date" value={range} onChange={e => setRange(e.target.value)}><option value="all">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select><select aria-label="Sort history" value={order} onChange={e => setOrder(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        <div className="history-list">{list.map((r, i) => { const seat = r.you ?? 0, best = r.lowWins ? Math.min(...r.totals) : Math.max(...r.totals), won = r.totals[seat] === best; return <button key={`${r.date}-${i}`} className="history-item" onClick={() => setRec(r)}><span className="history-game-icon">{r.game.slice(0, 1)}</span><span className="history-item-main"><b>{r.game}</b><small>{new Date(r.date).toLocaleString()} · {r.names.length} players</small><i>{r.options?.slice(0, 2).join(' · ') || 'Default rules'}{r.placement ? ` · ${r.placement}${r.placement === 1 ? 'st' : r.placement === 2 ? 'nd' : r.placement === 3 ? 'rd' : 'th'} · +${r.reward ?? 0} coins` : ''}</i></span><span className="history-result"><small>{r.you === undefined ? 'RESULT' : won ? 'WIN' : 'FINISH'}</small><b>{r.totals[seat] ?? '-'} pts</b></span><span className="history-arrow">›</span></button>; })}
          {!list.length && <div className="history-empty"><b>{search || result !== 'all' || range !== 'all' ? 'No matches for these filters' : 'No finished games yet'}</b><span>{search || result !== 'all' || range !== 'all' ? 'Change a filter or search term to see more.' : 'Finish a game and its scorecard will be saved on this device.'}</span></div>}</div>
      </>}
    </div>
  );
}

/** The invite popup: share the room link to a saved friend or a recent player, or to anyone via WhatsApp / the phone's share sheet. */
export function InviteSheet({ code, game, host, onClose }: { code: string; game: string; host: string; onClose: () => void }) {
  const def = byId(game), { friends, recent } = inviteTargets(host), [note, setNote] = useState('');
  const link = () => { const u = new URL(window.location.href); u.search = ''; u.searchParams.set('invite', code); u.searchParams.set('game', game); u.searchParams.set('host', host || 'Guest'); return u.href; };
  const text = (who?: string) => `${who ? `Hi ${who}! ` : ''}${host || 'Guest'} invited you to play ${def.name} on Card Club Arcade. Room code: ${code}`;
  const whatsapp = (who?: string) => { window.open(`https://wa.me/?text=${encodeURIComponent(`${text(who)}\n${link()}`)}`, '_blank'); };
  const share = async (who?: string) => { try { if (navigator.share) await navigator.share({ title: `${def.name} invitation`, text: text(who), url: link() }); else whatsapp(who); } catch { setNote('Sharing was closed - you can try again.'); } };
  const copy = async () => { try { await navigator.clipboard.writeText(`${text()}\n${link()}`); setNote('Invite link copied.'); } catch { setNote(`Room code: ${code}`); } };
  const row = (who: string, tag: string) => <div className="invite-row" key={who}><span className="invite-avatar">{who.slice(0, 1).toUpperCase()}</span><span className="invite-who"><b>{who}</b><small>{tag}</small></span><button className="invite-go" onClick={() => share(who)} aria-label={`Invite ${who}`}>Invite</button></div>;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <section className="invite-sheet" role="dialog" aria-label="Invite friends" onClick={e => e.stopPropagation()}>
        <header><div><small>ROOM {code}</small><h2>Invite friends to {def.name}</h2></div><button className="sheet-close" onClick={onClose} aria-label="Close">×</button></header>
        <div className="invite-actions"><button className="invite-wa" onClick={() => whatsapp()}>WhatsApp</button><button onClick={() => share()}>Share…</button><button onClick={copy}>Copy link</button></div>
        {note && <p className="invite-note" role="status">{note}</p>}
        <div className="invite-lists">
          <div><h3>Saved friends</h3>{friends.length ? friends.map(f => row(f, 'Saved friend')) : <p>None yet - add friends in the menu.</p>}</div>
          <div><h3>Played recently <small>last 10 matches</small></h3>{recent.length ? recent.map(f => row(f, 'Recent player')) : <p>Players you meet in room games show up here.</p>}</div>
        </div>
      </section>
    </div>
  );
}

const newCode = () => String(100000 + Math.floor(Math.random() * 900000));
function Seats({ names, humans, me }: { names: string[]; humans: number[]; me: number }) {
  return <div className="seats">{names.map((nm, i) => <div key={i} className="tile sm"><div className="av sm"><Avatar seed={nm} /></div><b>{nm}{i === me ? ' (you)' : ''}</b><small>{humans.includes(i) ? (i === 0 ? 'host' : 'joined') : '🤖 bot'}</small></div>)}</div>;
}
function HostWait({ id, opts, go }: { id: string; opts: HostOpts; go: (s: Screen) => void }) {
  const def = byId(id), [room] = useState(() => new HostRoom(def, { cfg: opts.cfg, seed: Math.floor(Math.random() * 1e9), level: opts.level, hostName: opts.name }, newCode()));
  const [err, setErr] = useState(''), [ready, setReady] = useState(false), [shareNote, setShareNote] = useState(''), [, force] = useState(0), [sheet, setSheet] = useState(false), asked = useRef(false);
  useEffect(() => { if (ready && !asked.current) { asked.current = true; const t = inviteTargets(opts.name); if (t.friends.length || t.recent.length) setSheet(true); } }, [ready]); // eslint-disable-line
  useEffect(() => room.onChange(() => force(x => x + 1)), [room]);
  useEffect(() => {
    let dead = false;
    (async () => {
      for (let k = 0; k < 4 && !dead; k++) {
        try { room.transport = await openHost(room.code, c => room.accept(c)); setReady(true); return; }
        catch (e: any) { if (e?.type === 'unavailable-id') { room.code = newCode(); continue; } setErr('Could not reach the connection service. Check your internet and try again.'); return; }
      }
      setErr('Could not open a room. Please try again.');
    })();
    return () => { dead = true; };
  }, [room]);
  const back = () => { room.dispose(); go({ n: 'home' }); };
  const shareInvite = async () => {
    const inviteUrl = new URL(window.location.href);
    inviteUrl.search = '';
    inviteUrl.searchParams.set('invite', room.code);
    inviteUrl.searchParams.set('game', def.id);
    inviteUrl.searchParams.set('host', opts.name || 'Guest');
    const message = `${opts.name || 'Guest'} invited you to ${def.name} in Card Club Arcade. Open this invite to join. Room code: ${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: `${def.name} invitation`, text: message, url: inviteUrl.href });
      else { await navigator.clipboard.writeText(`${message}\n${inviteUrl.href}`); setShareNote('Invite link copied. Send it to your friend.'); }
    } catch { setShareNote('Share was closed. You can send the room code shown above.'); }
  };
  return (
    <div className="page home">
      <div className="top"><button className="btn ghost" onClick={back}>‹ Back</button><h2>{def.name} · Room</h2></div>
      {err ? <p className="hint">{err}</p> : <>
        <p className="hint">{ready ? 'Tell your friends to tap “Join with code” and enter:' : 'Opening room…'}</p>
        <div className="code">{ready ? room.code : '······'}</div>
        <button className="btn" disabled={!ready} onClick={() => setSheet(true)}>Invite friends</button> <button className="btn ghost" disabled={!ready} onClick={shareInvite}>Share link</button>{shareNote && <p className="hint">{shareNote}</p>}
        <Seats names={room.names} humans={[...room.humans]} me={0} />
        <p className="hint">Empty seats are filled by bots. You need an internet connection; friends can be on any network.</p>
        <button className="btn big" disabled={!ready} onClick={() => { room.start(); go({ n: 'net', room, isHost: true, speed: opts.speed }); }}>▶ Start game</button></>}
      {sheet && <InviteSheet code={room.code} game={id} host={opts.name} onClose={() => setSheet(false)} />}
    </div>
  );
}
function JoinRoom({ name, go, initialCode = '' }: { name: string; go: (s: Screen) => void; initialCode?: string }) {
  const [code, setCode] = useState(initialCode), [msg, setMsg] = useState(''), [room, setRoom] = useState<ClientRoom | null>(null), [, force] = useState(0);
  useEffect(() => room?.onChange(() => force(x => x + 1)), [room]);
  useEffect(() => { if (room?.started) go({ n: 'net', room, isHost: false, speed: 'normal' }); }, [room?.started]); // eslint-disable-line
  const join = async () => {
    setMsg('Connecting…');
    try { const r = new ClientRoom(await joinCode(code), name || 'Player'); setRoom(r); setMsg(''); }
    catch { setMsg('Could not find that room. Check the code and your internet.'); }
  };
  return (
    <div className="page home">
      <div className="top"><button className="btn ghost" onClick={() => { room?.dispose(); go({ n: 'home' }); }}>‹ Back</button><h2>Join a room</h2></div>
      {!room ? <>
        <input className="inp code-in" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="btn big" disabled={code.length < 4} onClick={join}>Join</button><p className="hint">{msg}</p></> : (
        room.full ? <p className="hint">That room is full or already started.</p> : room.lost ? <p className="hint">Connection lost.</p> : <>
          <p className="hint">Joined {byId(room.gameId || 'callbreak').name}! Waiting for the host to start…</p>
          {room.names.length > 0 && <Seats names={room.names} humans={room.humans} me={room.seat} />}</>)}
    </div>
  );
}
