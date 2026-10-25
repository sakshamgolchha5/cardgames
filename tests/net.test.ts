import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/engine/cards';
import { byId, GAMES } from '../src/games/registry';
import { ClientRoom, HostRoom } from '../src/net/room';
import { seatsOf } from '../src/games/types';
import { memoryPair } from '../src/net/conn';

const tick = () => new Promise(r => setTimeout(r, 0));
const join = async (room: HostRoom, name: string) => { const [a, b] = memoryPair(); room.accept(a); const c = new ClientRoom(b, name); await tick(); return c; };

describe('room-code multiplayer protocol', () => {
  for (const g of GAMES.filter(x => !x.plan)) it(`${g.name}: host + 2 remote players + 1 bot finish a full match; nobody ever sees another hand`, async () => {
    const def = byId(g.id), cfg = Object.fromEntries(def.options.map(o => [o.key, o.def]));
    if ('rounds' in cfg) cfg.rounds = 3; if ('target' in cfg) cfg.target = g.id === 'hearts' ? 50 : 5;
    const room = new HostRoom(def, { cfg, seed: 7, level: 'medium', hostName: 'Host' }, '123456'), rng = makeRng(3);
    const c1 = await join(room, 'Asha'), c2 = await join(room, 'Ravi');
    expect([c1.seat, c2.seat]).toEqual([1, 2]); expect(c1.names.slice(0, 3)).toEqual(['Host', 'Asha', 'Ravi']); expect(c1.started).toBe(false);
    room.start(); await tick();
    for (let i = 0; i < 20000 && room.state.phase !== 'gameEnd'; i++) {
      await tick(); const s = room.state;
      if (s.phase === 'gameEnd') break;
      if (s.phase === 'roundEnd') { room.nextRound(); continue; }
      for (const c of [c1, c2]) { const v = c.state; for (let k = 0; k < seatsOf(def, cfg); k++) if (k !== c.seat) expect(v.hands[k].length).toBe(0); }
      if (room.botStep(rng)) continue;
      if (s.turn === 0) room.act(0, def.chooseAction(def.view(s, 0), 0, 'hard', rng));
      else { const c = s.turn === 1 ? c1 : c2; c.act(def.chooseAction(c.state, c.seat, 'hard', rng)); }
    }
    await tick(); expect(room.state.phase).toBe('gameEnd'); expect(c1.state.phase).toBe('gameEnd'); expect(c1.state.totals).toEqual(room.state.totals);
  }, 30000);

  it('rejects out-of-turn actions, a full room, and lets a bot take over a seat when a player disconnects', async () => {
    const def = byId('callbreak'), room = new HostRoom(def, { cfg: { rounds: 3, mode: 'normal', mustBeat: true, redealNoSpade: false }, seed: 1, level: 'easy', hostName: 'Host' });
    const c1 = await join(room, 'A'), c2 = await join(room, 'B'), c3 = await join(room, 'C'), late = await join(room, 'D');
    expect(c3.seat).toBe(3); expect(late.full).toBe(true);
    room.start(); await tick(); const before = room.version;
    const wrong = [c1, c2, c3].find(c => c.state.turn !== c.seat)!; wrong.act({ type: 'bid', n: 3 }); await tick();
    expect(room.version).toBe(before); expect(wrong.error).toContain('Error');
    const turnSeat = room.state.turn, c = [c1, c2, c3].find(x => x.seat === turnSeat); if (c) { c.conn.close(); await tick(); expect(room.humans.has(c.seat)).toBe(false); expect(room.botStep(makeRng(1))).toBe(true); }
  });

  it('Spoons (real time): host + 2 remote players + bots; remote players act any time, hands stay private until the round ends', async () => {
    const def = byId('spoons'), cfg = { players: 5, limit: 'normal', letters: 3 };
    const room = new HostRoom(def, { cfg, seed: 4, level: 'medium', hostName: 'Host' }, '123456'), rng = makeRng(8);
    const c1 = await join(room, 'Asha'), c2 = await join(room, 'Ravi'); room.start(); await tick();
    const clients: Record<number, ClientRoom> = { 1: c1, 2: c2 };
    for (let i = 0; i < 40000 && room.state.phase !== 'gameEnd'; i++) {
      await tick(); const s = room.state;
      if (s.phase === 'gameEnd') break;
      if (s.phase === 'roundEnd') { room.nextRound(); continue; }
      for (const c of [c1, c2]) for (let k = 0; k < 5; k++) if (k !== c.seat && !c.state.revealed) expect(c.state.hands[k].length).toBe(0);
      const it = def.plan!(s, 'medium', rng, room.humans, 5000).sort((a, b) => a.delay - b.delay)[0]; if (!it) throw new Error('stalled');
      if (it.seat === 0) room.act(0, it.action); else if (clients[it.seat]) clients[it.seat].act(it.action); else room.act(it.seat, it.action);
    }
    await tick(); expect(room.state.phase).toBe('gameEnd'); expect(c1.state.phase).toBe('gameEnd'); expect(c1.state.letters).toEqual(room.state.letters);
  }, 60000);
});
