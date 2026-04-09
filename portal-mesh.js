import * as THREE from 'three';

/**
 * Shared 3D portal visuals for the Vibe Metaverse portal network.
 * Frameless floating vortex design with energy ring, particle orbits, and depth effect.
 *
 * Import from this package (same origin as embed.js) so games and embed stay in sync:
 *   import { createPortalMesh } from 'https://your-portals-host/portal-mesh.js';
 *
 * The metaverse dev server exposes it at /vendor/portals/portal-mesh.js
 */

const DEFAULT_COLOR1 = 0x4fc3f7;
const DEFAULT_COLOR2 = 0x9c27b0;
const RETURN_COLOR1 = 0xffb74d;
const RETURN_COLOR2 = 0xf44336;

const PARTICLE_COUNT = 40;

/* ── Vortex portal shader ─────────────────────────────────────────── */

const portalVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const portalFragment = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // Circular mask — hard disc edge
    float mask = smoothstep(0.50, 0.46, dist);

    // Glowing energy rim
    float rim = smoothstep(0.50, 0.42, dist) - smoothstep(0.42, 0.34, dist);
    float rimPulse = sin(angle * 12.0 - time * 4.0) * 0.3 + 0.7;
    rim *= rimPulse;

    // Swirling vortex — multiple layers
    float swirl1 = fbm(vec2(angle * 1.5 + dist * 6.0 - time * 1.2, dist * 4.0 - time * 0.8));
    float swirl2 = fbm(vec2(angle * 2.0 - dist * 8.0 + time * 0.9, dist * 3.0 + time * 0.5));
    float swirl = swirl1 * 0.6 + swirl2 * 0.4;

    // Dark core — sense of depth
    float core = smoothstep(0.08, 0.22, dist);
    float darkHole = 1.0 - smoothstep(0.0, 0.15, dist);

    // Combine colours
    vec3 vortexCol = mix(color1, color2, swirl);
    vortexCol *= core;
    vortexCol += color1 * rim * 2.0;

    // Bright streaks spiralling inward
    float streak = sin(angle * 6.0 + dist * 20.0 - time * 5.0);
    streak = smoothstep(0.6, 1.0, streak) * smoothstep(0.45, 0.20, dist);
    vortexCol += (color1 + color2) * 0.8 * streak;

    // Subtle radial light rays
    float rays = sin(angle * 16.0 + time * 2.0) * 0.5 + 0.5;
    rays *= smoothstep(0.45, 0.30, dist) * 0.15;
    vortexCol += vec3(rays) * color1;

    // Dark centre abyss
    vortexCol = mix(vec3(0.0, 0.0, 0.02), vortexCol, smoothstep(0.0, 0.18, dist));

    // Overall alpha
    float pulse = sin(time * 1.2) * 0.08 + 0.92;
    float alpha = mask * pulse;

    // Outer glow halo (additive, beyond the disc)
    float halo = smoothstep(0.55, 0.44, dist) * 0.35;
    vortexCol += color1 * halo;
    alpha = max(alpha, halo);

    gl_FragColor = vec4(vortexCol, alpha);
  }
`;

/* ── Energy-ring shader (torus glow) ──────────────────────────────── */

const ringVertex = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const ringFragment = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
    float pulse = sin(time * 3.0) * 0.15 + 0.85;
    vec3 col = mix(color1, color2, fresnel) * (1.0 + fresnel * 1.5);
    float alpha = fresnel * pulse * 0.9;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ── Particle orbit sprites ───────────────────────────────────────── */

function createParticleSystem(s, color1, color2) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);

  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.4 * s + Math.random() * 0.4 * s;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3 * s;

    const t = Math.random();
    const c = c1.clone().lerp(c2, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = (0.03 + Math.random() * 0.06) * s;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute float seed;
      varying vec3 vColor;
      uniform float time;
      void main() {
        vColor = color;
        float angle = seed + time * (0.5 + seed * 0.5);
        float r = length(position.xy);
        vec3 pos = vec3(
          cos(angle) * r,
          sin(angle) * r,
          position.z + sin(time * 2.0 + seed * 6.28) * 0.1
        );
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * 300.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(vColor * 2.0, alpha * 0.7);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  return { points: new THREE.Points(geo, mat), geo, mat };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.label] — Title above the portal (omit or `''` to hide label sprite)
 * @param {boolean} [opts.isReturn] — Warm palette for return portals
 * @param {THREE.Color} [opts.color1] — Override accent / swirl (optional)
 * @param {THREE.Color} [opts.color2] — Override secondary swirl (optional)
 * @param {string} [opts.thumbnail] — URL of an image to display in the portal center (e.g. destination screenshot)
 * @param {string} [opts.name] — `group.name` (default `"vibe-portal"`)
 * @param {number} [opts.scale] — Uniform scale multiplier (default 1)
 * @param {string} [opts.origin] — "center" (default) or "bottom" — bottom: floor at y=0; center: group origin at portal opening center
 * @returns {THREE.Group} `userData.portalMat` is the ShaderMaterial; use `disposePortalMesh(group)` when done
 */
export function createPortalMesh(opts = {}) {
  const {
    label = 'Portal',
    isReturn = false,
    color1: color1Opt,
    color2: color2Opt,
    thumbnail = null,
    name = 'vibe-portal',
    scale = 1,
    origin = 'center',
  } = opts;

  const color1 = color1Opt
    ? color1Opt.clone()
    : new THREE.Color(isReturn ? RETURN_COLOR1 : DEFAULT_COLOR1);
  const color2 = color2Opt
    ? color2Opt.clone()
    : new THREE.Color(isReturn ? RETURN_COLOR2 : DEFAULT_COLOR2);

  const s = scale;

  /* ── Portal disc (circular, not rectangular) ── */
  const portalGeo = new THREE.CircleGeometry(1.5 * s, 64);
  const portalMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: color1 },
      color2: { value: color2 },
    },
    vertexShader: portalVertex,
    fragmentShader: portalFragment,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const portalSurface = new THREE.Mesh(portalGeo, portalMat);
  portalSurface.position.set(0, 1.8 * s, 0);

  /* ── Energy ring (glowing torus around the opening) ── */
  const ringGeo = new THREE.TorusGeometry(1.5 * s, 0.07 * s, 16, 64);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: color1 },
      color2: { value: color2 },
    },
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(0, 1.8 * s, 0);

  /* ── Second wider subtle ring ── */
  const ring2Geo = new THREE.TorusGeometry(1.6 * s, 0.03 * s, 12, 64);
  const ring2 = new THREE.Mesh(ring2Geo, ringMat);
  ring2.position.set(0, 1.8 * s, 0);

  /* ── Orbiting particles ── */
  const particles = createParticleSystem(s, color1, color2);
  particles.points.position.set(0, 1.8 * s, 0);

  /* ── Soft lighting ── */
  const portalLight = new THREE.PointLight(color1, 1.5, 10 * s);
  portalLight.position.set(0, 2 * s, 1.5 * s);

  const portalLight2 = new THREE.PointLight(color2, 0.8, 8 * s);
  portalLight2.position.set(0, 1.2 * s, -1 * s);

  /* ── Ground glow (subtle circle below portal) ── */
  const glowGeo = new THREE.CircleGeometry(2.0 * s, 32);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: color1 },
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
      varying vec2 vUv;
      void main() {
        float dist = length(vUv - 0.5) * 2.0;
        float pulse = sin(time * 1.5) * 0.1 + 0.9;
        float alpha = smoothstep(1.0, 0.0, dist) * 0.2 * pulse;
        gl_FragColor = vec4(color1, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const groundGlow = new THREE.Mesh(glowGeo, glowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.set(0, 0.02 * s, 0);

  /* ── Thumbnail image in portal centre ── */
  let thumbMesh = null;
  let thumbTex = null;
  let thumbMat = null;

  function buildThumbMesh(texture) {
    thumbTex = texture;
    thumbTex.colorSpace = THREE.SRGBColorSpace;
    const thumbGeo = new THREE.CircleGeometry(0.7 * s, 48);
    thumbMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: thumbTex },
        time: { value: 0 },
        color1: { value: color1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float time;
        uniform vec3 color1;
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          // Circular mask with soft glow edge
          float mask = smoothstep(1.0, 0.85, dist);
          float edgeGlow = smoothstep(1.0, 0.7, dist) - smoothstep(0.7, 0.4, dist);
          float pulse = sin(time * 2.0) * 0.15 + 0.85;
          vec4 tex = texture2D(map, vUv);
          vec3 col = tex.rgb + color1 * edgeGlow * 0.3 * pulse;
          float alpha = mask * tex.a;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    thumbMesh = new THREE.Mesh(thumbGeo, thumbMat);
    thumbMesh.position.set(0, 1.8 * s, 0.08 * s);
    inner.add(thumbMesh);
    resources.thumbGeo = thumbGeo;
    resources.thumbMat = thumbMat;
    resources.thumbTex = thumbTex;
  }

  const inner = new THREE.Group();
  inner.add(portalSurface, ring, ring2, particles.points, portalLight, portalLight2, groundGlow);

  const resources = {
    portalGeo,
    portalMat,
    ringGeo,
    ringMat,
    ring2Geo,
    glowGeo,
    glowMat,
    particleGeo: particles.geo,
    particleMat: particles.mat,
  };

  if (label) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '600 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    const hex = '#' + color1.getHexString();
    ctx.fillStyle = hex;
    ctx.shadowColor = hex;
    ctx.shadowBlur = 16;
    ctx.fillText(label.toUpperCase(), 256, 40);
    ctx.shadowBlur = 8;
    ctx.fillText(label.toUpperCase(), 256, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 3.6 * s, 0);
    sprite.scale.set(3.5 * s, 0.44 * s, 1);
    inner.add(sprite);
    resources.tex = tex;
    resources.spriteMat = spriteMat;
  }

  const group = new THREE.Group();
  group.name = name;
  if (origin === 'bottom') {
    inner.position.set(0, 0, 0);
  } else {
    inner.position.set(0, -1.8 * s, 0);
  }
  group.add(inner);

  group.userData.portalMat = portalMat;
  group.userData._portalResources = resources;
  group.userData._ringMat = ringMat;
  group.userData._particleMat = particles.mat;
  group.userData._glowMat = glowMat;
  group.userData._thumbMat = null;

  /**
   * Load or replace the thumbnail image in the portal centre.
   * @param {string} url — image URL (or `null` to remove)
   */
  group.userData.setThumbnail = function (url) {
    if (!url) {
      if (thumbMesh) { inner.remove(thumbMesh); thumbMesh = null; }
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(url, (tex) => {
      if (thumbMesh) inner.remove(thumbMesh);
      buildThumbMesh(tex);
      group.userData._thumbMat = thumbMat;
    });
  };

  if (thumbnail) {
    group.userData.setThumbnail(thumbnail);
  }

  return group;
}

/**
 * Call each frame to advance all portal shader uniforms.
 * Handles the main vortex, energy ring, particles, and ground glow.
 * @param {THREE.Group} group — the group returned by createPortalMesh
 * @param {number} time — elapsed seconds (e.g. clock.getElapsedTime())
 */
export function updatePortalTime(group, time) {
  if (group.userData.portalMat) group.userData.portalMat.uniforms.time.value = time;
  if (group.userData._ringMat) group.userData._ringMat.uniforms.time.value = time;
  if (group.userData._particleMat) group.userData._particleMat.uniforms.time.value = time;
  if (group.userData._glowMat) group.userData._glowMat.uniforms.time.value = time;
  if (group.userData._thumbMat) group.userData._thumbMat.uniforms.time.value = time;
}

/** Release GPU/CPU resources for a group built by {@link createPortalMesh}. */
export function disposePortalMesh(group) {
  const r = group.userData._portalResources;
  if (!r) return;

  r.portalGeo.dispose();
  r.portalMat.dispose();
  r.ringGeo.dispose();
  r.ringMat.dispose();
  r.ring2Geo.dispose();
  r.glowGeo.dispose();
  r.glowMat.dispose();
  r.particleGeo.dispose();
  r.particleMat.dispose();
  if (r.tex) r.tex.dispose();
  if (r.spriteMat) r.spriteMat.dispose();
  if (r.thumbGeo) r.thumbGeo.dispose();
  if (r.thumbMat) r.thumbMat.dispose();
  if (r.thumbTex) r.thumbTex.dispose();
  delete group.userData._portalResources;
  delete group.userData.portalMat;
  delete group.userData._ringMat;
  delete group.userData._particleMat;
  delete group.userData._glowMat;
  delete group.userData._thumbMat;
  delete group.userData.setThumbnail;
}
