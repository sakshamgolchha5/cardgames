const MARKS: Record<string, { rank: string; pip: string; tone: string }> = {
  callbreak: { rank: 'A', pip: '♠', tone: 'spade' },
  hearts: { rank: 'Q', pip: '♥', tone: 'heart' },
  courtpiece: { rank: 'K', pip: '♦', tone: 'diamond' },
  dehla: { rank: '10', pip: '10', tone: 'ten' },
  threetwofive: { rank: '3', pip: '2·5', tone: 'three' },
  confidence: { rank: 'BID', pip: '✓', tone: 'bid' },
  bluff: { rank: '!', pip: '?', tone: 'bluff' },
  seven: { rank: '7', pip: '7', tone: 'seven' },
  ghulam: { rank: 'J', pip: '♣', tone: 'jack' },
  donkey: { rank: '9', pip: '9', tone: 'donkey' },
  president: { rank: 'K', pip: '♛', tone: 'crown' },
  spoons: { rank: '4', pip: '✳', tone: 'spoon' },
  yaniv: { rank: 'A', pip: '↓', tone: 'low' },
  cabo: { rank: '?', pip: '◌', tone: 'memory' },
  rummy: { rank: 'R', pip: '↗', tone: 'run' },
};

/** An original, consistent card mark for each game; decorative so names stay the accessible labels. */
export function GameMark({ gameId, className = '' }: { gameId: string; className?: string }) {
  const mark = MARKS[gameId] ?? { rank: 'A', pip: '♣', tone: 'spade' };
  const pipSize = mark.pip.length > 1 ? 8 : mark.pip.length === 1 && mark.pip.charCodeAt(0) > 127 ? 16 : 14;
  return <span className={`game-icon game-mark tone-${mark.tone} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 48 52" focusable="false">
      <rect className="mark-shadow-card" x="4.5" y="10" width="25" height="35" rx="4" transform="rotate(-11 17 27.5)" />
      <rect className="mark-front-card" x="17" y="6" width="25" height="35" rx="4" />
      <text className="mark-rank" x="21" y="16">{mark.rank}</text>
      <text className="mark-pip" x="29.5" y="32" textAnchor="middle" fontSize={pipSize}>{mark.pip}</text>
      <circle className="mark-dot" cx="37.5" cy="11.5" r="1.4" />
    </svg>
  </span>;
}
