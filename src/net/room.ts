import { makeRng, shuffle } from '../engine/cards';
import { BOT_NAMES } from '../games/names';
import { seatsOf, type GAction, type GameDef, type Level } from '../games/types';
import type { Conn } from './conn';

export interface HostOptions { cfg: any; seed: number; level: Level; hostName: string }
type Listener = () => void;
class Emitter { private ls: Listener[] = []; onChange(cb: Listener) { this.ls.push(cb); return () => { this.ls = this.ls.filter(x => x !== cb); }; } protected emit() { this.ls.forEach(f => f()); } }

/** The host owns the one true game state. Clients only ever receive their own view and can only send actions,
 *  which the engine validates (turn, legality) before applying — a client can never change another player's hand. */
export class HostRoom extends Emitter {
  seat = 0; state: any = null; started = false; version = 0; lost = false; seats: number;
  names: string[]; humans = new Set<number>([0]); conns = new Map<number, Conn>(); transport: { close(): void } | null = null;
  constructor(public def: GameDef, public o: HostOptions, public code = '') {
    super(); const bots = shuffle(BOT_NAMES, makeRng(o.seed ^ 0x51ed)); this.seats = seatsOf(def, o.cfg);
    this.names = Array.from({ length: this.seats }, (_, i) => (i === 0 ? o.hostName || 'Host' : bots[i]));
  }
  get gameId() { return this.def.id; } get cfg() { return this.o.cfg; }
  accept(conn: Conn) { let joined = false; conn.onMessage(m => { if (m?.t === 'join' && !joined) { joined = true; this.join(conn, String(m.name ?? '')); } }); }
  join(conn: Conn, name: string): number {
    let seat = -1; if (!this.started) for (let i = 1; i < this.seats; i++) if (!this.humans.has(i)) { seat = i; break; }
    if (seat < 0) { conn.send({ t: 'full' }); conn.close(); return -1; }
    this.humans.add(seat); this.conns.set(seat, conn); this.names[seat] = (name || `Player ${seat + 1}`).slice(0, 14);
    conn.onMessage(m => { if (m?.t === 'act') this.act(seat, m.a); });
    conn.onClose(() => this.drop(seat)); this.sendLobby(); this.emit(); return seat;
  }
  private sendLobby() { for (const [seat, c] of this.conns) c.send({ t: 'lobby', seat, game: this.def.id, names: this.names, humans: [...this.humans], cfg: this.o.cfg }); }
  start() { if (this.started) return; this.started = true; this.state = this.def.create(this.o.cfg, this.o.seed); this.broadcast(); }
  private broadcast() {
    this.version++;
    for (const [seat, c] of this.conns) c.send({ t: 'state', v: this.version, seat, names: this.names, view: this.def.view(this.state, seat) });
    this.emit();
  }
  act(seat: number, a: GAction): boolean {
    try { this.state = this.def.apply(this.state, seat, a); } catch (e) { this.conns.get(seat)?.send({ t: 'reject', reason: String(e) }); return false; }
    this.broadcast(); return true;
  }
  nextRound() { this.state = this.def.nextRound(this.state); this.broadcast(); }
  /** Plays one bot move if it is a bot's turn (also covers seats whose human left). */
  botStep(rng: () => number): boolean {
    const s = this.state; if (!this.started || s.phase === 'roundEnd' || s.phase === 'gameEnd' || this.humans.has(s.turn)) return false;
    return this.act(s.turn, this.def.chooseAction(this.def.view(s, s.turn), s.turn, this.o.level, rng));
  }
  private drop(seat: number) { this.humans.delete(seat); this.conns.delete(seat); if (this.started) this.broadcast(); else { this.sendLobby(); this.emit(); } }
  dispose() { this.transport?.close(); this.conns.forEach(c => c.close()); }
}

export class ClientRoom extends Emitter {
  seat = -1; names: string[] = []; state: any = null; started = false; gameId = ''; cfg: any = null; humans: number[] = [];
  lost = false; full = false; version = 0; error = '';
  constructor(public conn: Conn, name: string) {
    super();
    conn.onMessage(m => this.onMsg(m)); conn.onClose(() => { this.lost = true; this.emit(); });
    conn.send({ t: 'join', name });
  }
  private onMsg(m: any) {
    if (m.t === 'lobby') { this.seat = m.seat; this.gameId = m.game; this.names = m.names; this.humans = m.humans; this.cfg = m.cfg; }
    else if (m.t === 'state') { if (m.v <= this.version) return; this.version = m.v; this.seat = m.seat; this.names = m.names; this.state = m.view; this.started = true; }
    else if (m.t === 'full') this.full = true; else if (m.t === 'reject') this.error = m.reason;
    this.emit();
  }
  act(a: GAction) { this.conn.send({ t: 'act', a }); }
  dispose() { this.conn.close(); }
}
