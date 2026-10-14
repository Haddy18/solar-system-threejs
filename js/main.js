/* ═══ Sistema Solar · Three.js — punto de entrada ════════════
 * Monta renderer + bloom + etiquetas, gestiona selección,
 * cámara, tiempo, modos de escala, atajos de teclado y bucle.
 */

import {
  ACESFilmicToneMapping,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ALL_BODIES, J2000_MS } from './config.js';
import { daysSinceJ2000 } from './kepler.js';
import { REAL, VISUAL } from './scale.js';
import { SolarSystem } from './solar.js';
import { CameraRig } from './camera.js';
import { UI, sliderToDps } from './ui.js';

/* ── estado ──────────────────────────────────────────────── */
const state = {
  playing: true,
  dps: 10,
  days: daysSinceJ2000(Date.now(), J2000_MS),
  selected: null,
  follow: true,
  mode: VISUAL,
  bloom: true,
  lastInteract: performance.now()
};

const QUICK_IDS = [
  'sol', 'mercurio', 'venus', 'tierra', 'marte',
  'jupiter', 'saturno', 'urano', 'neptuno'
];

const FLY_SECONDS = 1.8;
const OVERVIEW = new Vector3(0, 260, 820);

const _v1 = new Vector3();
const _dir = new Vector3();

/* ── helpers de cámara ───────────────────────────────────── */
function currentDir(out = _dir) {
  out.subVectors(camera.position, controls.target);
  if (out.lengthSq() < 1e-12) out.set(1, 0.4, 1);
  out.normalize();
  if (Math.abs(out.y) < 0.18) {
    out.y = out.y >= 0 ? 0.3 : -0.3;
    out.normalize();
  }
  return out;
}

function focusDistance(id) {
  const r = solar.radiusOf(id);
  return r * (id === 'sol' ? 4.6 : 6.5);
}

function applyZoomLimits() {
  const mode = state.mode;
  controls.minDistance = state.selected
    ? Math.max(mode.camMin, solar.radiusOf(state.selected) * 1.45)
    : mode.camMin;
  controls.maxDistance = mode.camMax;
}

/* ── elementos ───────────────────────────────────────────── */
const canvas = document.getElementById('scene');
const labelsHost = document.getElementById('labels');

/* ── motor ───────────────────────────────────────────────── */
let renderer, composer, bloomPass, labelRenderer, scene, camera, controls, solar, rig;

function setupEngine() {
  renderer = new WebGLRenderer({ canvas, antialias: true, logDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new Scene();

  camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 1e7);
  camera.position.copy(OVERVIEW);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.7;
  controls.minDistance = VISUAL.camMin;
  controls.maxDistance = VISUAL.camMax;
  if ('zoomToCursor' in controls) controls.zoomToCursor = true;
  controls.update();

  labelRenderer = new CSS2DRenderer({ element: labelsHost });
  labelRenderer.setSize(window.innerWidth, window.innerHeight);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new Vector2(window.innerWidth, window.innerHeight),
    0.62, 0.45, 1.05
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

/* ── UI ──────────────────────────────────────────────────── */
let ui;

function applyToggle(name, value) {
  if (name === 'bloom') {
    state.bloom = value;
    bloomPass.enabled = value;
  } else {
    solar.setToggle(name, value);
  }
}

function setMode(real) {
  state.mode = real ? REAL : VISUAL;
  ui.setModeBadge(real);
  if (rig.busy) rig.cancel();
  solar.setMode(state.mode);
  applyZoomLimits();

  const k = state.mode.distFactor / VISUAL.distFactor;
  if (state.selected) {
    const pos = solar.worldPos(state.selected, _v1);
    const dir = currentDir();
    controls.target.copy(pos);
    camera.position.copy(pos).addScaledVector(dir, focusDistance(state.selected));
    if (state.follow) rig.setFollow(state.selected);
  } else {
    camera.position.set(OVERVIEW.x * k, OVERVIEW.y * k, OVERVIEW.z * k);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

function togglePlay() {
  state.playing = !state.playing;
  ui.setPlaying(state.playing);
}

function toggleFollow() {
  if (!state.selected) return;
  state.follow = !state.follow;
  ui.setFollow(state.follow);
  rig.setFollow(state.follow ? state.selected : null);
}

function select(id, instant = false) {
  const def = ALL_BODIES.find((b) => b.id === id);
  if (!def) return;

  const same = state.selected === id;
  state.selected = id;
  state.follow = true;

  solar.setSelected(id);
  ui.setSelected(id);
  ui.showInfo(def);
  ui.setFollow(true);
  applyZoomLimits();
  ui.hideHint();

  const offset = currentDir(new Vector3()).multiplyScalar(focusDistance(id));
  if (instant) {
    const pos = solar.worldPos(id, _v1);
    controls.target.copy(pos);
    camera.position.copy(pos).add(offset);
    controls.update();
    rig.setFollow(id);
  } else {
    const dur = same ? 1.2 : FLY_SECONDS;
    rig.flyTo({ id, getPos: () => solar.worldPos(id, _v1), offset }, dur, () => {
      if (state.selected === id && state.follow) rig.setFollow(id);
    });
  }
}

function deselect() {
  if (!state.selected) return;
  state.selected = null;
  rig.cancel();
  solar.setSelected(null);
  ui.setSelected(null);
  ui.hideInfo();
  applyZoomLimits();
}

function recenter() {
  if (state.selected) select(state.selected);
}

/* ── picking ─────────────────────────────────────────────── */
function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  return solar.raycast(x, y, camera);
}

/* ── arranque ────────────────────────────────────────────── */
async function start() {
  ui = new UI({
    onPlay: togglePlay,
    onSpeed: (dps) => { state.dps = dps; },
    onToday: () => { state.days = daysSinceJ2000(Date.now(), J2000_MS); },
    onSelect: (id) => (id === state.selected ? recenter() : select(id)),
    onToggle: applyToggle,
    onMode: setMode,
    onFollow: toggleFollow,
    onRecenter: recenter,
    onDeselect: deselect
  });
  ui.setPlaying(true);
  ui.setSpeed(state.dps);
  ui.setDate(J2000_MS + state.days * 86400000);
  ui.setModeBadge(false);

  ui.setProgress(0.02, 'Preparando el motor…');
  setupEngine();

  rig = new CameraRig(camera, controls);
  solar = new SolarSystem(scene, { onSelect: (id) => select(id) });

  await solar.build((p, msg) => ui.setProgress(p, msg));

  bindPointer();
  bindKeys();
  bindResize();
  bindVisibility();

  ui.hideLoading();
  ui.hint.classList.remove('hidden');
  setTimeout(() => ui.hideHint(), 7000);

  // enlaces directos: /?instant=1&real=1#tierra
  const search = new URLSearchParams(location.search);
  if (search.get('real') === '1') {
    document.getElementById('tg-real').checked = true;
    setMode(true);
  }
  const hash = location.hash.replace('#', '');
  if (hash && ALL_BODIES.some((b) => b.id === hash)) {
    select(hash, search.get('instant') === '1');
  }

  requestAnimationFrame(tick);
}

/* ── eventos ─────────────────────────────────────────────── */
function bindPointer() {
  let downAt = null;

  canvas.addEventListener('pointerdown', (e) => {
    downAt = [e.clientX, e.clientY];
    state.lastInteract = performance.now();
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const dx = e.clientX - downAt[0];
    const dy = e.clientY - downAt[1];
    downAt = null;
    if (dx * dx + dy * dy > 36) return; // era un arrastre
    const id = pickAt(e.clientX, e.clientY);
    if (id) select(id);
    else deselect();
  });

  let lastHover = 0;
  canvas.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    const id = pickAt(e.clientX, e.clientY);
    canvas.style.cursor = id ? 'pointer' : 'grab';
  });

  canvas.addEventListener('wheel', () => { state.lastInteract = performance.now(); }, { passive: true });
}

function bumpSpeed(dir) {
  const v = MathUtils.clamp(+ui.speed.value + dir * 4, 0, 100);
  const dps = sliderToDps(v);
  state.dps = dps;
  ui.setSpeed(dps);
}

function flipToggle(id, name) {
  const el = document.getElementById(id);
  el.checked = !el.checked;
  applyToggle(name, el.checked);
}

function bindKeys() {
  window.addEventListener('keydown', (e) => {
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'INPUT') &&
        (e.code === 'Space' || e.code === 'Enter')) {
      ae.blur();
    }
    state.lastInteract = performance.now();

    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); bumpSpeed(+1); return; }
    if (e.code === 'ArrowLeft') { e.preventDefault(); bumpSpeed(-1); return; }
    if (e.code === 'Escape') { deselect(); ui.toggleHelp(false); return; }
    if (e.code === 'KeyF') { toggleFollow(); return; }
    if (e.code === 'KeyO') { flipToggle('tg-orbits', 'orbits'); return; }
    if (e.code === 'KeyL') { flipToggle('tg-labels', 'labels'); return; }
    if (e.code === 'KeyR') {
      const el = document.getElementById('tg-real');
      el.checked = !el.checked;
      setMode(el.checked);
      return;
    }
    if (e.code === 'Slash' && e.shiftKey) { ui.toggleHelp(); return; }
    if (e.code === 'KeyH') { ui.toggleHelp(); return; }

    const m = /^Digit([1-9])$/.exec(e.code);
    if (m) {
      const id = QUICK_IDS[+m[1] - 1];
      if (id) select(id);
    }
  });
}

function bindResize() {
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labelRenderer.setSize(w, h);
  });
}

function bindVisibility() {
  document.addEventListener('visibilitychange', () => {
    // evita un salto enorme de tiempo al volver de otra pestaña
    lastFrame = performance.now();
  });
}

/* ── bucle ───────────────────────────────────────────────── */
let lastFrame = performance.now();
let lastDateUI = 0;

function tick() {
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  if (state.playing) state.days += dt * state.dps;

  solar.update(state.days);
  rig.update(dt, (id) => solar.worldPos(id, _v1));

  controls.autoRotate =
    !state.selected &&
    !rig.busy &&
    now - state.lastInteract > 7000;
  controls.autoRotateSpeed = 0.22;
  controls.update();

  if (now - lastDateUI > 250) {
    ui.setDate(J2000_MS + state.days * 86400000);
    lastDateUI = now;
  }

  composer.render();
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ── GO ──────────────────────────────────────────────────── */
start().catch((err) => {
  console.error(err);
  const msg = err && /WebGL|webgl/i.test(String(err))
    ? 'Tu navegador no soporta WebGL.'
    : `Error al iniciar: ${err && err.message ? err.message : err}`;
  if (ui) ui.showFatal(msg);
  else {
    const el = document.getElementById('loading-msg');
    if (el) el.textContent = msg;
  }
});
