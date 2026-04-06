# 3D Avatar Models

Drop `.glb` files here to host them for the portal network.

Each game can reference its avatar model in its `PORTALS/<slug>.json` entry
using the `avatarUrl` field. When a player enters a portal, the destination
game's avatar is automatically passed via the `avatar_url` query parameter.

## Naming convention

Use the portal slug as the filename: `<slug>.glb`

## URL format

Models are served at:
```
https://portal.thevibemetaverse.com/models/<filename>.glb
```

## Attribution (CC)

Third-party models hosted here retain their Sketchfab / Creative Commons licenses. Source pages:

| File | Sketchfab |
|------|-----------|
| `metaverse-explorer.glb` | [Mark Zuckerberg Running](https://sketchfab.com/3d-models/mark-zuckerberg-running-446d67d2ac314a70a8d455bfc7f804e6) |
| `doomba.glb` | [Roomba](https://sketchfab.com/3d-models/roomba-16509583bde6415a80734c2407c31956) |
