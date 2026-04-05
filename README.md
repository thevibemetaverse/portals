# Portals -- The Open Metaverse Portal Network

**Connect your game to every other game in the network. Players walk through a 3D portal in your world and land in someone else's -- and vice versa.**

Every game that joins the network gets a portal inside every other game. More games = more portals = more players discovering your project. It's a flywheel: you add one snippet, and suddenly players from dozens of other games can walk directly into yours.

---

## Why add a portal?

- **Free discovery.** A portal to your game appears inside every other game in the network. Players find you without you doing any marketing.
- **Free traffic back.** When players arrive from the network, a return portal spawns automatically so they can come back anytime.
- **Three lines of code.** No SDK installs, no build steps, no accounts. Just an import and you're connected.
- **You keep full control.** The portal is a Three.js mesh in your scene. Position it, scale it, style it -- it's your world.

---

## Add a portal to your game

### Option 1: The embed (fastest)

```js
import { createVibePortal } from 'https://portals-production-ee2d.up.railway.app/embed.js';

const portal = createVibePortal({ scene, camera });
scene.add(portal);

// In your render loop:
portal.update(player.position);
```

That's it. A glowing 3D portal arch appears in your scene. When a player walks into it, they're transported to the network hub. When a player arrives *from* the network, a return portal spawns automatically.

### Option 2: Let your AI agent do it

Copy this prompt into **Cursor**, **Claude Code**, or any AI coding agent:

```
Add a portal to my Three.js game that connects it to the Vibe Metaverse portal network.

1. Find where my Three.js scene and camera are initialized.
2. Add this import to that file:
   import { createVibePortal } from 'https://portals-production-ee2d.up.railway.app/embed.js';
3. After the scene is set up, create the portal:
   const portal = createVibePortal({ scene, camera });
   scene.add(portal);
4. In the render/animation loop, add: portal.update(player.position);
   Use whatever variable represents the player or camera position.
5. Position the portal somewhere that makes sense using portal.position.set(x, y, z).

The portal auto-registers my game with the network. When players walk into it they
travel to other games. When players arrive from the network, a return portal appears
automatically.

Options I can customize: label (arch text), scale (size), proximityDist (default 6),
enterDist (default 2), username, avatar.
```

The agent will find the right file, the right variables, and the right spot in your render loop.

### Option 3: Submit a PR (manual registration)

If you'd rather register without adding the embed yet, just add a JSON file:

1. Fork this repo
2. Copy `PORTALS/__TEMPLATE__.json` to `PORTALS/your-game-domain-com.json`
3. Fill in your details:

```json
{
  "url": "https://your-game.com",
  "title": "Your Game",
  "description": "A short description of your game.",
  "portalImageUrl": "https://url-to-a-thumbnail.png"
}
```

4. Open a PR. Once merged, a portal to your game appears across the network.

### Option 3: Auto-registration

When you use the embed script, your game auto-registers with the portal server. A PR is created on this repo automatically -- no manual steps needed. Once a maintainer merges it, you're in.

---

## How the network works

```
Your Game                    Portal Network                    Other Games
┌──────────┐    walk in     ┌──────────────┐    portal to    ┌──────────┐
│  Portal  │ ─────────────> │   Hub Scene  │ ─────────────>  │  Game B  │
│  (embed) │                │  (all games) │                 │  Game C  │
└──────────┘                └──────────────┘                 │  Game D  │
                                                             └──────────┘
     <───────────────────────────────────────────────────────────
                     return portal (automatic)
```

1. You add the embed to your Three.js game
2. The embed auto-registers your game with the portal server (creates a PR on this repo)
3. Once merged, a portal to your game appears in the hub and across the network
4. Players walk through portals to travel between games
5. URL params (`portal`, `ref`, `username`, `avatar_url`) are passed through so games can handle arrivals

---

## Configuration

All options are optional:

```js
createVibePortal({
  scene,                    // your Three.js scene (required)
  camera,                   // your Three.js camera (required)
  game: 'some-slug',        // target game slug (default: 'the-vibe-metaverse')
  label: 'Enter Metaverse', // text shown on the portal arch
  username: 'player1',      // passed through to the destination game
  avatar: 'https://...',    // avatar URL passed through to the destination
  scale: 1.5,               // portal size multiplier
  origin: 'center',         // spawn position hint
  proximityDist: 6,         // distance to show "entering..." prompt
  enterDist: 2,             // distance to trigger navigation
});
```

### Handling arrivals

When a player arrives at your game from the network, the URL will contain these query params:

| Param | Description |
|-------|-------------|
| `portal` | `"true"` -- the player came through a portal |
| `ref` | The URL they came from (used for the return portal) |
| `username` | The player's username (if provided) |
| `avatar_url` | The player's avatar URL (if provided) |

The embed handles this automatically -- a return portal spawns when `ref` is present. If you want custom arrival logic, read these params yourself.

---

## Advanced: full SDK

For hub-style games that render portals to *every* game in the network, or for non-Three.js integrations:

```js
// Full SDK -- render a row of portals to all registered games
import { createPortalMesh, fetchPortalsRegistry, spawnPortalRow } from '@vibe/portals';

const portals = await fetchPortalsRegistry();
spawnPortalRow(scene, portals);
```

### Package exports

| Export | What it does |
|--------|-------------|
| `@vibe/portals` | Full SDK (mesh + registry + hub helpers) |
| `@vibe/portals/mesh` | Portal mesh only |
| `@vibe/portals/embed` | The `createVibePortal` embed |
| `@vibe/portals/registry` | Registry fetch helpers |
| `@vibe/portals/hub` | Hub scene utilities |

### Browser games without a bundler

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js",
    "@vibe/portals": "https://portals-production-ee2d.up.railway.app/sdk/index.js"
  }
}
</script>
<script type="module">
  import { createPortalMesh, fetchPortalsRegistry } from '@vibe/portals';
</script>
```

### Low-level API (non-Three.js)

```html
<script src="https://portals-production-ee2d.up.railway.app/portals.js"></script>
<script>
  const portals = await Portals.load();
  Portals.enter('game-slug', { username: 'player1', avatar_url: 'https://...' });
  if (Portals.ref()) Portals.back(); // return portal
</script>
```

---

## Portal registry

The registry lives in the [`PORTALS/`](./PORTALS) directory. Each game is a JSON file named after its domain (e.g., `my-game-com.json`). The server reads this directory and serves it as `/portals.json`.

To see all currently registered portals:
```
GET https://portals-production-ee2d.up.railway.app/portals.json
```

---

## Running locally

```bash
npm install
npm start        # starts on port 3001
```

---

## Contributing

The easiest way to contribute is to **add your game to the network**. Fork, add your JSON file to `PORTALS/`, and open a PR.

If you want to improve the portal SDK, hub experience, or server:

1. Fork and clone the repo
2. `npm install && npm start`
3. Open `http://localhost:3001` to see the hub
4. Make changes and test with `test-game.html`
5. Open a PR

---

## License

Open source. Build portals, connect worlds.
