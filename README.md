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

Getting connected is **two separate steps**:

1. **Add the embed to your game** (Option 1 or Option 2 below) — this gives you a walk-in portal from your game *out* to the network.
2. **Register your game in the portal registry** (Option 3 below) — this is a *separate* pull request against this repo that puts your game inside every *other* game on the network.

You can do step 1 without step 2 (you'll have outbound/return portals only). To get the full flywheel — other games showing portals to yours — you need both.

### Option 1: Copy this prompt into your AI agent

Copy the prompt below into **Cursor**, **Claude Code**, or any AI coding agent. It's self-contained -- no need to clone the portals repo.

````
Connect my Three.js game to the Vibe Metaverse portal network.
This adds a 3D portal players can walk through to travel to other games,
and handles players arriving from other games with their avatars.

## 1. Add the portal

Find where my Three.js scene and camera are initialized. Add the portal:

```js
import { createVibePortal } from 'https://portal.thevibemetaverse.com/embed.js';

const portal = createVibePortal({
  scene,
  camera,
  avatar: 'https://portal.thevibemetaverse.com/models/MY_AVATAR.glb', // optional: my game's 3D avatar
});
scene.add(portal);
```

Replace MY_AVATAR.glb with my game's avatar model URL (any public .glb works),
or remove the avatar line if I don't have one yet.
Position the portal somewhere visible: portal.position.set(x, y, z).

The embed alone gives me a working outbound portal and auto-spawns a return
portal when players arrive with a `ref` query param. To make my game show up
inside *other* games on the network, step 4 below opens a PR on the portals
repo to register it -- this is a *separate* step from adding the embed.

## 2. Update the render loop

In the animation/render loop, add this so the portal detects when the player is nearby:

```js
portal.update(player.position);
```

Use whatever variable represents the player or camera position.

## 3. Handle arriving players

When a player arrives from another game, the URL has query params with their info.
Read the avatar URL and load their 3D model:

```js
import { Box3, AnimationMixer, Clock } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const params = new URLSearchParams(window.location.search);
const avatarUrl = params.get('avatar_url');

let avatarMixer = null;

if (avatarUrl) {
  const loader = new GLTFLoader();
  loader.load(avatarUrl, (gltf) => {
    const model = gltf.scene;

    // Scale to ~1.2 units tall
    const box = new Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    if (height > 0) {
      const s = 1.2 / height;
      model.scale.set(s, s, s);
    }

    // Play idle animation if the model has one
    if (gltf.animations.length > 0) {
      avatarMixer = new AnimationMixer(model);
      avatarMixer.clipAction(gltf.animations[0]).play();
    }

    scene.add(model);
  });
}

// Near the top of your setup code:
const clock = new Clock();

// In the render loop:
const delta = clock.getDelta();
if (avatarMixer) avatarMixer.update(delta);
```

The return portal is handled automatically -- if `ref` is in the URL,
a return portal spawns so the player can go back.

## 4. Register my game in the Vibe Metaverse portal network

This is a **separate step** from adding the embed. Without it, my game
has outbound and return portals but won't appear inside any other game on
the network. To register, open a pull request on the portals repo that
adds a JSON file describing my game.

If the `gh` CLI is available, do this automatically end-to-end. Replace
`MY_GAME` / `MY_DOMAIN` / etc with my actual values:

```bash
# 1. Fork and clone the portals repo into a sibling directory
gh repo fork thevibemetaverse/portals --clone=true -- ../portals
cd ../portals

# 2. Create a new branch
git checkout -b add-MY_GAME-portal

# 3. Add the registry file (name it after my domain, dots -> dashes)
cat > PORTALS/MY_DOMAIN-com.json <<'JSON'
{
  "url": "https://MY_DOMAIN.com",
  "title": "MY_GAME",
  "description": "A short description of my game.",
  "portalImageUrl": "https://MY_DOMAIN.com/thumbnail.png",
  "avatarUrl": "https://MY_DOMAIN.com/avatar.glb"
}
JSON

# 4. Commit and open the PR
git add PORTALS/MY_DOMAIN-com.json
git commit -m "Add MY_GAME portal"
git push -u origin add-MY_GAME-portal
gh pr create --title "Add MY_GAME portal" \
  --body "Registers MY_GAME in the Vibe Metaverse portal network."
```

`portalImageUrl` and `avatarUrl` are optional -- omit them if I don't
have a thumbnail or avatar yet. The filename must use my domain with
dots replaced by dashes (e.g. `my-awesome-game-com.json`).

If the `gh` CLI isn't available, tell me the exact steps to do it
manually through the GitHub web UI instead.

## createVibePortal options reference

| Option          | Default                  | Description                              |
|-----------------|--------------------------|------------------------------------------|
| scene           | (required)               | Three.js scene                           |
| camera          | (required)               | Three.js camera                          |
| avatar          | null                     | URL to my game's .glb avatar model       |
| label           | 'The Vibe Metaverse'     | Text shown above the portal              |
| scale           | 1                        | Size multiplier for the portal ring      |
| labelScale      | 1                        | Size multiplier for the label only       |
| username        | null                     | Player's display name                    |
| game            | 'the-vibe-metaverse'     | Target game slug                         |
| proximityDist   | 6                        | Distance to show prompt                  |
| enterDist       | 2                        | Distance to trigger navigation           |
````

### Option 2: The embed (manual)

```js
import { createVibePortal } from 'https://portal.thevibemetaverse.com/embed.js';

const portal = createVibePortal({ scene, camera });
scene.add(portal);

// In your render loop:
portal.update(player.position);
```

That's it. A glowing 3D portal appears in your scene. When a player walks into it, they're transported to the network hub. When a player arrives *from* the network, a return portal spawns automatically.

### Option 3: Register your game in the network *(separate step from Options 1 & 2)*

Options 1 and 2 give you the embed -- a walk-in portal from *your* game to the network. This step is different: it puts *your* game inside every *other* game on the network by adding a JSON entry to the `PORTALS/` directory of this repo and opening a pull request.

You can skip this if you only want the outbound/return portal behavior, but you need it to get the full flywheel: once it's merged, a portal to your game will appear on [thevibemetaverse.com](https://thevibemetaverse.com) and across the entire portal network -- meaning players from every other connected game can discover and visit yours.

**Step-by-step:**

1. **Fork** this repo
2. **Copy** the template: `PORTALS/__TEMPLATE__.json` -> `PORTALS/your-game-domain-com.json`
   - Name the file after your game's domain with dashes instead of dots (e.g., `my-awesome-game-com.json`)
3. **Fill in your game's details:**

```json
{
  "url": "https://your-game.com",
  "title": "Your Game",
  "description": "A short description of your game or experience.",
  "portalImageUrl": "https://url-to-a-thumbnail.png",
  "avatarUrl": "https://url-to-your-avatar.glb"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `url` | Yes | The URL to your game -- this is where the portal sends players |
| `title` | Yes | Your game's display name shown on the portal |
| `description` | No | A short description so players know what to expect |
| `portalImageUrl` | No | A thumbnail image displayed inside the portal circle |
| `avatarUrl` | No | A `.glb` 3D model representing your game's avatar in the metaverse |

4. **Open a PR**. Once a maintainer merges it, a portal to your game appears on [thevibemetaverse.com](https://thevibemetaverse.com) and inside every other game in the network.

That's it -- no accounts, no sign-ups, no SDK required. Just a JSON file and a PR.

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

1. You add the embed to your Three.js game — this gives you a walk-in portal to the network
2. You open a PR adding a JSON file for your game to the `PORTALS/` directory
3. Once merged, a portal to your game appears in the hub and inside every other game on the network
4. Players walk through portals to travel between games
5. URL params (`portal`, `ref`, `username`, `avatar_url`) are passed through so games can handle arrivals (the embed uses these automatically to spawn a return portal and carry the player's avatar)

---

## Configuration

All options are optional:

```js
createVibePortal({
  scene,                    // your Three.js scene (required)
  camera,                   // your Three.js camera (required)
  game: 'some-slug',        // target game slug (default: 'the-vibe-metaverse')
  label: 'Enter Metaverse', // text shown above the portal
  username: 'player1',      // passed through to the destination game
  avatar: 'https://...',    // avatar URL passed through to the destination
  scale: 1.5,               // portal ring size multiplier
  labelScale: 0.4,          // shrink only the label (independent of scale)
  origin: 'center',         // spawn position hint
  proximityDist: 6,         // distance to show "entering..." prompt
  enterDist: 2,             // distance to trigger navigation
});
```

### Sizing the portal vs. the label

`scale` resizes the whole portal uniformly -- ring, lights, and label together. If you just want a bigger or smaller **label** without touching the ring, use `labelScale` instead. The two multiply, so `scale: 2, labelScale: 0.5` gives you a double-size ring with a normal-size label.

The label is anchored by its bottom edge, so it always sits just above the portal ring regardless of `labelScale` -- shrinking the label won't leave a floating gap, and growing it won't overlap the ring.

### The in-game HUD prompt

When a player walks within `proximityDist` of the portal, the embed shows a small status toast centered on the screen ("Entering The Vibe Metaverse..."). When they cross `enterDist`, it flips to "Entering..." and the page navigates. The HUD is a fixed-position DOM element (not a 3D object), lives on top of your canvas with `pointer-events: none`, and is removed automatically when you call `portal.dispose()`.

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
    "@vibe/portals": "https://portal.thevibemetaverse.com/sdk/index.js"
  }
}
</script>
<script type="module">
  import { createPortalMesh, fetchPortalsRegistry } from '@vibe/portals';
</script>
```

### Low-level API (non-Three.js)

```html
<script src="https://portal.thevibemetaverse.com/portals.js"></script>
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
GET https://portal.thevibemetaverse.com/portals.json
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
4. Make changes and reload the hub to verify
5. Open a PR

---

## License

Open source. Build portals, connect worlds.
