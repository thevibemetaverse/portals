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
 *   import { createVibePortal } from 'https://portals.thevibemetaverse.com/embed.js';
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

  const ref = getRef();
  const isReturn = !!ref;

  const label = isReturn ? 'Return' : (opts.label || 'The Vibe Metaverse');
  const group = createPortalMesh({
    label,
    isReturn,
    name: 'vibe-portal',
  });
  const portalMat = group.userData.portalMat;

  // Interaction state
  let navigating = false;
  let promptEl = null;
  let isNear = false;
  const clock = new THREE.Clock();

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
    promptEl.textContent = isReturn
      ? 'Press E to return'
      : 'Press E to enter ' + label;
    document.body.appendChild(promptEl);
  }

  // Key listener for interaction
  function onKeyDown(e) {
    if (e.code === 'KeyE' && isNear && !navigating) {
      navigating = true;
      if (promptEl) promptEl.textContent = isReturn ? 'Returning...' : 'Entering...';
      navigate();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  async function navigate() {
    if (isReturn) {
      window.location.href = ref;
      return;
    }

    try {
      const portals = await loadPortals();
      const portal = portals.find(function (p) { return p.slug === game; });
      const destUrl = portal ? portal.url : 'https://thevibemetaverse.com';

      const url = new URL(destUrl);
      url.searchParams.set('portal', 'true');
      url.searchParams.set('ref', window.location.href);
      if (username) url.searchParams.set('username', username);
      if (avatar) url.searchParams.set('avatar_url', avatar);

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
    isNear = dist < 3;

    if (isNear && !wasNear && !navigating) {
      ensurePrompt();
      promptEl.style.display = 'block';
    } else if (!isNear && wasNear) {
      if (promptEl) promptEl.style.display = 'none';
    }
  };

  // Cleanup method
  group.dispose = function () {
    window.removeEventListener('keydown', onKeyDown);
    if (promptEl && promptEl.parentNode) promptEl.parentNode.removeChild(promptEl);
    disposePortalMesh(group);
  };

  return group;
}
