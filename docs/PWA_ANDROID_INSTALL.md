# Android PWA installation and testing

## Production install

The app must be available from a secure HTTPS deployment. From Android Chrome:

1. Open the deployed Card Club Arcade address in Chrome.
2. Open Chrome's **More** menu and choose **Install and create shortcut**. Depending on the site/browser version the action may instead be labelled **Install app**.
3. Choose **Install** and follow the device prompts.
4. Launch the installed app from the Android app list and confirm it opens in its own app window.

Chrome's current help describes installing a web app from More > Install and create shortcut. A browser may offer an app installation or only a home-screen shortcut. A shortcut can open the site in the browser and is not the same as an installed standalone web app. Browser menus and eligibility differ by browser and OS. [Chrome Help: Use web apps on Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en-0)

On iPhone/iPad, use the browser's Share menu and its Add to Home Screen action if available. This is an OS/browser home-screen action, not a Play Store installation.

## Orientation behavior

The web manifest does not force orientation. The Games hub can display in portrait or landscape. Starting a game may request a landscape screen lock in an installed app when the API exists; unsupported or denied locks fall back to the game's rotate guidance where supported. Browsers and operating systems may ignore orientation requests.

## Offline and update checks

The service worker caches the app shell and same-origin static app assets. It does not cache API requests or multiplayer data. Solo game files may open offline after an initial successful load; room-code games still need the internet and the signaling service. The app checks its worker for updates when the page loads and returns to the foreground.

## Verification checklist for each real device

- Deploy the current `dist/` output to the intended HTTPS domain.
- Open the root URL in Android Chrome; verify the manifest response is `application/manifest+json`, icon URLs return PNG/SVG content and the service worker controls the root scope.
- Check Chrome's install action and confirm whether it installs a web app or creates a shortcut on the target OS/browser version.
- Install and launch from the app list. Confirm the icon, standalone/fullscreen behavior, portrait hub and landscape game table.
- Start a match and verify the landscape request; rotate manually if the device ignores it. Use Back/Menu and verify orientation returns naturally.
- Load once, disable the network and confirm app-shell access, then test a room-code game with connectivity restored.
- Deploy an update and verify it becomes available after the app returns to the foreground.
- Capture screenshots and inspect at a short landscape viewport (for example 800x360), a larger phone/tablet viewport, and portrait hub. Check safe areas, compact top navigation and Friends dropdown, 3-10 seat layouts where supported, text size, keyboard access, and controls.

No real Android phone was available during this source pass. Do not treat local HTTP testing as proof of production installability or Play Store readiness.

## Vercel deploy values

- Root directory: this project folder.
- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Install command: `npm ci`.
- `vercel.json` sends SPA paths to `index.html`, serves the manifest with its manifest MIME type, and prevents stale service-worker script responses.
