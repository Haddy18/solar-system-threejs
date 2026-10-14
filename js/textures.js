/* ═══ Texturas procedurales ══════════════════════════════════
 * Todo se genera en canvas con ruido determinista: el proyecto
 * funciona sin conexión y con la misma semilla siempre igual.
 *   map      → textura de color (SRGB)
 *   bumpMap  → relieve (rocosos y Tierra)
 *   roughMap → océanos brillantes, tierra mate (Tierra)
 */

import {
  SRGBColorSpace,
  CanvasTexture,
  ClampToEdgeWrapping,
  EquirectangularReflectionMapping,
  RepeatWrapping
} from 'three';
import { fbm3, noise3, mulberry32 } from './noise.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** fBm con media en 0,5 y rango útil [0,1] */
const norm01 = (v) => clamp01(v * 1.9 + 0.5);
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
const px = (c) =>
  `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(c, srgb = true) {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** rampa de paradas [[pos, [r,g,b]], …] */
function ramp(stops, t) {
  t = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0] || i === stops.length - 1) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const u = p1 === p0 ? 0 : clamp01((t - p0) / (p1 - p0));
      return mix(c0, c1, u);
    }
  }
  return stops[0][1];
}

/** Coordenadas esféricas continuas para el muestreo 3D */
function sphereCoords(w, h, x, y) {
  const lat = (0.5 - (y + 0.5) / h) * Math.PI;
  const lon = ((x + 0.5) / w) * TAU;
  const cl = Math.cos(lat);
  return [cl * Math.cos(lon), cl * Math.sin(lon), Math.sin(lat), lat];
}

/* ── Rocosos (Mercurio, Marte, Luna…) ────────────────────── */
function genRocky(def) {
  const { w, h, base, dark, light, craters = 0, caps = 0, seed = 1 } = def;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const bc = canvas(w, h);
  const bctx = bc.getContext('2d');
  const bimg = bctx.createImageData(w, h);
  const bd = bimg.data;

  const F = def.freq || 3.0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [cx, cy, cz, lat] = sphereCoords(w, h, x, y);
      const n = fbm3(cx * F, cy * F, cz * F, 5, 2, 0.5, seed);
      const det = fbm3(cx * F * 5, cy * F * 5, cz * F * 5, 4, 2, 0.5, seed + 91);
      const e = norm01(n * 0.72 + det * 0.28);

      let col = e < 0.5
        ? mix(dark, base, smoothstep(0.05, 0.5, e))
        : mix(base, light, smoothstep(0.5, 0.95, e));

      if (caps) {
        const edge = 1.22 + noise3(cx * 7, cy * 7, cz * 7, seed + 5) * 0.16;
        const al = Math.abs(lat);
        const ice = smoothstep(edge, edge + 0.14, al);
        col = mix(col, [236, 242, 250], ice);
      }

      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;

      const hv = clamp01(0.5 + (e - 0.5) * 1.3) * 255;
      bd[i] = hv; bd[i + 1] = hv; bd[i + 2] = hv; bd[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  // cráteres (pintados con "luz" coherente: desde la izquierda)
  const rnd = mulberry32(seed * 977 + 13);
  for (let k = 0; k < craters; k++) {
    const cxp = rnd() * w;
    const cyp = 0.04 * h + rnd() * 0.92 * h;
    const r = 1.5 + Math.pow(rnd(), 3.2) * w * 0.045;
    const sq = Math.max(0.35, Math.sin((cyp / h) * Math.PI)); // aplasta cerca de polos

    for (const ox of [-w, 0, w]) {
      if (cxp + ox + r < 0 || cxp + ox - r > w) continue;

      ctx.save();
      ctx.translate(cxp + ox, cyp);
      ctx.scale(1, sq);
      let g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,0.30)');
      g.addColorStop(0.62, 'rgba(0,0,0,0.10)');
      g.addColorStop(0.78, 'rgba(255,255,255,0.20)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.restore();

      bctx.save();
      bctx.translate(cxp + ox, cyp);
      bctx.scale(1, sq);
      const gb = bctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      gb.addColorStop(0, 'rgba(0,0,0,0.75)');
      gb.addColorStop(0.7, 'rgba(0,0,0,0.35)');
      gb.addColorStop(0.85, 'rgba(255,255,255,0.35)');
      gb.addColorStop(1, 'rgba(255,255,255,0)');
      bctx.fillStyle = gb;
      bctx.beginPath(); bctx.arc(0, 0, r, 0, TAU); bctx.fill();
      bctx.restore();
    }
  }

  return { map: toTexture(c), bumpMap: toTexture(bc, false) };
}

/* ── Tierra ──────────────────────────────────────────────── */
function genEarth(def) {
  const { w, h, seed = 42 } = def;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const rc = canvas(w, h);
  const rctx = rc.getContext('2d');
  const rimg = rctx.createImageData(w, h);
  const rd = rimg.data;

  const bc = canvas(w, h);
  const bctx = bc.getContext('2d');
  const bimg = bctx.createImageData(w, h);
  const bd = bimg.data;

  const OCE_D = [4, 14, 44], OCE_M = [8, 46, 96], OCE_S = [22, 104, 146];
  const SAND = [214, 199, 148], GREEN = [58, 106, 46], FOREST = [26, 68, 32];
  const DESERT = [198, 168, 106], ROCK = [122, 104, 84], SNOW = [244, 248, 252];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [cx, cy, cz, lat] = sphereCoords(w, h, x, y);
      const alat = Math.abs(lat);

      // máscara de continentes
      const cn = norm01(fbm3(cx * 1.55, cy * 1.55, cz * 1.55, 6, 2.05, 0.52, seed));
      const land = smoothstep(0.55, 0.60, cn);
      const elev = norm01(fbm3(cx * 5.2, cy * 5.2, cz * 5.2, 5, 2.1, 0.5, seed + 7));

      let col, rough, hv;
      if (land < 0.5) {
        // océano: profundidad según cuánto "tierra" hay alrededor
        const depth = smoothstep(0.545, 0.30, cn);
        col = mix(OCE_S, mix(OCE_M, OCE_D, depth), smoothstep(0, 0.85, depth));
        if (land > 0.001) col = mix(mix(SAND, OCE_S, 0.45), col, land * 2);
        rough = 0.16;
        hv = 0.46 - depth * 0.1;
      } else {
        // tierra firme
        const belt = Math.exp(-Math.pow((alat - 0.30 * Math.PI) / (0.13 * Math.PI), 2)); // zonas áridas
        let veg = mix(FOREST, GREEN, smoothstep(0.35, 0.75, elev));
        veg = mix(veg, DESERT, belt * 0.85 * (1 - smoothstep(0.7, 0.9, elev)));
        veg = mix(veg, ROCK, smoothstep(0.72, 0.92, elev));
        veg = mix(SAND, veg, smoothstep(0.55, 0.60, cn)); // playa
        // nieve: altura o latitud
        const snow = Math.max(smoothstep(0.86, 0.97, elev), smoothstep(1.18, 1.4, alat));
        col = mix(veg, SNOW, snow);
        rough = 0.88;
        hv = 0.5 + elev * 0.5;
      }

      // casquetes polares
      const iceEdge = 1.27 + noise3(cx * 8, cy * 8, cz * 8, seed + 3) * 0.1;
      const ice = smoothstep(iceEdge, iceEdge + 0.13, alat);
      if (ice > 0) {
        col = mix(col, [232, 240, 250], ice);
        rough = rough + (0.8 - rough) * ice;
      }

      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      const rv = rough * 255;
      rd[i] = rv; rd[i + 1] = rv; rd[i + 2] = rv; rd[i + 3] = 255;
      const bv = hv * 255;
      bd[i] = bv; bd[i + 1] = bv; bd[i + 2] = bv; bd[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  return {
    map: toTexture(c),
    bumpMap: toTexture(bc, false),
    roughnessMap: toTexture(rc, false)
  };
}

/* ── Venus (superficie enmascarada por nubes) ────────────── */
function genVenus(def) {
  const { w, h, base, dark, light, seed = 23 } = def;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [cx, cy, cz, lat] = sphereCoords(w, h, x, y);
      const n = norm01(fbm3(cx * 1.7, cy * 1.7, cz * 7.5, 5, 2, 0.5, seed));
      const swirl = norm01(fbm3(cx * 3.4 + 11, cy * 3.4, cz * 12, 4, 2, 0.5, seed + 4));
      let col = mix(dark, light, n * 0.7 + swirl * 0.3);
      col = mix(col, base, 0.35);
      const shade = 1 - 0.4 * Math.pow(Math.abs(Math.sin(lat)), 2.2); // polos más oscuros
      col = [col[0] * shade, col[1] * shade, col[2] * shade];

      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { map: toTexture(c) };
}

/* ── Gigantes gaseosos ───────────────────────────────────── */
const PALETTES = {
  jupiter: [
    [0.00, [92, 58, 34]], [0.18, [176, 122, 74]], [0.36, [232, 210, 176]],
    [0.52, [250, 242, 226]], [0.66, [198, 148, 96]], [0.82, [226, 196, 156]],
    [1.00, [130, 82, 48]]
  ],
  saturn: [
    [0.00, [156, 122, 74]], [0.22, [214, 184, 132]], [0.45, [244, 226, 186]],
    [0.62, [226, 200, 150]], [0.82, [246, 234, 204]], [1.00, [176, 142, 92]]
  ],
  ice: [
    [0.00, [58, 96, 208]], [0.35, [92, 138, 236]], [0.65, [76, 120, 226]],
    [1.00, [44, 74, 186]]
  ]
};

function genGas(def) {
  const { w, h, bands, spot = false, seed = 100 } = def;
  const ice = bands === 'ice';
  const freq = bands === 'jupiter' ? 10.5 : bands === 'saturn' ? 7.5 : 5.5;
  const amp = bands === 'jupiter' ? 1.7 : bands === 'saturn' ? 1.25 : 0.9;
  const stops = PALETTES[bands] || PALETTES.ice;

  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [cx, cy, cz, lat] = sphereCoords(w, h, x, y);
      const turb = fbm3(cx * 2.1, cy * 2.1, cz * 9.0, 4, 2, 0.5, seed) * amp;
      const fine = fbm3(cx * 4.5, cy * 4.5, cz * 20, 3, 2, 0.5, seed + 31) * 0.35;

      const u = lat * freq + turb + fine;
      let band = Math.sin(u) * 0.5 + 0.5;
      band = smoothstep(0.06, 0.94, band);

      let col = ramp(stops, band);
      const shade = 1 - 0.42 * Math.pow(Math.abs(Math.sin(lat)), 2.6);
      col = [col[0] * shade, col[1] * shade, col[2] * shade];

      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const rnd = mulberry32(seed + 7);
  const stamp = (fn) => {
    for (const ox of [-w, 0, w]) fn(ctx, ox);
  };

  if (spot) {
    // Gran Mancha Roja (elipse persistente)
    stamp((g, ox) => {
      const sx = w * 0.68 + ox;
      const sy = h * (0.5 + 0.21);
      const rx = w * 0.062, ry = h * 0.052;
      g.save();
      g.translate(sx, sy); g.rotate(0.06); g.scale(rx / ry, 1);
      const gr = g.createRadialGradient(0, 0, ry * 0.1, 0, 0, ry);
      gr.addColorStop(0, 'rgba(226,138,96,0.98)');
      gr.addColorStop(0.45, 'rgba(196,88,52,0.95)');
      gr.addColorStop(0.8, 'rgba(160,64,42,0.85)');
      gr.addColorStop(1, 'rgba(150,60,40,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, ry, 0, TAU); g.fill();
      g.restore();
    });
  }

  if (ice && def.spots) {
    // Mancha Oscura de Neptuno + estelas claras
    stamp((g, ox) => {
      const sx = w * 0.35 + ox, sy = h * 0.38;
      const rx = w * 0.05, ry = h * 0.06;
      g.save(); g.translate(sx, sy); g.scale(rx / ry, 1);
      const gr = g.createRadialGradient(0, 0, 1, 0, 0, ry);
      gr.addColorStop(0, 'rgba(12,26,84,0.92)');
      gr.addColorStop(0.7, 'rgba(16,34,104,0.7)');
      gr.addColorStop(1, 'rgba(16,34,104,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, ry, 0, TAU); g.fill();
      g.restore();
    });
    for (let k = 0; k < 7; k++) {
      const sx = rnd() * w, sy = h * (0.15 + rnd() * 0.7);
      const rx = w * (0.015 + rnd() * 0.035), ry = h * (0.006 + rnd() * 0.008);
      ctx.save();
      ctx.translate(sx, sy);
      const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
      gr.addColorStop(0, 'rgba(235,244,255,0.75)');
      gr.addColorStop(1, 'rgba(235,244,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  return { map: toTexture(c) };
}

/* ── Capas de nubes (RGBA con alfa) ──────────────────────── */
function genClouds(kind, w, h, seed) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const earth = kind === 'earthClouds';
  const F = earth ? 2.8 : 2.1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [cx, cy, cz, lat] = sphereCoords(w, h, x, y);
      const n = norm01(fbm3(cx * F, cy * F, cz * F * (earth ? 2.4 : 4.2), 5, 2.1, 0.52, seed));
      const det = norm01(fbm3(cx * F * 3, cy * F * 3, cz * F * 6, 4, 2, 0.5, seed + 19));
      const t = n * 0.65 + det * 0.35;

      let a = earth ? smoothstep(0.5, 0.72, t) : smoothstep(0.42, 0.78, t);
      // Venus: banda ecuatorial densa y polos claros
      if (!earth) a *= 0.55 + 0.45 * (1 - Math.abs(Math.sin(lat)));

      const i = (y * w + x) * 4;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = toTexture(c);
  return t;
}

/* ── Anillos ─────────────────────────────────────────────── */
export function makeRingTexture(kind) {
  const w = 1024, h = 8;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const saturn = kind === 'saturn';
  const colA = saturn ? [232, 216, 186] : [150, 168, 190];
  const colB = saturn ? [186, 164, 130] : [96, 110, 132];

  for (let x = 0; x < w; x++) {
    const r = x / w; // 0 = borde interior, 1 = exterior
    let a, tint;

    if (saturn) {
      // estructura: C interior tenue, B brillante, división de Cassini, A con hueco de Encke
      a = 0.16; // C ring
      if (r > 0.22) a = 0.55 + 0.35 * norm01(noise3(r * 90, 0.5, 0.5, 3)); // B ring
      if (r > 0.30 && r < 0.55) a = 0.86 + 0.1 * noise3(r * 160, 3, 3, 9);
      if (r >= 0.60 && r <= 0.68) a = 0.10;                 // división de Cassini
      else if (r > 0.68 && r <= 0.95) a = 0.62 + 0.22 * norm01(noise3(r * 140, 7, 7, 11));
      if (r > 0.945 && r < 0.975) a = 0.06;                 // hendidura de Encke
      else if (r >= 0.975) a = 0.34;
      if (r < 0.05) a *= r / 0.05;                          // borde interior difuso
      if (r > 0.995) a *= (1 - r) / 0.005;
      // estriaciones finas
      a *= 0.82 + 0.18 * norm01(noise3(r * 300, 1.5, 1.5, 21));
      tint = norm01(noise3(r * 60, 2, 2, 5));
    } else {
      // anillos tenues y estrechos de Urano
      a = 0.02;
      const band = (c0, wid, str) => Math.exp(-Math.pow((r - c0) / wid, 2)) * str;
      a += band(0.30, 0.014, 0.85) + band(0.46, 0.010, 0.6) +
           band(0.62, 0.020, 0.75) + band(0.80, 0.012, 0.5) + band(0.90, 0.03, 0.25);
      a *= 0.7 + 0.3 * norm01(noise3(r * 220, 4, 4, 13));
      tint = 0.5;
    }

    const col = mix(colB, colA, tint);
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
      d[i + 3] = clamp01(a) * 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

/* ── Halo del Sol (sprite aditivo) ───────────────────────── */
export function makeGlowTexture(size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half, dy = (y - half) / half;
      const r = Math.hypot(dx, dy);
      const i = (y * size + x) * 4;
      if (r >= 1) { d[i + 3] = 0; continue; }
      const a = Math.pow(1 - r, 2.8);
      const core = Math.pow(1 - r, 6);
      const col = mix([255, 138, 40], [255, 246, 224], core);
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
      d[i + 3] = clamp01(a) * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Punto de estrella (sprite redondo para Points) ──────── */
export function makeStarDotTexture(size = 64) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Retícula de selección ───────────────────────────────── */
export function makeSelectRingTexture() {
  const s = 512;
  const c = canvas(s, s);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(255,220,160,0.9)';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,180,80,0.85)';
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.42, 0, TAU); ctx.stroke();
  // marcas de encuadre
  ctx.lineWidth = 6;
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * TAU + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.42, a0 - 0.16, a0 + 0.16);
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Fondo: Vía Láctea + campo de estrellas (equirect) ───── */
export function makeBackgroundTexture() {
  const w = 2048, h = 1024;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  // normal del plano galáctico (banda inclinada)
  const N = (() => {
    const v = [0.34, 0.16, 0.93];
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  });

  const nebulae = [
    { dir: [0.62, 0.28, 0.73], r: 0.16, col: [86, 60, 150], s: 5 },
    { dir: [-0.5, -0.3, 0.81], r: 0.13, col: [40, 110, 150], s: 9 },
    { dir: [0.1, -0.7, 0.7], r: 0.10, col: [140, 60, 110], s: 13 },
    { dir: [-0.8, 0.45, 0.39], r: 0.12, col: [50, 90, 140], s: 17 }
  ];
  for (const n of nebulae) {
    const l = Math.hypot(n.dir[0], n.dir[1], n.dir[2]);
    n.dir = [n.dir[0] / l, n.dir[1] / l, n.dir[2] / l];
  }

  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    const lat = (0.5 - v) * Math.PI;
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * TAU;
      const cl = Math.cos(lat);
      const px3 = cl * Math.cos(lon), py3 = cl * Math.sin(lon), pz3 = Math.sin(lat);

      // base: azul muy oscuro con leve gradiente
      const vshade = 1 - 0.55 * Math.pow(Math.abs(Math.sin(lat)), 1.5);
      let col = mix([4, 6, 16], [7, 11, 28], 0.5 + 0.5 * Math.sin(v * Math.PI));
      col = [col[0] * vshade, col[1] * vshade, col[2] * vshade];

      // banda de la Vía Láctea
      const dn = Math.abs(px3 * N[0] + py3 * N[1] + pz3 * N[2]);
      const band = Math.exp(-Math.pow(dn / 0.14, 2));
      if (band > 0.003) {
        const cloud = norm01(fbm3(px3 * 5.5, py3 * 5.5, pz3 * 5.5, 5, 2.1, 0.55, 77));
        const dust = norm01(fbm3(px3 * 9 + 40, py3 * 9, pz3 * 9, 4, 2, 0.5, 31));
        let b = band * (0.30 + 0.85 * cloud);
        b *= 1 - 0.72 * smoothstep(0.5, 0.8, dust) * band;
        const core = Math.exp(-Math.pow(dn / 0.06, 2));
        const gal = mix([150, 172, 236], [255, 236, 208], core);
        col = [col[0] + gal[0] * b * 0.55, col[1] + gal[1] * b * 0.55, col[2] + gal[2] * b * 0.62];
      }

      // nebulosas tenues
      for (const n of nebulae) {
        const dot = px3 * n.dir[0] + py3 * n.dir[1] + pz3 * n.dir[2];
        const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (ang < n.r) {
          const fall = Math.pow(1 - ang / n.r, 2);
          const txt = norm01(fbm3(px3 * 14, py3 * 14, pz3 * 14, 4, 2, 0.5, n.s));
          const k = fall * txt * 0.5;
          col = [col[0] + n.col[0] * k, col[1] + n.col[1] * k, col[2] + n.col[2] * k];
        }
      }

      const i = (y * w + x) * 4;
      d[i] = Math.min(255, col[0]);
      d[i + 1] = Math.min(255, col[1]);
      d[i + 2] = Math.min(255, col[2]);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // estrellas encima (más fiables que el ruido por píxel)
  // nítidas y pequeñas: el fondo se amplía ~6× en pantalla
  const rnd = mulberry32(2024);
  const tint = ['#ffffff', '#cfe0ff', '#ffe7c4', '#ffd0a8', '#b9d4ff'];
  for (let k = 0; k < 9000; k++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    const mag = Math.pow(rnd(), 4.2);
    const r = 0.45 + mag * 1.1;
    ctx.globalAlpha = 0.3 + mag * 0.7;
    ctx.fillStyle = tint[(rnd() * tint.length) | 0];
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    if (mag > 0.93) { // destello tenue de las más brillantes
      ctx.globalAlpha = 0.16;
      ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.mapping = EquirectangularReflectionMapping;
  return t;
}

/* ── API pública ─────────────────────────────────────────── */
export function makeBodyTexture(def) {
  const t = def.tex;
  switch (t.kind) {
    case 'rocky': return genRocky(t);
    case 'earth': return genEarth(t);
    case 'venus': return genVenus(t);
    case 'gas': return genGas(t);
    case 'ice': return genGas({ ...t, bands: t.bands || 'ice' });
    default: return genRocky(t);
  }
}

export function makeCloudTexture(cloudDef) {
  return genClouds(cloudDef.kind, 768, 384, cloudDef.kind === 'earthClouds' ? 601 : 602);
}
