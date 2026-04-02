# Portals — The Vibe Metaverse Portal Network

A community-driven portal network. Add a portal to your game with one snippet. Submit a PR to join the network.

## Add a Portal to Your Game

```html
<script src="https://YOURDOMAIN/portals.js"></script>
<script>
  // Load all portals in the network
  const portals = await Portals.load();

  // When a player enters a portal in your game
  Portals.enter("game-slug", {
    username: "player1",
    avatar_url: "https://example.com/avatar.glb"
  });
</script>
```

`Portals.load()` returns an array of portals:

```json
[
  {
    "slug": "my-game",
    "url": "https://mygame.com",
    "title": "My Game",
    "description": "A cool game.",
    "portalImageUrl": "https://mygame.com/thumbnail.png"
  }
]
```

`Portals.enter(slug, params)` redirects the player to that portal's URL, passing along `username`, `avatar_url`, and `ref` (auto-set to the current page).

`Portals.ref()` returns the referring URL (from the `?ref=` query param) or `null` if the player didn't arrive through a portal.

`Portals.back()` navigates back to the referring portal. Use it to let players return where they came from:

```js
// Show a "go back" portal if the player arrived from another game
if (Portals.ref()) {
  // render a return portal, and when they enter it:
  Portals.back();
}
```

## Submit Your Portal

1. Fork this repo
2. Copy `PORTALS/__TEMPLATE__.json` to `PORTALS/your-game.json`
3. Fill in your details:

```json
{
  "url": "https://yourgame.com",
  "title": "Your Game",
  "description": "A short description of your game.",
  "portalImageUrl": "https://yourgame.com/thumbnail.png"
}
```

4. Submit a pull request

Once merged, your portal automatically appears in every game using the network.

## How It Works

- `PORTALS/` contains one JSON file per portal (added via PR)
- `build.js` generates `portals.json` from those files (run `node build.js`)
- `portals.js` is the client snippet — fetches `portals.json` and handles navigation
- Deploy as a static site (GitHub Pages, Vercel, Netlify, any CDN)

## The Vibe Metaverse v2 Integration

Games like The Vibe Metaverse v2 consume the portal list and render them in 3D:

```js
const portals = await fetch("https://YOURDOMAIN/portals.json").then(r => r.json());
portals.forEach(portal => {
  // Create a 3D portal object in your scene
  // On player proximity, call:
  Portals.enter(portal.slug, { username, avatar_url });
});
```
