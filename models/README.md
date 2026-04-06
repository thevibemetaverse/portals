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
