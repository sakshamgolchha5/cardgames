import { useState } from 'react';
import { CardFace } from './ui';
import { parseCards } from './engine/cards';
import { TUTORIALS } from './tutorials';

const LABELS: Record<number, string[]> = { 3: ['You', 'Left', 'Right'], 4: ['You', 'Left', 'Top', 'Right'] };

export function Tutorial({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const steps = TUTORIALS[id] ?? [], [i, setI] = useState(0), s = steps[i];
  if (!s) return null;
  const n = s.n ?? 4, hand = s.hand ? parseCards(s.hand) : [], last = i === steps.length - 1;
  return (
    <div className="modal"><div className="panel wide tut">
      <div className="tuttop"><h2>{name}: how to play</h2><button className="btn ghost" onClick={onClose}>✕</button></div>
      <div className="tutbody">
        <div className="tutleft">
          <div className="tutdemo">
            {s.big && <div className="tutbig">{s.big}</div>}
            {s.table?.map(([seat, k]) => {
              const th = ((90 + (seat * 360) / n) * Math.PI) / 180;
              return <div key={seat} className={`tutcard ${s.win === seat ? 'win' : ''}`} style={{ left: `${50 + 32 * Math.cos(th)}%`, top: `${54 + 28 * Math.sin(th)}%` }}><CardFace c={parseCards(k)[0]} /><small>{LABELS[n][seat]}</small></div>;
            })}
          </div>
          {hand.length > 0 && <div className="tuthand">{hand.map((c, j) => <CardFace key={j} c={c} cls={s.mark?.includes(j) ? 'ok' : ''} />)}</div>}
        </div>
        <div className="tutright"><h3>{s.title}</h3><p>{s.text}</p></div>
      </div>
      <div className="row end">
        <div className="dots">{steps.map((_, j) => <i key={j} className={j === i ? 'on' : ''} />)}</div>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
        <button className="btn" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Got it!' : 'Next ›'}</button>
      </div>
    </div></div>
  );
}
