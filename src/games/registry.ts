import type { GameDef } from './types';
import * as CB from './callbreak/engine';
import { chooseAction as cbBot } from './callbreak/bot';
import * as H from './hearts/engine';
import { chooseAction as hBot } from './hearts/bot';
import * as CP from './courtpiece/engine';
import { chooseAction as cpBot } from './courtpiece/bot';
import * as MD from './dehla/engine';
import { chooseAction as mdBot } from './dehla/bot';
import * as TD from './threetwofive/engine';
import { chooseAction as tdBot } from './threetwofive/bot';
import * as CF from './confidence/engine';
import { chooseAction as cfBot } from './confidence/bot';
import * as BL from './bluff/engine';
import { chooseAction as blBot } from './bluff/bot';
import { rankPlural, rankLabel, SUIT_SYMBOLS } from '../engine/cards';
import * as CA from './cabo/engine';
import { chooseAction as caBot } from './cabo/bot';
import * as RM from './rummy/engine';
import { chooseAction as rmBot } from './rummy/bot';
import * as YN from './yaniv/engine';
import { chooseAction as ynBot } from './yaniv/bot';
import { cardId as _cid, rankLabel as _rl, SUIT_SYMBOLS as _ss } from '../engine/cards';
import * as SP from './spoons/engine';
import { chooseAction as spBot } from './spoons/bot';
import * as PR from './president/engine';
import { chooseAction as prBot } from './president/bot';
import * as DK from './donkey/engine';
import { chooseAction as dkBot } from './donkey/bot';
import * as GC from './ghulam/engine';
import { chooseAction as gcBot } from './ghulam/bot';
import * as SV from './seven/engine';
import { chooseAction as svBot } from './seven/bot';

const DIRS = ['left', 'right', 'across'];
/** Grammar for the player named "You": You play / Asha plays. */
const yv = (n: string, you: string, other: string) => (n === 'You' ? you : other);
export const GAMES: GameDef[] = [
  {
    id: 'callbreak', name: 'Callbreak', players: 4, icon: '♠', tagline: '4 players · bid, then win your tricks',
    options: [
      { key: 'rounds', label: 'Rounds', choices: [[3, '3 rounds'], [5, '5 rounds']], def: 5 },
      { key: 'mode', label: 'Bidding', choices: [['normal', 'Normal'], ['super8', 'Super 8'], ['blind', 'Blind bid']], def: 'normal' },
      { key: 'mustBeat', label: 'Must beat higher card', choices: [[true, 'On'], [false, 'Off']], def: true },
      { key: 'redealNoSpade', label: 'Redeal if no spade', choices: [[false, 'Off'], [true, 'On']], def: false },
    ],
    hint: 'Each cell: tricks won / bid, then points. Super 8: everyone bids 8 automatically. Blind: bids stay hidden until the round ends.',
    create: (c, s) => CB.create(c, s), view: CB.view, apply: CB.apply as any, nextRound: CB.nextRound, legalActions: CB.legalActions, chooseAction: cbBot,
    roundLabel: (s, c) => `Round ${Math.min(s.round + 1, c.rounds)}/${c.rounds}${c.mode === 'super8' ? ' · Super 8' : c.mode === 'blind' ? ' · Blind' : ''}`,
    badge: (v, i) => `${v.won[i]}/${v.bids[i] ?? '?'} · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `${r.won[i]}/${r.bids[i]}`, pts: p })) })),
    winners: CB.winners,
  },
  {
    id: 'hearts', name: 'Hearts', players: 8, seatsOf: c => c.players, icon: '♥', tagline: '3-8 players · dodge hearts and the Q♠', lowWins: true,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], def: 4 },
      { key: 'target', label: 'Game ends at', choices: [[50, '50 pts'], [100, '100 pts'], [150, '150 pts']], def: 100 },
      { key: 'passing', label: 'Card passing', choices: [[true, 'Pass cards'], [false, 'No passing']], def: true },
      { key: 'moon', label: 'Shooting the moon', choices: [['others26', 'Others +26'], ['minus26', 'Shooter −26']], def: 'others26' },
      { key: 'jackOfDiamonds', label: 'Jack of ♦', choices: [[false, 'Normal'], [true, '−10 points']], def: false },
      { key: 'queenBreaks', label: 'Q♠ breaks hearts', choices: [[false, 'Off'], [true, 'On']], def: false },
    ],
    hint: 'Lowest score wins. With 3, 5, 6, 7 or 8 players the lowest diamonds and clubs are removed so everyone gets the same number of cards. Each cell: points taken that hand, then points added (the 🌙 shooter avoids the penalty).',
    create: (c, s) => H.create(c, s), view: H.view, apply: H.apply as any, nextRound: H.nextRound, legalActions: H.legalActions, chooseAction: hBot,
    roundLabel: (s, c) => `Hand ${s.round + 1} · to ${c.target}${s.passDir >= 0 ? ` · pass ${DIRS[s.passDir]}` : ' · no pass'}`,
    badge: (v, i) => `${v.pts[i]} pts · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `H${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: r.moon === i ? '🌙 shot the moon' : r.moon !== null ? 'moon shot' : `took ${r.taken[i]}`, pts: p })) })),
    winners: H.winners,
  },
  {
    id: 'courtpiece', name: 'Court Piece', players: 4, icon: '♦', tagline: '4 players · 2 teams · call trump, win 7 tricks',
    options: [
      { key: 'sir', label: 'Trick collection', choices: [['single', 'Single Sir'], ['double', 'Double Sir'], ['doubleAce', 'Double Sir + Ace rule']], def: 'single' },
      { key: 'trumpMode', label: 'Trump', choices: [['caller', 'Caller picks (after 5 cards)'], ['beranga', 'Be-ranga (first void sets trump)']], def: 'caller' },
      { key: 'target', label: 'Game ends at', choices: [[5, '5 points'], [7, '7 points'], [11, '11 points']], def: 7 },
    ],
    hint: 'Seats 1 & 3 (you and the player across) are a team. Win 7+ of 13 tricks for 1 point; all 13 is a Court (3 points). Double Sir: tricks pile up until one player wins two in a row.',
    create: (c, s) => CP.create(c, s), view: CP.view, apply: CP.apply as any, nextRound: CP.nextRound, legalActions: CP.legalActions, chooseAction: cpBot,
    roundLabel: (s, c) => `Deal ${s.round + 1} · to ${c.target}${s.trump !== null ? ` · Trump ${'♠♥♦♣'[s.trump]}` : c.trumpMode === 'beranga' ? ' · No trump yet' : ''}${s.pile.length ? ` · Pile ${s.pile.length}` : ''}`,
    badge: (v, i) => `${i % 2 ? 'B' : 'A'} · ${v.teamTricks[i % 2]} tricks · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `${r.tricks[i % 2]} tricks${r.court && p ? ' · COURT' : ''}`, pts: p })) })),
    winners: CP.winners,
  },
  {
    id: 'dehla', name: 'Dehla Pakad', players: 4, icon: '🔟', tagline: '4 players · 2 teams · catch the tens',
    options: [
      { key: 'trumpMode', label: 'Trump (hukum)', choices: [['cut', 'Cut hukum (first void play)'], ['band', 'Hidden hukum (ask to reveal)'], ['random', 'Random hukum'], ['caller', 'Caller picks (after 5 cards)']], def: 'cut' },
      { key: 'target', label: 'Game ends at', choices: [[3, '3 points'], [5, '5 points'], [7, '7 points']], def: 5 },
      { key: 'bonus', label: 'Bonus points', choices: [[true, 'Mendikot 2 · Whitewash 3'], [false, '1 point per deal']], def: true },
    ],
    hint: 'You and the player across are a team. Win tricks that contain a 10. Capture 3 or 4 tens to win the deal; 2-2 goes to the side with 7+ tricks. All four tens = Mendikot. Hidden hukum: when you cannot follow suit you may ask to reveal the trump card.',
    create: (c, s) => MD.create(c, s), view: MD.view, apply: MD.apply as any, nextRound: MD.nextRound, legalActions: MD.legalActions, chooseAction: mdBot,
    roundLabel: (s, c) => `Deal ${s.round + 1} · to ${c.target}${s.trump !== null ? ` · Trump ${'♠♥♦♣'[s.trump]}` : s.hidden ? ' · Trump hidden' : c.trumpMode === 'cut' ? ' · No trump yet' : ''}`,
    badge: (v, i) => `Team ${i % 2 ? 'B' : 'A'} · ${v.tens[i % 2]} ten${v.tens[i % 2] === 1 ? '' : 's'} · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `${r.tens[i % 2]} tens · ${r.tricks[i % 2]} tricks${p && r.whitewash ? ' · 52!' : p && r.mendikot ? ' · MENDIKOT' : ''}`, pts: p })) })),
    winners: MD.winners,
  },
  {
    id: '325', name: '3-2-5', players: 3, icon: '🃏', tagline: '3 players · hit your target of 5, 3 or 2 tricks',
    options: [
      { key: 'rounds', label: 'Rounds', choices: [[3, '3 rounds'], [5, '5 rounds'], [10, '10 rounds']], def: 5 },
      { key: 'scoring', label: 'Scoring', choices: [['difference', 'Tricks − target'], ['hands', 'Tricks won']], def: 'difference' },
      { key: 'sevensTop', label: '7♥ and 7♠', choices: [[false, 'Normal cards'], [true, 'Top trumps']], def: false },
    ],
    hint: '30 cards. The trump caller needs 5 tricks, the next player 3, the dealer 2. Beat your target and next round you pull a random card from someone who missed theirs, then give one back.',
    create: (c, s) => TD.create(c, s), view: TD.view, apply: TD.apply as any, nextRound: TD.nextRound, legalActions: TD.legalActions, chooseAction: tdBot,
    roundLabel: (s, c) => `Round ${Math.min(s.round + 1, c.rounds)}/${c.rounds}${s.trump !== null ? ` · Trump ${'♠♥♦♣'[s.trump]}` : ''}`,
    badge: (v, i) => `${v.won[i]}/${v.targets[i]} · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `${r.won[i]}/${r.targets[i]}`, pts: p })) })),
    winners: TD.winners,
  },
  {
    id: 'confidence', name: 'Confidence', players: 8, seatsOf: c => c.players, icon: '♥', tagline: '3-10 players · exact bids · also called Oh Hell',
    options: [
      { key: 'players', label: 'Players', choices: [[10, '10'], [8, '8'], [6, '6'], [5, '5'], [4, '4'], [3, '3']], def: 8 },
      { key: 'decks', label: 'Decks', choices: [[1, '1 deck'], [2, '2 decks'], [3, '3 decks']], def: 2 },
      { key: 'lastBidRule', label: 'Dealer bids last and total can’t equal the tricks', choices: [[true, 'On'], [false, 'Off']], def: true },
    ],
    hint: 'Hearts are always trump. Bid exactly the tricks you will win: exact = 10 × bid + 10, miss = −10 × bid. Hands shrink by one card each round. The first round deals up to 8 cards each, as many as the decks allow (add decks for more players, up to 10).',
    create: (c, s) => CF.create(c, s), view: CF.view, apply: CF.apply as any, nextRound: CF.nextRound, legalActions: CF.legalActions, chooseAction: cfBot,
    infoText: (s, names) => {
      const sum = s.bids.reduce((a: number, b: number | null) => a + (b ?? 0), 0);
      return s.phase === 'bidding' ? `Bids so far ${sum} · ${s.sz} tricks · ${names[s.dealer]} bids last${s.config.lastBidRule ? ` (can't make it ${s.sz})` : ''}` : s.phase === 'playing' ? `Bids ${sum} / ${s.sz} tricks` : '';
    },
    seatNote: (s, i) => (s.phase === 'bidding' && i === s.dealer ? '🔚 bids last' : ''),
    roundLabel: (s, c) => `Round ${Math.min(s.round + 1, CF.roundCount(c))}/${CF.roundCount(c)} · ${s.sz} card${s.sz > 1 ? 's' : ''}`,
    badge: (v, i) => `${v.won[i]}/${v.bids[i] ?? '?'} · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `R${r.round} (${r.size})`, cells: r.points.map((p: number, i: number) => ({ sub: `${r.won[i]}/${r.bids[i]}`, pts: p })) })),
    winners: CF.winners,
  },
  {
    id: 'bluff', name: 'Bluff', players: 10, seatsOf: c => c.players, icon: '🎭', tagline: '2-10 players · play face down, lie, get caught',
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], def: 4 },
      { key: 'decks', label: 'Card decks', choices: [[1, '1 deck'], [2, '2 decks'], [3, '3 decks']], def: 1 },
      { key: 'rankMode', label: 'Claimed rank', choices: [['declare', 'Round starter names it'], ['sequence', 'Climbs A, 2, 3 … K']], def: 'declare' },
      { key: 'perTurn', label: 'Cards per turn', choices: [['any', 'Any number'], ['one', 'One card']], def: 'any' },
      { key: 'rounds', label: 'Deals', choices: [[1, '1 deal'], [3, '3 deals'], [5, '5 deals']], def: 3 },
    ],
    hint: 'Play cards face down and say what they are. The next player can call “Bluff!”: if you lied you take the whole pile, if you told the truth they do. First to empty their hand wins the deal. Use 2 or 3 decks for big tables.',
    create: (c, s) => BL.create(c, s), view: BL.view, apply: BL.apply as any, nextRound: BL.nextRound, legalActions: BL.legalActions, chooseAction: blBot,
    eventText: (s, names) => {
      const e = s.event as BL.Event; if (!e) return '';
      if (e.k === 'claim') return `${names[e.seat]} ${yv(names[e.seat], 'play', 'plays')} ${e.count} card${e.count > 1 ? 's' : ''} as ${rankPlural(e.rank)}`;
      if (e.k === 'call') return `${names[e.seat]} ${yv(names[e.seat], 'call', 'calls')} Bluff! ${e.liar ? `${names[e.target]} ${yv(names[e.target], 'were', 'was')} lying` : 'It was true'} — ${names[e.taker]} ${yv(names[e.taker], 'take', 'takes')} ${e.count} card${e.count === 1 ? '' : 's'}`;
      if (e.k === 'skip') return `${names[e.seat]} ${yv(names[e.seat], 'pass', 'passes')}`;
      return `Everyone passed — ${e.count} cards are discarded`;
    },
    pace: 2.2,
    seatNote: (s, i) => { const a = s.acts?.[i]; return !a ? '' : a.k === 'claim' ? `${a.count} × ${rankPlural(a.rank)}` : a.k === 'skip' ? 'Pass' : '🔔 Bluff!'; },
    roundLabel: (s, c) => `Deal ${Math.min(s.round + 1, c.rounds)}/${c.rounds}${s.expect ? ` · ${rankPlural(s.expect)}` : ''}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: p ? 'went out first' : `picked up ${r.pickups[i]}`, pts: p })) })),
    winners: BL.winners,
  },
  {
    id: 'seven', name: 'Seven', players: 8, seatsOf: c => c.players, icon: '7️⃣', tagline: '2-8 players · build the rows from the 7s', lowWins: true, pace: 1.3,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], def: 4 },
      { key: 'start', label: 'Opening card', choices: [['hearts', '7♥ starts'], ['diamonds', '7♦ starts']], def: 'hearts' },
      { key: 'scoring', label: 'Penalty points', choices: [['pips', 'Card values (A=1, J/Q/K=10)'], ['count', 'Number of cards left']], def: 'pips' },
      { key: 'rounds', label: 'Deals', choices: [[1, '1 deal'], [3, '3 deals'], [5, '5 deals']], def: 3 },
    ],
    hint: 'All cards are dealt. The holder of the opening 7 starts; a 7 starts a row for its suit and rows grow one card up or down. You MUST play if you can, otherwise pass. First to empty their hand wins the deal; everyone else gets penalty points, and the lowest total wins.',
    create: (c, s) => SV.create(c, s), view: SV.view, apply: SV.apply as any, nextRound: SV.nextRound, legalActions: SV.legalActions, chooseAction: svBot,
    seatNote: (s, i) => { const a = s.acts?.[i]; return !a ? '' : a.k === 'skip' ? 'Pass' : `${rankLabel(a.card.rank)}${SUIT_SYMBOLS[a.card.suit]}`; },
    roundLabel: (s, c) => `Deal ${Math.min(s.round + 1, c.rounds)}/${c.rounds}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: r.winner === i ? 'went out' : `${r.left[i]} left`, pts: p })) })),
    winners: SV.winners,
  },
  {
    id: 'ghulam', name: 'Ghulam Chor', players: 10, seatsOf: c => c.players, icon: '🤴', tagline: '2-10 players · do not get stuck with the Jack', lowWins: true, pace: 1.4,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], def: 4 },
      { key: 'decks', label: 'Card decks', choices: [[1, '1 deck'], [2, '2 decks'], [3, '3 decks']], def: 1 },
      { key: 'rounds', label: 'Deals', choices: [[1, '1 deal'], [3, '3 deals'], [5, '5 deals']], def: 3 },
    ],
    hint: 'One Jack is missing, so one Jack has no partner. Throw away every pair, then draw a face-down card from the next player and throw any new pair. Whoever is left holding the lone Jack is the Ghulam Chor and takes a point. Lowest total wins.',
    create: (c, s) => GC.create(c, s), view: GC.view, apply: GC.apply as any, nextRound: GC.nextRound, legalActions: GC.legalActions, chooseAction: gcBot,
    infoText: (s, names) => (s.phase === 'playing' ? `${names[s.turn]} ${yv(names[s.turn], 'draw', 'draws')} from ${names[s.victim]}` : s.loser !== null ? `${names[s.loser]} ${yv(names[s.loser], 'are', 'is')} stuck with the Jack!` : ''),
    seatNote: (s, i) => { const a = s.acts?.[i]; return !a ? '' : a.k === 'safe' ? '✅ safe' : a.k === 'lost' ? 'lost a card' : a.pair !== null ? `✨ pair of ${rankPlural(a.pair)}` : 'took a card'; },
    roundLabel: (s, c) => `Deal ${Math.min(s.round + 1, c.rounds)}/${c.rounds}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: p ? 'stuck with the Jack' : `${r.pairs[i]} pairs`, pts: p })) })),
    winners: GC.winners,
  },
  {
    id: 'donkey', name: 'Donkey', players: 10, seatsOf: c => c.players, icon: '🫏', tagline: '3-10 players · do not pick up the pile (Bhabhi)', lowWins: true, pace: 1.2,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], def: 4 },
      { key: 'decks', label: 'Card decks', choices: [[1, '1 deck'], [2, '2 decks'], [3, '3 decks']], def: 1 },
      { key: 'emptyLeader', label: 'Leader with no cards left', choices: [['next', 'Next player leads'], ['draw', 'Draws a card from the waste pile']], def: 'next' },
      { key: 'scoring', label: 'Penalty', choices: [['one', '1 point'], ['legs', 'One point per card held']], def: 'one' },
      { key: 'rounds', label: 'Deals', choices: [[1, '1 deal'], [3, '3 deals'], [5, '5 deals']], def: 3 },
    ],
    hint: 'All cards are dealt and the Ace of Spades opens. Follow the suit led. If you cannot, throw any card: that ends the trick and whoever played the highest card of the led suit picks up the whole pile. If everyone follows, the cards are thrown away. Empty your hand to be safe; the last player holding cards is the Donkey.',
    create: (c, s) => DK.create(c, s), view: DK.view, apply: DK.apply as any, nextRound: DK.nextRound, legalActions: DK.legalActions, chooseAction: dkBot,
    eventText: (s, names) => {
      const e = s.event as DK.Event; if (!e) return '';
      if (e.k === 'pickup') return `${names[e.seat]} ${yv(names[e.seat], 'pick', 'picks')} up ${e.count} cards!`;
      if (e.k === 'discard') return `Trick thrown away · ${names[e.leader]} ${yv(names[e.leader], 'lead', 'leads')} next`;
      return `${names[e.seat]} ${yv(names[e.seat], 'draw', 'draws')} a card from the waste pile to lead`;
    },
    infoText: (s, names) => (s.loser !== null && s.phase !== 'playing' ? `${names[s.loser]} ${yv(names[s.loser], 'are', 'is')} the Donkey!` : ''),
    seatNote: (s, i) => (s.handSizes[i] === 0 && s.phase === 'playing' ? '✅ safe' : ''),
    roundLabel: (s, c) => `Deal ${Math.min(s.round + 1, c.rounds)}/${c.rounds}${s.wasteCount ? ` · waste ${s.wasteCount}` : ''}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: r.loser === i ? `Donkey (${r.legs} cards)` : '', pts: p })) })),
    winners: DK.winners,
  },
  {
    id: 'president', name: 'President', players: 10, seatsOf: c => c.players, icon: '👑', tagline: '3-10 players · climb with sets, first out is President',
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], def: 4 },
      { key: 'decks', label: 'Card decks', choices: [[1, '1 deck'], [2, '2 decks'], [3, '3 decks']], def: 1 },
      { key: 'swap', label: 'Card swap each round', choices: [['two', 'Swap 2 (vice swaps 1)'], ['one', 'Swap 1'], ['none', 'No swap']], def: 'two' },
      { key: 'revolution', label: 'Revolution', choices: [[false, 'Off'], [true, 'Four of a kind reverses the ranks']], def: false },
      { key: 'rounds', label: 'Rounds', choices: [[1, '1 round'], [3, '3 rounds'], [5, '5 rounds']], def: 3 },
    ],
    hint: 'Ranks from low to high: 3 4 5 6 7 8 9 10 J Q K A 2. Lead any set of equal cards; everyone after must play the same number of higher cards or pass. When all others pass (or a 2 is played) the trick clears. First out is President, last is Scum; the Scum gives the President their best cards at the start of the next round. Points: President scores the most.',
    create: (c, s) => PR.create(c, s), view: PR.view, apply: PR.apply as any, nextRound: PR.nextRound, legalActions: PR.legalActions, chooseAction: prBot, validate: PR.validate as any, pace: 1.3,
    eventText: (s, names) => {
      const e = s.event as PR.Event; if (!e) return '';
      if (e.k === 'out') return `${names[e.seat]} ${yv(names[e.seat], 'are', 'is')} out — ${PR.placeName(e.place, s.config.players)}!`;
      if (e.k === 'rev') return `↺ Revolution! The ranks are ${e.on ? 'reversed' : 'back to normal'}`;
      return `Trick cleared · ${names[e.leader]} ${yv(names[e.leader], 'lead', 'leads')}`;
    },
    seatNote: (s, i) => { const a = s.acts?.[i]; return !a ? '' : a.k === 'skip' ? 'Pass' : a.k === 'out' ? `🏁 ${PR.placeName(a.place, s.config.players)}` : `${a.count} × ${rankPlural(a.rank)}`; },
    infoText: (s, names) => (s.history.length && s.phase !== 'gameEnd' ? `President ${names[s.history[s.history.length - 1].order[0]]} · Scum ${names[s.history[s.history.length - 1].order[s.config.players - 1]]}${s.rev ? ' · ↺ reversed' : ''}` : s.rev ? '↺ ranks reversed' : ''),
    roundLabel: (s, c) => `Round ${Math.min(s.round + 1, c.rounds)}/${c.rounds}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: PR.placeName(r.order.indexOf(i), r.order.length), pts: p })) })),
    winners: PR.winners,
  },
  {
    id: 'spoons', name: 'Spoons', players: 10, seatsOf: c => c.players, icon: '🥄', tagline: '3-10 players · collect four, grab a spoon, never be last', lowWins: true, noPassPlay: true,
    options: [
      { key: 'players', label: 'Players', choices: [[5, '5'], [3, '3'], [4, '4'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], def: 5 },
      { key: 'limit', label: 'Time to pass a card', choices: [['relaxed', 'Relaxed · 8 s'], ['normal', 'Normal · 5 s'], ['fast', 'Fast · 3 s']], def: 'normal' },
      { key: 'letters', label: 'Letters before you are out', choices: [[5, '5 letters · S-P-O-O-N'], [3, '3 letters · S-P-O']], def: 5 },
    ],
    hint: 'Everyone holds 4 cards and, at the same moment, passes one to the left (the first player draws from the deck, the last discards). Collect four of a kind and grab a spoon! Once anybody has grabbed, everybody can. There is one spoon fewer than players: whoever is left without one gets a letter. Out after S-P-O-O-N; last player standing wins. Needs one screen per player, so it is not available in Pass & Play - use Room Code to play with friends.',
    create: (c, s) => SP.create(c, s), view: SP.view, apply: SP.apply as any, nextRound: SP.nextRound, legalActions: SP.legalActions, chooseAction: spBot, plan: SP.plan as any, limitMs: c => SP.LIMIT_MS[c.limit as 'normal'],
    seatNote: (s, i) => (!s.active[i] ? 'out' : s.phase !== 'playing' ? (s.loser === i ? `+${SP.WORD[s.letters[i] - 1]}` : '') : s.stage === 'grab' && s.grabbed[i] ? 'got a spoon' : ''),
    infoText: (s) => (s.phase === 'playing' ? (s.stage === 'grab' ? `${s.spoons} spoon${s.spoons === 1 ? '' : 's'} left - grab one!` : `${s.spoons} spoons on the table`) : ''),
    roundLabel: (s) => `Round ${s.round + 1}`,
    badge: (v, i) => (v.active[i] ? (v.letters[i] ? SP.WORD.slice(0, v.letters[i]) : 'no letters') : `out (${SP.WORD.slice(0, v.letters[i])})`),
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: r.totals[i] ? SP.WORD.slice(0, r.totals[i]) : '', pts: p })) })),
    winners: SP.winners,
  },
  {
    id: 'yaniv', name: 'Yaniv', players: 8, seatsOf: c => c.players, icon: '🃏', tagline: '2-8 players · lowest hand wins, call Yaniv!', lowWins: true, pace: 1.2,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], def: 4 },
      { key: 'threshold', label: 'Call Yaniv with', choices: [[7, '7 or less'], [5, '5 or less']], def: 7 },
      { key: 'limit', label: 'Out when you pass', choices: [[200, '200 points'], [100, '100 points']], def: 200 },
      { key: 'bonus', label: 'Exact 50 / 100 / 150', choices: [[false, 'No bonus'], [true, 'Drops by 50']], def: false },
    ],
    hint: 'Get the lowest hand (A=1, 2-10 face value, J/Q/K=10, Joker=0). Each turn discard a card, a set of equal ranks or a run of 3+ in one suit, then draw from the deck or take an end card of the last discard. With 7 or less, call Yaniv! If anyone has an equal or lower hand it is an Assaf: you score 30 and they score 0. Everyone else adds their hand. Pass the limit and you are out. With 6+ players two decks are used.',
    create: (c, s) => YN.create(c, s), view: YN.view, apply: YN.apply as any, nextRound: YN.nextRound, legalActions: YN.legalActions, chooseAction: ynBot, validate: YN.validate as any,
    summary: (s, names) => { const r = s.history[s.history.length - 1]; if (!r) return []; const ct = (cs: any[]) => cs.map(c => `${_rl(c.rank)}${_ss[c.suit]}`).join(' ');
      if (s.stalemate) return [`Stalemate: nobody could call, so the lowest hand (${names[r.caller]}, ${r.hands[r.caller]}) wins the round`, ...s.hands.map((hh: any[], i: number) => (s.active[i] ? `${names[i]}: ${ct(hh)} = ${r.hands[i]} → +${r.points[i]}` : '')).filter(Boolean)];
      return [`${names[r.caller]} ${yv(names[r.caller], 'call', 'calls')} Yaniv with ${r.hands[r.caller]}${r.assaf ? ' — ASSAF! Someone had equal or less, so ' + names[r.caller] + ' takes 30' : ' — a clean win!'}`,
        ...s.hands.map((h: any[], i: number) => (s.active[i] || r.hands[i] > 0 || h.length ? `${names[i]}: ${ct(h)} = ${r.hands[i]} → +${r.points[i]}` : '')).filter(Boolean)]; },
    infoText: (s, names) => (s.phase === 'playing' ? (s.step === 'draw' ? 'Now draw: tap the deck or a highlighted discard' : `${names[s.turn]} ${yv(names[s.turn], 'discard', 'discards')}`) : ''),
    seatNote: (s, i) => (!s.active[i] ? 'out' : ''),
    roundLabel: (s, c) => `Round ${s.round + 1} · out at ${c.limit}`,
    badge: (v, i) => `${v.hands[i].length ? 'hand ' + v.hands[i].reduce((a: number, c: any) => a + YN.value(c), 0) : v.handSizes[i] + ' cards'} · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `hand ${r.hands[i]}`, pts: p })) })),
    winners: YN.winners,
  },
  {
    id: 'cabo', name: 'Cambrio', players: 8, seatsOf: c => c.players, icon: '🎴', tagline: '2-8 players · memory game, call Cambrio when you are lowest', lowWins: true, pace: 1.2,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], def: 4 },
      { key: 'limit', label: 'Game ends when someone reaches', choices: [[50, '50 points'], [25, '25 points'], [100, '100 points']], def: 50 },
      { key: 'powers', label: 'Card powers (7-8 peek, 9-10 spy, J-Q swap)', choices: [[true, 'On'], [false, 'Off']], def: true },
    ],
    hint: 'You have 4 face-down cards and have only seen two. Each turn draw a card, then swap it into your grid or discard it. Discarding a 7/8 lets you peek at one of your cards, 9/10 at someone else\'s, J/Q swaps one of your cards with someone else\'s without looking. Lowest total wins: Ace 1, number cards face value, J 11, Q 12, black King 13, red King 0. Call Cambrio when you think you are lowest - everyone else gets one more turn; if you are wrong you take +10.',
    create: (c, s) => CA.create(c, s), view: CA.view, apply: CA.apply as any, nextRound: CA.nextRound, legalActions: CA.legalActions, chooseAction: caBot, validate: CA.validate as any,
    summary: (s, names) => { const r = s.history[s.history.length - 1]; if (!r || !s.grid.length) return []; const ct = (cs: any[]) => cs.map(c => `${_rl(c.rank)}${_ss[c.suit]}`).join(' ');
      return [`${names[r.caller]} ${yv(names[r.caller], 'called', 'called')} Cambrio — ${r.callerWon ? 'and had the lowest hand!' : 'but was not the lowest: +' + (s.config.penalty ?? 10) + ' penalty'}`, ...s.grid.map((g: any[], i: number) => `${names[i]}: ${ct(g)} = ${r.hands[i]} → +${r.points[i]}`)]; },
    infoText: (s, names) => (s.phase !== 'playing' ? '' : s.caller !== null ? `Cambrio called by ${names[s.caller]} - last turns!` : `${names[s.turn]} ${yv(names[s.turn], 'play', 'plays')} · deck ${s.deckCount}`),
    seatNote: (s, i) => (s.caller === i ? 'Cambrio!' : ''),
    roundLabel: (s, c) => `Round ${s.round + 1} · to ${c.limit}`,
    badge: (v, i) => `${v.totals[i]} pts`,
    rows: h => h.map(r => ({ label: `R${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: `hand ${r.hands[i]}${r.caller === i ? ' · Cambrio' : ''}`, pts: p })) })),
    winners: CA.winners,
  },
  {
    id: 'rummy', name: '13-card Rummy', players: 8, seatsOf: c => c.players, icon: '🂱', tagline: '2-8 players · 13-card Rummy · two sequences to win', lowWins: true, pace: 1.2,
    options: [
      { key: 'players', label: 'Players', choices: [[4, '4'], [2, '2'], [3, '3'], [5, '5'], [6, '6'], [7, '7'], [8, '8']], def: 4 },
      { key: 'rounds', label: 'Deals', choices: [[3, '3 deals'], [1, '1 deal'], [5, '5 deals']], def: 3 },
      { key: 'drop', label: 'Drop (give up for 20 / 40 points)', choices: [[true, 'Allowed'], [false, 'Off']], def: true },
    ],
    hint: 'You hold 13 cards. Make at least TWO sequences (3+ cards of one suit in a row), one of them PURE (no joker), and group the rest into sets (same rank, different suits) or more sequences. Printed jokers and the cards of the wild rank shown face-up are jokers. Each turn draw from the stock or the open pile, then throw one card. When your hand is complete, throw your last card as a SHOW. A wrong show costs 80. Other players score the points of their ungrouped cards (A, K, Q, J = 10), at most 80. Lowest total after all deals wins.',
    create: (c, s) => RM.create(c, s), view: RM.view, apply: RM.apply as any, nextRound: RM.nextRound, legalActions: RM.legalActions, chooseAction: rmBot, validate: RM.validate as any,
    suggest: (s, seat) => RM.suggestGroups(s.hands[seat], s.wild),
    summary: (s, names) => { const r = s.history[s.history.length - 1]; if (!r) return []; const ct = (cs: any[]) => cs.map(c => `${_rl(c.rank)}${_ss[c.suit]}`).join(' ');
      return [`${names[r.winner]} ${yv(names[r.winner], 'win', 'wins')} the deal!`, ...s.hands.map((h: any[], i: number) => `${names[i]}: ${h.length ? ct(h) + ' = ' : ''}${r.notes[i]} → +${r.points[i]}`)]; },
    infoText: (s, names) => (s.phase === 'playing' ? `Wild joker: ${_rl(s.wild)}s · ${names[s.turn]} ${yv(names[s.turn], s.step === 'draw' ? 'draw' : 'throw', s.step === 'draw' ? 'draws' : 'throws')}` : ''),
    seatNote: (s, i) => (s.notes?.[i] && s.notes[i].includes('(') ? s.notes[i] : ''),
    roundLabel: (s, c) => `Deal ${Math.min(s.round + 1, c.rounds)}/${c.rounds}`,
    badge: (v, i) => `${v.handSizes[i]} cards · ${v.totals[i]}`,
    rows: h => h.map(r => ({ label: `D${r.round}`, cells: r.points.map((p: number, i: number) => ({ sub: r.notes[i], pts: p })) })),
    winners: RM.winners,
  },
];
export const byId = (id: string) => GAMES.find(g => g.id === id)!;
