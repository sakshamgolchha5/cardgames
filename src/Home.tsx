import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { GAMES } from './games/registry';
import { BOT_NAMES } from './games/names';
import { GameMark } from './GameMark';
import './home.css';

type Page = 'games' | 'history' | 'friends' | 'collection' | 'profile' | 'settings' | 'help' | 'privacy' | 'terms';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type HubPreferences = {
  playerId: string; coins: number; rewardDay: string; avatar: string; theme: string; back: string;
  ownedThemes: string[]; ownedBacks: string[]; favorites: string[]; friends: string[]; reducedMotion: boolean; cardSize: 'small' | 'standard' | 'large';
};
type ThemeItem = { id: string; name: string; detail: string; price: number; swatches: string[] };
type BackItem = { id: string; name: string; detail: string; price: number; colors: string[] };
export type IncomingInvite = { code: string; game: string; host: string };
/** Saved friends and the players from your last 10 matches: the people the invite popup offers. */
export function inviteTargets(name: string): { friends: string[]; recent: string[] } {
  const friends = get<{ friends?: string[] }>('cca.profile', {}).friends ?? [];
  const history = get<{ names?: string[]; you?: number; humanPlayers?: string[] }[]>('cca.history', []);
  const recent = [...new Map(history.slice(0, 10).flatMap(match => {
    const players = match.humanPlayers ?? (match.names ?? []).filter((player, seat) => seat !== match.you && player !== name && player !== 'Guest' && !BOT_NAMES.includes(player) && !/^Player \d+$/i.test(player));
    return players.map(player => [player.toLocaleLowerCase(), player] as const);
  })).values()].filter(player => !friends.some(friend => friend.toLocaleLowerCase() === player.toLocaleLowerCase())).slice(0, 8);
  return { friends, recent };
}

const get = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? '') as T; } catch { return fallback; } };
const put = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local storage may be unavailable */ } };
const newPlayerId = () => `CCA-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8).toUpperCase() : Math.random().toString(36).slice(2, 10).toUpperCase()}`;
const fresh = (): HubPreferences => {
  const saved = get<Partial<HubPreferences>>('cca.profile', {});
  const oldTheme = saved.theme === 'felt' ? 'felt' : undefined;
  return { playerId: saved.playerId ?? get('cca.playerId', newPlayerId()), coins: get('cca.coins', saved.coins ?? 120), rewardDay: saved.rewardDay ?? '', avatar: saved.avatar ?? '♠', theme: saved.theme ?? 'clubhouse', back: saved.back ?? 'crimson', ownedThemes: saved.ownedThemes ?? (oldTheme ? ['clubhouse', 'felt'] : ['clubhouse']), ownedBacks: saved.ownedBacks ?? ['crimson'], favorites: saved.favorites ?? [], friends: saved.friends ?? [], reducedMotion: saved.reducedMotion ?? false, cardSize: saved.cardSize ?? 'standard' };
};

const THEMES: ThemeItem[] = [
  { id: 'clubhouse', name: 'Golden Clubhouse', detail: 'Warm ivory and brass', price: 0, swatches: ['#f5e9cb', '#c7953e', '#51391d'] },
  { id: 'felt', name: 'Midnight Felt', detail: 'A classic dark table', price: 120, swatches: ['#181a18', '#9a722b', '#f2c45a'] },
  { id: 'jade', name: 'Jade Room', detail: 'Cool green felt', price: 90, swatches: ['#10241f', '#246b54', '#a9e3b7'] },
  { id: 'royal', name: 'Royal Table', detail: 'Navy and brass', price: 110, swatches: ['#121a31', '#293a69', '#e7c477'] },
  { id: 'ocean', name: 'Blue Hour', detail: 'Deep blue evening', price: 120, swatches: ['#10222c', '#17617a', '#78c6d6'] },
  { id: 'plum', name: 'Velvet Plum', detail: 'A soft violet lounge', price: 130, swatches: ['#241927', '#68486c', '#e2b2d6'] },
  { id: 'copper', name: 'Copper Club', detail: 'Warm wood tones', price: 140, swatches: ['#2b1c17', '#8b4f32', '#e8a877'] },
  { id: 'rose', name: 'Rose Room', detail: 'Muted rose and cream', price: 150, swatches: ['#2e2023', '#89535a', '#f1c1bb'] },
  { id: 'arctic', name: 'Frosted Glass', detail: 'Pale ice blue', price: 160, swatches: ['#15232b', '#4b8292', '#c2e6ed'] },
  { id: 'mono', name: 'Monochrome', detail: 'Quiet black and ivory', price: 170, swatches: ['#171717', '#5a5a5a', '#efefdf'] },
  { id: 'ember', name: 'Emberlight', detail: 'A low warm glow', price: 180, swatches: ['#251917', '#754131', '#f3a36e'] },
  { id: 'lagoon', name: 'Lagoon', detail: 'Teal after dark', price: 190, swatches: ['#142526', '#24756c', '#92d8ca'] },
  { id: 'midnight', name: 'Midnight', detail: 'A dark, low-glare table', price: 200, swatches: ['#121521', '#34384f', '#b8b9ef'] },
];
const BACKS: BackItem[] = [
  { id: 'crimson', name: 'Crimson Lattice', detail: 'Classic red crosshatch', price: 0, colors: ['#9c2030', '#f0bf64'] },
  { id: 'blue', name: 'Blue Weave', detail: 'Cool blue linework', price: 35, colors: ['#174f83', '#c9e2f4'] },
  { id: 'jade', name: 'Jade Diamond', detail: 'Green diamond pattern', price: 45, colors: ['#12614b', '#a4e5c8'] },
  { id: 'gold', name: 'Gilded Edge', detail: 'Deep burgundy and gold', price: 55, colors: ['#561d35', '#e9c66e'] },
  { id: 'violet', name: 'Violet Bloom', detail: 'Violet geometry', price: 60, colors: ['#573675', '#d0b5ef'] },
  { id: 'teal', name: 'Tidal Grid', detail: 'Aqua on midnight', price: 65, colors: ['#0d5963', '#8ce0dc'] },
  { id: 'ivory', name: 'Ivory Scroll', detail: 'Warm cream on forest', price: 70, colors: ['#e8dec5', '#345142'] },
  { id: 'copper', name: 'Copper Pinstripe', detail: 'Fine copper lines', price: 75, colors: ['#71402e', '#edb283'] },
  { id: 'rose', name: 'Rose Mosaic', detail: 'Soft rose tiles', price: 80, colors: ['#883d57', '#f1bec6'] },
  { id: 'sky', name: 'Skyline', detail: 'Angular blue shapes', price: 85, colors: ['#264f7d', '#a7dcf2'] },
  { id: 'onyx', name: 'Onyx Star', detail: 'A subtle night pattern', price: 95, colors: ['#262732', '#b8afd5'] },
  { id: 'orange', name: 'Citrus Club', detail: 'Amber and dark green', price: 105, colors: ['#b76424', '#f4d584'] },
];
const NAV_GROUPS: { label: string; links: { id: Page | 'history'; label: string; icon: string }[] }[] = [
  { label: 'PLAY', links: [{ id: 'games', label: 'Games', icon: '♠' }, { id: 'help', label: 'Rules', icon: '?' }] },
  { label: 'YOUR CLUB', links: [{ id: 'friends', label: 'Friends', icon: '♧' }, { id: 'collection', label: 'Collection', icon: '✦' }, { id: 'history', label: 'History', icon: '↺' }] },
  { label: 'PLAYER', links: [{ id: 'profile', label: 'Profile', icon: '◉' }, { id: 'settings', label: 'Settings', icon: '⚙' }] },
];
const NAV = NAV_GROUPS.flatMap(group => group.links);
const AVATARS = ['♠', '♥', '♦', '♣', '✦', '☾', '★', '♛'];
const DAY = () => { const d = new Date(), pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function Home({ name, setName, openGame, openJoin, openHistory, incomingInvite, acceptInvite, declineInvite, renderHistory }: {
  name: string; setName: (name: string) => void; openGame: (id: string, room?: boolean) => void;
  openJoin: () => void; openHistory?: () => void; renderHistory?: () => ReactNode; incomingInvite?: IncomingInvite | null; acceptInvite?: () => void; declineInvite?: () => void;
}) {
  const [page, setPage] = useState<Page>('games');
  const [prefs, setPrefs] = useState<HubPreferences>(fresh);
  const [category, setCategory] = useState('All games');
  const [friendInput, setFriendInput] = useState('');
  const [inviteGame, setInviteGame] = useState('callbreak');
  const [notice, setNotice] = useState('');
  const [shopKind, setShopKind] = useState<'themes' | 'backs'>('themes');
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const history = get<{ game: string; date: string; placement?: number; totals?: number[]; names?: string[]; you?: number; humanPlayers?: string[] }[]>('cca.history', []);
  const recentPlayers = [...new Map(history.slice(0, 10).flatMap(match => {
    const players = match.humanPlayers ?? (match.names ?? []).filter((player, seat) => seat !== match.you && player !== name && player !== 'Guest' && !BOT_NAMES.includes(player) && !/^Player \d+$/i.test(player));
    return players.map(player => [player.toLocaleLowerCase(), player] as const);
  })).values()].filter(player => !prefs.friends.some(friend => friend.toLocaleLowerCase() === player.toLocaleLowerCase())).slice(0, 8);
  useLayoutEffect(() => {
    put('cca.profile', prefs); put('cca.playerId', prefs.playerId); put('cca.coins', prefs.coins);
    const root = document.querySelector('.app');
    root?.setAttribute('data-theme', prefs.theme);
    root?.setAttribute('data-back', prefs.back);
    root?.setAttribute('data-reduced-motion', String(prefs.reducedMotion));
    root?.setAttribute('data-card-size', prefs.cardSize);
    const colors: Record<string, string> = { clubhouse: '#d6a64e', felt: '#9f8751', jade: '#5d9b7b', royal: '#6579bd', ocean: '#4a9db5', plum: '#9b71a2', copper: '#bd7046', rose: '#ba7b83', arctic: '#75adbd', mono: '#8a897e', ember: '#bb6847', lagoon: '#4a9f91', midnight: '#666b9c' };
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = colors[prefs.theme] ?? colors.clubhouse;
  }, [prefs]);
  useEffect(() => {
    setInstalled(window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const installedHandler = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installedHandler);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', installedHandler); };
  }, []);
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(''), 2600); return () => window.clearTimeout(timer); } }, [notice]);
  const update = (patch: Partial<HubPreferences>) => setPrefs(current => ({ ...current, ...patch }));
  const liked = (id: string) => prefs.favorites.includes(id);
  const categories = ['All games', 'Favorites', 'Trick-taking', 'Shedding', 'Party & memory'];
  const filtered = GAMES.filter(game => {
    const group = ['callbreak', 'hearts', 'courtpiece', 'dehla', '325', 'confidence'].includes(game.id) ? 'Trick-taking'
      : ['bluff', 'seven', 'president', 'yaniv', 'rummy'].includes(game.id) ? 'Shedding'
        : 'Party & memory';
    return category === 'All games' || (category === 'Favorites' ? liked(game.id) : category === group);
  });

  const buy = (kind: 'themes' | 'backs', item: ThemeItem | BackItem) => {
    const key = kind === 'themes' ? 'ownedThemes' : 'ownedBacks';
    const current = kind === 'themes' ? prefs.ownedThemes : prefs.ownedBacks;
    const equipKey = kind === 'themes' ? 'theme' : 'back';
    if (current.includes(item.id)) { update({ [equipKey]: item.id } as Partial<HubPreferences>); setNotice(`${item.name} equipped`); return; }
    if (prefs.coins < item.price) { setNotice('Play a completed game or claim your daily bonus to earn more coins.'); return; }
    const confirmed = window.confirm(`Unlock ${item.name} for ${item.price} play coins?`);
    if (!confirmed) return;
    update({ coins: prefs.coins - item.price, [key]: [...current, item.id], [equipKey]: item.id } as Partial<HubPreferences>);
    setNotice(`${item.name} unlocked and equipped`);
  };
  const claimDaily = () => {
    if (prefs.rewardDay === DAY()) { setNotice('Your daily bonus is already claimed.'); return; }
    update({ coins: prefs.coins + 25, rewardDay: DAY() }); setNotice('+25 coins added to this device');
  };
  const addFriend = (event: React.FormEvent) => {
    event.preventDefault(); const value = friendInput.trim().replace(/^@/, '');
    if (!value) return;
    if (prefs.friends.some(friend => friend.toLowerCase() === value.toLowerCase())) { setNotice('That player is already saved.'); return; }
    update({ friends: [...prefs.friends, value] }); setFriendInput(''); setNotice(`${value} added to your players`);
  };
  const resetPlayerData = () => {
    if (!window.confirm('Clear this player profile, saved players, settings, coins and match history from this browser?')) return;
    ['cca.profile', 'cca.playerId', 'cca.coins', 'cca.history', 'cca.name', 'cca.quickPlay'].forEach(key => localStorage.removeItem(key));
    setName('Guest'); setPrefs(fresh()); setNotice('Player data cleared');
  };
  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  const favorite = (id: string) => update({ favorites: liked(id) ? prefs.favorites.filter(x => x !== id) : [...prefs.favorites, id] });
  const navTo = (id: Page | 'history') => { document.querySelector('.friends-menu')?.removeAttribute('open'); setPage(id); setCategory('All games'); };
  const showGames = page === 'games';
  const pageTitle = ({ games: 'Choose a game', history: 'Match history', friends: 'Your people', collection: 'Make the table yours', profile: 'Your player card', settings: 'Tune your club', help: 'Rules & how to play', privacy: 'Privacy', terms: 'Terms of play' } as Record<Page, string>)[page];

  return <div className={`home-shell${prefs.reducedMotion ? ' reduce-motion' : ''}`}>
    <main className="hub-content">
      <header className="hub-header">
        {page !== 'games' ? <button className="back-games" onClick={() => navTo('games')}>‹ Games</button> : <button className="brand-home" onClick={() => navTo('games')} aria-label="Card Club Arcade games"><img src="/brand-mark.svg" alt="" /><span>Card Club Arcade</span></button>}
        <div className="hub-header-actions"><button className="player-chip" onClick={() => navTo('profile')} aria-label={`Open ${name || 'Guest'} profile`}><span className="header-avatar">{prefs.avatar}</span><b>{name || 'Guest'}</b></button><button className="coin-pill" onClick={() => navTo('collection')} aria-label={`${prefs.coins} play coins; open collection`}><span>◈</span>{prefs.coins}</button></div>
        <nav className="top-nav" aria-label="Club navigation">{NAV_GROUPS.flatMap(group => group.links).filter(item => item.id !== 'friends' && item.id !== 'profile').map(item => <button key={item.id} className={`top-nav-link ${item.id === page ? 'selected' : ''}`} onClick={() => navTo(item.id)} aria-current={item.id === page ? 'page' : undefined}><span aria-hidden="true">{item.icon}</span><b>{item.id === 'help' ? 'Rules' : item.label}</b></button>)}<details className="friends-menu"><summary><span aria-hidden="true">♧</span><b>Friends</b>{prefs.friends.length > 0 && <i>{prefs.friends.length}</i>}<small>⌄</small></summary><div className="friends-popover"><h2>Friends</h2><label>Invite to<select aria-label="Invite game" value={inviteGame} onChange={event => setInviteGame(event.target.value)}>{GAMES.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label><h3>Saved friends</h3>{prefs.friends.length ? prefs.friends.map(friend => <div className="friends-popover-row" key={friend}><span className="friend-mini-avatar">{friend.slice(0, 1).toUpperCase()}</span><b>{friend}</b><button onClick={() => openGame(inviteGame, true)} aria-label={`Create a ${GAMES.find(game => game.id === inviteGame)?.name} room invite for ${friend}`}>Invite</button></div>) : <p>No saved friends yet.</p>}<h3>Played recently <small>Last 10 matches</small></h3>{recentPlayers.length ? recentPlayers.map(player => <div className="friends-popover-row recent-player-row" key={player}><span className="friend-mini-avatar">{player.slice(0, 1).toUpperCase()}</span><b>{player}</b><button onClick={() => openGame(inviteGame, true)} aria-label={`Create a ${GAMES.find(game => game.id === inviteGame)?.name} room invite for recent player ${player}`}>Invite</button></div>) : <p>Players from your recent online matches will appear here.</p>}<button className="manage-friends" onClick={() => navTo('friends')}>Manage friends →</button></div></details></nav>
      </header>
      <section className="hub-page">
        <div className="page-heading"><div><p className="eyebrow">{page === 'games' ? 'THE CARD TABLE IS YOURS' : 'CARD CLUB ARCADE'}</p><h1>{pageTitle}</h1><p className="page-subtitle">{page === 'games' ? 'Pick a game, choose how to play, and deal in.' : page === 'friends' ? 'Keep your invite list close and bring people to a room.' : page === 'collection' ? 'Unlock a look you love with play coins.' : page === 'profile' ? 'Your name, your cards, your table.' : page === 'settings' ? 'Make your table feel right.' : page === 'help' ? 'Pick a game to see its rules and options.' : page === 'history' ? 'Every finished game is saved on this device.' : page === 'privacy' ? 'What Card Club Arcade stores and uses.' : 'A few simple ways to keep play friendly.'}</p></div>{page === 'games' && <button className="gold-action" onClick={openJoin}>Join with code <span>→</span></button>}</div>
        {showGames && <>
          <div className="games-tools"><div className="section-title"><div><h2>Game library</h2><p>{GAMES.length} games · ready when you are</p></div></div><div className="catalog-controls"><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
            {prefs.favorites.length > 0 && <div className="favorite-strip"><b>YOUR FAVORITES</b>{prefs.favorites.map(id => { const game = GAMES.find(g => g.id === id); return game ? <button key={id} onClick={() => openGame(id)}>{game.name} <span>→</span></button> : null; })}</div>}
            <div className="game-library">{filtered.map(game => <article key={game.id} className="game-card"><button className="game-launch" onClick={() => openGame(game.id)} aria-label={`Open ${game.name} setup`}><GameMark gameId={game.id} /><span className="game-card-copy"><b>{game.name}</b><small>{game.tagline}</small><i>{game.noPassPlay ? 'Bots · Room Code' : 'Bots · Pass & Play · Room Code'}</i></span><span className="game-arrow">›</span></button><button className={`favorite-button${liked(game.id) ? ' is-favorite' : ''}`} onClick={() => favorite(game.id)} aria-label={`${liked(game.id) ? 'Remove' : 'Add'} ${game.name} ${liked(game.id) ? 'from' : 'to'} favorites`}>{liked(game.id) ? '★' : '☆'}</button></article>)}</div>
            {filtered.length === 0 && <div className="empty-card"><b>No favourites yet</b><span>Tap the star on a game to save it here.</span></div>}
          </div>
        </>}

        {page === 'history' && (renderHistory ? renderHistory() : null)}
        {page === 'friends' && <div className="hub-panel friends-panel"><div className="panel-intro"><div className="panel-symbol">♧</div><div><h2>Players to invite</h2><p>Save names here, then invite them to a room when you are ready to play.</p></div></div><form className="add-friend-form" onSubmit={addFriend}><label htmlFor="friend-name">Add a player</label><div><span>@</span><input id="friend-name" maxLength={24} value={friendInput} onChange={e => setFriendInput(e.target.value)} placeholder="Player name" /><button className="gold-action" type="submit" disabled={!friendInput.trim()}>Add player</button></div></form>{prefs.friends.length ? <div className="friend-list">{prefs.friends.map(friend => <div className="friend-row" key={friend}><div className="friend-avatar">{friend.slice(0, 1).toUpperCase()}</div><div className="friend-name"><b>{friend}</b><small>Saved players</small></div><button className="outline-action" onClick={() => openGame(inviteGame, true)}>Create room invite</button><button className="remove-friend" aria-label={`Remove ${friend}`} onClick={() => update({ friends: prefs.friends.filter(x => x !== friend) })}>×</button></div>)}</div> : <div className="empty-card friends-empty"><span>♧</span><b>Your invite list starts here</b><small>Add players you want to remember for your next room.</small></div>}<div className="invite-card"><b>Meet at the table</b><p>Pick a game from the Friends menu, create a room and share its invite link.</p><button className="outline-action" onClick={() => openGame(inviteGame, true)}>Create {GAMES.find(game => game.id === inviteGame)?.name} room</button></div></div>}

        {page === 'collection' && <><div className="wallet-banner"><div><span className="wallet-icon">◈</span><b>{prefs.coins} <small>PLAY COINS</small></b><p>Earn coins from daily check-ins and completed games. Use them to unlock table themes and card backs.</p></div><button className="gold-action" onClick={claimDaily} disabled={prefs.rewardDay === DAY()}>{prefs.rewardDay === DAY() ? 'Daily bonus claimed' : 'Daily check-in +25'}</button></div><div className="shop-tabs"><button className={shopKind === 'themes' ? 'active' : ''} onClick={() => setShopKind('themes')}>Table themes <small>{THEMES.length}</small></button><button className={shopKind === 'backs' ? 'active' : ''} onClick={() => setShopKind('backs')}>Card backs <small>{BACKS.length}</small></button></div><div className="cosmetic-grid">{(shopKind === 'themes' ? THEMES : BACKS).map(item => { const owned = (shopKind === 'themes' ? prefs.ownedThemes : prefs.ownedBacks).includes(item.id); const equipped = (shopKind === 'themes' ? prefs.theme : prefs.back) === item.id; return <article className={`cosmetic-card${equipped ? ' equipped' : ''}`} key={item.id}><button className={`cosmetic-preview${shopKind === 'backs' ? ' back-preview' : ''}`} onClick={() => buy(shopKind, item)} style={{ '--swatch-a': shopKind === 'themes' ? (item as ThemeItem).swatches[0] : (item as BackItem).colors[0], '--swatch-b': shopKind === 'themes' ? (item as ThemeItem).swatches[1] : (item as BackItem).colors[1], '--swatch-c': shopKind === 'themes' ? (item as ThemeItem).swatches[2] ?? (item as BackItem).colors[1] : (item as BackItem).colors[1] } as React.CSSProperties} aria-label={`Preview ${item.name}`}><span>{shopKind === 'themes' ? <><i /><i /><i /></> : <b>♠</b>}</span></button><div className="cosmetic-details"><b>{item.name}</b><small>{item.detail}</small><button onClick={() => buy(shopKind, item)} className={equipped ? 'equipped-label' : owned ? 'owned-label' : 'price-label'}>{equipped ? 'Equipped' : owned ? 'Equip' : <>{item.price === 0 ? 'Free' : `◈ ${item.price}`}</>}</button></div></article>; })}</div></>}

        {page === 'profile' && <div className="hub-panel profile-panel"><div className="profile-identity"><div className="profile-avatar">{prefs.avatar}</div><div><p className="eyebrow">PLAYER CARD</p><h2>{name || 'Guest'}</h2><span>Player ID · {prefs.playerId}</span></div></div><div className="profile-form"><label>Display name<input aria-label="Display name" maxLength={14} value={name} onChange={e => setName(e.target.value)} placeholder="Choose a name" /></label><div className="avatar-picker"><b>Your avatar</b><div>{AVATARS.map(avatar => <button key={avatar} className={prefs.avatar === avatar ? 'active' : ''} onClick={() => update({ avatar })} aria-label={`Choose avatar ${avatar}`}>{avatar}</button>)}</div></div></div><div className="profile-stats"><div><b>{history.length}</b><small>MATCHES</small></div><div><b>{history.filter(item => item.placement === 1).length}</b><small>WINS</small></div><div><b>{prefs.coins}</b><small>PLAY COINS</small></div></div><div className="profile-recent"><h2>Recent tables</h2>{history.slice(0, 3).length ? history.slice(0, 3).map((item, index) => <div className="recent-match" key={`${item.date}-${index}`}><b>{item.game}</b><span>{item.placement ? `${item.placement}${item.placement === 1 ? 'st' : item.placement === 2 ? 'nd' : item.placement === 3 ? 'rd' : 'th'} place` : 'Match complete'}</span></div>) : <p>Your completed matches will show here.</p>}</div></div>}

        {page === 'settings' && <div className="hub-panel settings-panel"><section className="settings-group"><p className="eyebrow">TABLE</p><button className="setting-row" onClick={() => navTo('collection')}><span><b>Theme &amp; card back</b><small>{THEMES.find(t => t.id === prefs.theme)?.name} · {BACKS.find(b => b.id === prefs.back)?.name}</small></span><i>Collection →</i></button><label className="setting-row"><span><b>Card size</b><small>Change the size of cards during a match.</small></span><select aria-label="Card size" value={prefs.cardSize} onChange={e => update({ cardSize: e.target.value as HubPreferences['cardSize'] })}><option value="small">Compact</option><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="setting-row"><span><b>Reduce motion</b><small>Use fewer moving effects.</small></span><input aria-label="Reduce motion" type="checkbox" checked={prefs.reducedMotion} onChange={e => update({ reducedMotion: e.target.checked })} /></label></section><section className="settings-group"><p className="eyebrow">INSTALL</p><div className="install-row"><div><b>{installed ? 'Card Club Arcade is installed' : 'Play from your home screen'}</b><small>{installed ? 'Open it from your apps whenever you want to play.' : 'Keep the game close for your next table.'}</small></div>{installPrompt ? <button className="gold-action" onClick={() => void installApp()}>Install app</button> : <details className="install-instructions"><summary>{installed ? 'Installation details' : 'Install instructions'}</summary><p>In your browser menu, choose “Install app” when offered. On iPhone or iPad, use the Share menu and choose “Add to Home Screen”. An installed app opens in its own window; an added shortcut opens the browser.</p></details>}</div></section><section className="settings-group"><p className="eyebrow">YOUR DATA</p><p className="settings-blurb">Manage your player card, saved players and match records.</p><button className="outline-action" onClick={resetPlayerData}>Clear player data</button></section><section className="settings-group"><p className="eyebrow">ABOUT</p><button className="setting-row" onClick={() => navTo('privacy')}><span><b>Privacy</b><small>How your information is used.</small></span><i>Read →</i></button><button className="setting-row" onClick={() => navTo('terms')}><span><b>Terms of play</b><small>Coins, rooms and playing together.</small></span><i>Read →</i></button><button className="setting-row" onClick={() => navTo('help')}><span><b>Game rules &amp; help</b><small>Learn how each table works.</small></span><i>Open →</i></button></section></div>}
        {page === 'help' && <div className="help-layout"><div className="help-intro"><div className="panel-symbol">?</div><div><h2>Choose a game to learn</h2><p>Open its setup and tap “How to play” for a quick guide to the rules and options.</p></div></div><div className="help-game-list">{GAMES.map(game => <button key={game.id} className="help-game" onClick={() => openGame(game.id)}><GameMark gameId={game.id} /><b>{game.name}</b><small>{game.tagline}</small><i>Learn →</i></button>)}</div></div>}
        {page === 'privacy' && <article className="legal-card"><h2>Privacy</h2><p>Card Club Arcade stores your display name, player ID, avatar, saved players, favourite games, table settings, coin balance and match history in this browser on this device. This information is not synced to an account.</p><p>Room-code games connect through the PeerJS signaling service and WebRTC. Players in the room receive the game information needed to play. Your browser may cache app files so the game can open offline; match and profile data are not added to the app-file cache.</p><p>This app does not include advertising, analytics, account sign-in or payment processing. Clearing your browser storage removes saved local game information. You can also use “Clear player data” in Settings.</p></article>}
        {page === 'terms' && <article className="legal-card"><h2>Play fair, have fun</h2><p>Card Club Arcade is for casual card-game play. Follow the rules shown for each game and be considerate when inviting other players.</p><p>Play coins are virtual points used to unlock table themes and card backs. They have no cash value, cannot be transferred or exchanged for prizes, and are not used to wager on match outcomes.</p><p>Room-code play depends on an internet connection and may be unavailable if the connection or signaling service is interrupted. Game records and player preferences stored in this browser may be lost if its site data is cleared.</p></article>}
      </section>
    </main>
    {incomingInvite && <div className="incoming-invite-scrim"><section className="incoming-invite" role="dialog" aria-modal="true" aria-label={`${incomingInvite.host} invited you to ${incomingInvite.game}`}><small>ROOM INVITATION</small><p><b>{incomingInvite.host}</b> invited you to play</p><h2>{incomingInvite.game}</h2><div><button className="invite-reject" aria-label="Decline invitation" onClick={declineInvite}>×</button><button className="invite-accept" aria-label="Accept invitation" onClick={acceptInvite}>✓</button></div></section></div>}
    {notice && <div className="hub-toast" role="status">{notice}</div>}
  </div>;
}
