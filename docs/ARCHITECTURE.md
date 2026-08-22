# Architecture

This project is a static frontend app for controlling Spotify playback from a Jubeat-style cabinet UI.

## Runtime File Ownership

- `index.html`
  - UI markup and script load order.
  - Loads app modules before Spotify SDK.
- `style.css`
  - Cabinet visual layout and component styling.
- `spotifyauth.js`
  - Spotify PKCE auth flow.
  - Access token refresh/expiry tracking.
  - Shared helpers: `retrieveAccessToken`, `getValidAccessToken`, `getAuthHeaders`, `hasSpotifySession`.
- `spotifyapi.js`
  - Spotify Web API calls for queue fetch, search, and playback.
  - Handles 401 retry via refresh helpers.
- `search.js`
  - Search view state (`main/search/results`), filter cycling, and result rendering.
- `player-controls.js`
  - Spotify Web Playback SDK init (`window.onSpotifyWebPlaybackSDKReady`).
  - Player event listeners, playback controls, progress updates.
  - Queue button behavior: short press queue-safe skip, long press takeover play.
- `input-handling.js`
  - Cabinet key mapping (`1234/qwer/asdf/zxcv`).
  - Keyboard short/long press detection for queue tiles.
  - T9 search input behavior and search/result button listeners.
- `ui-state.js`
  - Main queue tile population (`populateButtons`).
  - Connect message and non-SDK UI control bindings (shuffle/volume button bindings).

## Script Load Order

`index.html` currently loads scripts in this order:

1. `spotifyauth.js`
2. `spotifyapi.js`
3. `search.js`
4. `ui-state.js`
5. `player-controls.js`
6. `input-handling.js`
7. Spotify SDK script

This order matters because later files depend on helpers from earlier files.

## Input Model

Main 12 queue tiles support two actions:

- Short press: queue-safe jump (repeated `nextTrack()` stepping).
- Long press: takeover play (calls Web API play and may replace queue/context).

For cabinet hardware, keyboard hold duration is measured between `keydown` and `keyup`.

## Auth/Session Model

- Access token and refresh token are stored in `localStorage`.
- Access token expiry is tracked and refreshed before use.
- Refresh calls are de-duplicated to avoid concurrent refresh races.
- Auth redirects are cooldown-limited to reduce redirect loops.

## Typical Change Guide

- Change queue behavior: edit `player-controls.js`.
- Change key mappings or hold timing: edit `input-handling.js`.
- Change search screen logic/results rendering: edit `search.js`.
- Change auth/login/refresh behavior: edit `spotifyauth.js`.
- Change queue/search API calls: edit `spotifyapi.js`.
- Change visual layout/theme: edit `style.css` and `index.html`.

## Troubleshooting

- `onSpotifyWebPlaybackSDKReady is not defined`:
  - Ensure `player-controls.js` is loaded before Spotify SDK in `index.html`.
- `hasSpotifySession is not defined`:
  - Ensure `spotifyauth.js` has no parse errors and is loaded first.
- Repeated re-auth prompts:
  - Check refresh token presence in `localStorage`.
  - Check console for `invalid_grant` or redirect cooldown warnings.
