import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('installable web app files', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  it('has the app identity, icons and standalone window and is landscape from the first screen', () => {
    expect(m.name).toBe('Card Club Arcade'); expect(m.short_name).toBe('Card Club Arcade'); expect(m.start_url).toBe('/'); expect(m.scope).toBe('/'); expect(m.display).toBe('standalone');
    expect(m.orientation).toBe('landscape'); expect(m.display_override?.[0]).toBe('fullscreen'); expect(m.display_override).toContain('standalone');
    const sizes = m.icons.map((i: any) => i.sizes); expect(sizes).toContain('192x192'); expect(sizes).toContain('512x512');
    for (const i of m.icons) expect(existsSync(`public/${i.src}`)).toBe(true);
  });
  it('links the manifest and caches only the app shell and static assets', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(readFileSync('index.html', 'utf8')).toContain('rel="manifest"'); expect(sw).toContain("addEventListener('fetch'");
    expect(sw).toContain("url.pathname.startsWith('/api/')"); expect(sw).toContain("url.pathname.startsWith('/assets/')"); expect(sw).not.toContain("caches.open(CACHE).then(c => c.put(r, copy)");
    expect(readFileSync('src/main.tsx', 'utf8')).toContain('serviceWorker');
    expect(readFileSync('vercel.json', 'utf8')).toContain('index.html');
  });
});
