import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/** Card Club Arcade is a landscape app. On a phone held upright the whole app is turned 90 degrees, so it is landscape from the first screen even if the phone's
 *  rotation is locked. Sizes use --vh / --vw (1% of the frame) and @container queries, so a turned app lays out exactly like a real landscape screen. */
const read = () => ({ w: window.innerWidth, h: window.innerHeight });
export function frameFor(w: number, h: number) { const turned = h > w && w < 900; return { turned, fw: turned ? h : w, fh: turned ? w : h }; }
export default function Landscape({ children }: { children: ReactNode }) {
  const [s, setS] = useState(read);
  useEffect(() => {
    const f = () => setS(read());
    window.addEventListener('resize', f); window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  useEffect(() => {   // on touch phones: first tap goes fullscreen and asks the system to lock landscape (works where the browser allows it)
    if (!window.matchMedia?.('(pointer:coarse)').matches) return;
    const go = () => { try { void (document.documentElement.requestFullscreen?.() ?? Promise.resolve()).then(() => (screen.orientation as any)?.lock?.('landscape')).catch(() => {}); } catch { /* not supported */ } };
    window.addEventListener('pointerup', go, { once: true });
    return () => window.removeEventListener('pointerup', go);
  }, []);
  const { turned, fw, fh } = frameFor(s.w, s.h);
  const style: CSSProperties & Record<string, string | number> = { width: fw, height: fh, '--vh': `${fh / 100}px`, '--vw': `${fw / 100}px`, ...(turned ? { left: s.w, transform: 'rotate(90deg)' } : {}) };
  return <div className={`landscape-root${turned ? ' turned' : ''}`} style={style}>{children}</div>;
}
