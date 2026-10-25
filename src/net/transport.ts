import type { Conn } from './conn';
const PREFIX = 'cardclub-arcade-';
const wrap = (dc: any): Conn => ({ send: m => dc.send(m), onMessage: cb => dc.on('data', cb), onClose: cb => dc.on('close', cb), close: () => dc.close() });

/** Opens a room under a short code on the public PeerJS broker; players then talk directly (WebRTC). */
export async function openHost(code: string, onConn: (c: Conn) => void): Promise<{ close(): void }> {
  const { Peer } = await import('peerjs'); const peer = new Peer(PREFIX + code);
  await new Promise<void>((res, rej) => { peer.on('open', () => res()); peer.on('error', e => rej(e)); });
  peer.on('connection', dc => dc.on('open', () => onConn(wrap(dc))));
  return { close: () => peer.destroy() };
}
export async function joinCode(code: string): Promise<Conn> {
  const { Peer } = await import('peerjs'); const peer = new Peer();
  return new Promise<Conn>((res, rej) => {
    const timer = setTimeout(() => { peer.destroy(); rej(new Error('timeout')); }, 12000);
    peer.on('error', e => { clearTimeout(timer); rej(e); });
    peer.on('open', () => { const dc = peer.connect(PREFIX + code, { reliable: true }); dc.on('open', () => { clearTimeout(timer); res(wrap(dc)); }); dc.on('error', e => { clearTimeout(timer); rej(e); }); });
  });
}
