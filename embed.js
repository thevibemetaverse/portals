import * as THREE from 'three';

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

  const group = new THREE.Group();
  group.name = 'vibe-portal';

  // Colors
  const color1 = isReturn ? new THREE.Color(0xffcb6b) : new THREE.Color(0x7fdbff);
  const color2 = isReturn ? new THREE.Color(0xff9e64) : new THREE.Color(0xc792ea);

  // Portal frame — two pillars + arch
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x333355,
    roughness: 0.4,
    metalness: 0.8,
  });

  const pillarGeo = new THREE.BoxGeometry(0.25, 3.2, 0.25);
  const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
  leftPillar.position.set(-1.3, 1.6, 0);
  leftPillar.castShadow = true;
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
  rightPillar.position.set(1.3, 1.6, 0);
  rightPillar.castShadow = true;
  group.add(rightPillar);

  const archGeo = new THREE.TorusGeometry(1.3, 0.13, 8, 32, Math.PI);
  const arch = new THREE.Mesh(archGeo, frameMat);
  arch.position.set(0, 3.2, 0);
  arch.rotation.z = Math.PI;
  arch.castShadow = true;
  group.add(arch);

  // Neon edge strips on pillars
  const neonMat = new THREE.MeshBasicMaterial({ color: color1 });
  const stripGeo = new THREE.BoxGeometry(0.04, 3.2, 0.04);
  const leftStrip = new THREE.Mesh(stripGeo, neonMat);
  leftStrip.position.set(-1.12, 1.6, 0.12);
  group.add(leftStrip);
  const rightStrip = new THREE.Mesh(stripGeo, neonMat);
  rightStrip.position.set(1.12, 1.6, 0.12);
  group.add(rightStrip);

  // Portal surface — swirling shader
  const portalGeo = new THREE.PlaneGeometry(2.4, 3.0);
  const portalMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: color1 },
      color2: { value: color2 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;

      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);

        float swirl = sin(angle * 3.0 + dist * 8.0 - time * 2.0) * 0.5 + 0.5;
        float pulse = sin(time * 1.5) * 0.15 + 0.85;
        float ring = sin(dist * 12.0 - time * 3.0) * 0.5 + 0.5;

        vec3 col = mix(color1, color2, swirl * ring);
        float alpha = smoothstep(0.55, 0.3, dist) * pulse;

        gl_FragColor = vec4(col * 1.5, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const portalSurface = new THREE.Mesh(portalGeo, portalMat);
  portalSurface.position.set(0, 1.65, 0.05);
  group.add(portalSurface);

  // Glow lights
  const light1 = new THREE.PointLight(color1, 2, 8);
  light1.position.set(0, 2, 1);
  group.add(light1);

  const light2 = new THREE.PointLight(color2, 1, 6);
  light2.position.set(0, 1, 1.5);
  group.add(light2);

  // Label — canvas texture sprite
  const label = isReturn ? 'Return' : (opts.label || 'The Vibe Metaverse');
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#' + color1.getHexString();
  ctx.shadowColor = '#' + color1.getHexString();
  ctx.shadowBlur = 12;
  ctx.fillText(label, 256, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 4.0, 0);
  sprite.scale.set(4, 0.5, 1);
  group.add(sprite);

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
    portalMat.dispose();
    portalGeo.dispose();
    pillarGeo.dispose();
    archGeo.dispose();
    frameMat.dispose();
    neonMat.dispose();
    tex.dispose();
    spriteMat.dispose();
  };

  return group;
}
