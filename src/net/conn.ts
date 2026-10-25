/** A two-way message pipe. PeerJS (real phones) and the in-memory pair (tests) both implement it. */
export interface Conn { send(m: any): void; onMessage(cb: (m: any) => void): void; onClose(cb: () => void): void; close(): void }

export function memoryPair(): [Conn, Conn] {
  const mk = () => ({ msg: [] as ((m: any) => void)[], close: [] as (() => void)[], closed: false });
  const a = mk(), b = mk();
  const end = (me: ReturnType<typeof mk>, other: ReturnType<typeof mk>): Conn => ({
    send: m => { const copy = JSON.parse(JSON.stringify(m)); if (!me.closed) queueMicrotask(() => other.msg.forEach(f => f(copy))); },
    onMessage: cb => { me.msg.push(cb); }, onClose: cb => { me.close.push(cb); },
    close: () => { if (me.closed) return; me.closed = true; other.closed = true; queueMicrotask(() => { me.close.forEach(f => f()); other.close.forEach(f => f()); }); },
  });
  return [end(a, b), end(b, a)];
}
