# Portals — The Vibe Metaverse Portal Network

A community-driven portal network. Add a 3D portal to your Three.js game with three lines of code. Submit a PR and a portal to your game appears in the metaverse automatically.

## Quick Start

```js
import { createVibePortal } from 'https://portals.thevibemetaverse.com/embed.js';

const portal = createVibePortal({ scene, camera });
scene.add(portal);

// In your render loop:
portal.update(player.position);
```

That's it. A 3D portal arch appears in your game. Walk up to it and press E to enter the metaverse. If a player arrived from the metaverse, a return portal appears automatically.

### Options

All optional:

```js
createVibePortal({
  scene,              // your Three.js scene
  camera,             // your Three.js camera
  game: 'some-slug',  // destination game slug (default: 'the-vibe-metaverse')
  username: 'player1', // passed through the portal
  avatar: 'https://...' // passed through the portal
});
```

## The Flywheel

Add the snippet to your game and a portal to your game automatically appears inside The Vibe Metaverse. No PR, no config — just add the script and your game joins the network.

## How It Works

1. You add `embed.js` to your Three.js game
2. On load, it auto-registers your game with the portal server
3. The metaverse fetches the registry and renders a 3D portal to your game
4. Players walk through portals to travel between games

## Advanced: Custom Integration

If you need full control (non-Three.js games, custom portal rendering), use `portals.js` directly:

```html
<script src="https://portals.thevibemetaverse.com/portals.js"></script>
<script>
  const portals = await Portals.load();
  Portals.enter("game-slug", { username: "player1", avatar_url: "https://..." });
  if (Portals.ref()) Portals.back();
</script>
```
