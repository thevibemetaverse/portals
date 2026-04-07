import * as THREE from 'three';
import { createPortalMesh, disposePortalMesh } from './portal-mesh.js';

const API_BASE = new URL('.', import.meta.url).href.replace(/\/$/, '');

// Auto-register this game with the portal network
(function autoRegister() {
  try {
    fetch(API_BASE + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.origin,
        title: document.title || window.location.hostname,
      }),
    }).catch(() => {}); // fire-and-forget
  } catch {}
})();

function slugFromOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  } catch {
    return null;
  }
}

// Intentionally no TTL — the page reloads on portal navigation anyway.
// Long-lived sessions will use stale data if the registry changes mid-session.
let _portalsCache = null;
async function loadPortals() {
  if (_portalsCache) return _portalsCache;
  const res = await fetch(API_BASE + '/portals.json');
  _portalsCache = await res.json();
  return _portalsCache;
}

function getRef() {
  return new URLSearchParams(window.location.search).get('ref') || null;
}

/**
 * Creates a 3D portal that you add to your Three.js scene.
 *
 * Usage:
 *   import { createVibePortal } from 'https://portal.thevibemetaverse.com/embed.js';
 *   const portal = createVibePortal({ scene, camera });
 *   scene.add(portal);
 *   // In your render loop:
 *   portal.update(player.position);
 */
export function createVibePortal(opts) {
  opts = opts || {};
  const game = opts.game || 'the-vibe-metaverse';
  const username = opts.username || null;
  const avatar = opts.avatar || null;
  const scene = opts.scene || null;
  const camera = opts.camera || null;
  const portalScale = opts.scale || 1;

  const ref = getRef();
  const isReturn = !!ref;

  const label = isReturn ? 'Return' : (opts.label || 'The Vibe Metaverse');
  const group = createPortalMesh({
    label,
    isReturn,
    name: 'vibe-portal',
    scale: portalScale,
    origin: opts.origin || 'center',
  });
  const portalMat = group.userData.portalMat;

  // Interaction state
  let navigating = false;
  let promptEl = null;
  let isNear = false;
  const clock = new THREE.Clock();
  const PROXIMITY_DIST = (opts.proximityDist || 6) * portalScale;
  const ENTER_DIST = (opts.enterDist || 2) * portalScale;

  // Create the HUD prompt element
  function ensurePrompt() {
    if (promptEl) return;
    promptEl = document.createElement('div');
    promptEl.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #fff; font-family: monospace; font-size: 16px; text-align: center;
      text-shadow: 0 0 12px rgba(127,219,255,0.8);
      background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 8px;
      border: 1px solid rgba(127,219,255,0.5); display: none; z-index: 99999;
      pointer-events: none;
    `;
    document.body.appendChild(promptEl);
  }

  async function navigate() {
    if (isReturn) {
      window.location.href = ref;
      return;
    }

    try {
      const portals = await loadPortals();
      const portal = portals.find(function (p) { return p.slug === game; });
      // Hub first; the hub scene then links to the metaverse (see portals/index.html).
      const destUrl = portal ? portal.url : 'https://portal.thevibemetaverse.com';

      // Use the source game's avatar from the registry if no explicit avatar was provided.
      // This is the key mechanic: each game declares its avatarUrl in the registry,
      // and that model travels with the player through portals.
      //
      // NOTE: avatar_url is forwarded as an opaque query parameter — the destination
      // game is responsible for validating/sanitizing this URL before loading it as a
      // 3D model. Any game on the network (or a crafted link) can pass an arbitrary
      // avatar_url, so destination games should treat it as untrusted input.
      const sourceSlug = slugFromOrigin(window.location.origin);
      const sourcePortal = portals.find(function (p) { return p.slug === sourceSlug; });
      const resolvedAvatar = avatar || (sourcePortal && sourcePortal.avatarUrl) || null;

      const url = new URL(destUrl);
      url.searchParams.set('portal', 'true');
      url.searchParams.set('ref', window.location.href);
      if (username) url.searchParams.set('username', username);
      if (resolvedAvatar) url.searchParams.set('avatar_url', resolvedAvatar);

      window.location.href = url.toString();
    } catch (err) {
      console.error('[VibePortal] Navigation failed:', err);
      navigating = false;
    }
  }

  // update(playerPosition) — call each frame
  group.update = function (playerPosition) {
    // Animate shader
    const elapsed = clock.getElapsedTime();
    portalMat.uniforms.time.value = elapsed;

    if (!playerPosition) return;

    // Proximity check
    const worldPos = new THREE.Vector3();
    group.getWorldPosition(worldPos);
    const dist = playerPosition.distanceTo(worldPos);
    const wasNear = isNear;
    isNear = dist < PROXIMITY_DIST;

    if (isNear && !navigating) {
      ensurePrompt();
      promptEl.textContent = isReturn ? 'Entering portal...' : 'Entering ' + label + '...';
      promptEl.style.display = 'block';

      // Walk-in trigger: navigate when player reaches the portal
      if (dist < ENTER_DIST) {
        navigating = true;
        promptEl.textContent = isReturn ? 'Returning...' : 'Entering...';
        navigate();
      }
    } else if (!isNear && wasNear) {
      if (promptEl) promptEl.style.display = 'none';
    }
  };

  // Cleanup method
  group.dispose = function () {
    if (promptEl && promptEl.parentNode) promptEl.parentNode.removeChild(promptEl);
    disposePortalMesh(group);
  };

  return group;
}
