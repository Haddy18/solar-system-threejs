/* ═══ Construcción y animación de la escena ══════════════════
 * Sol, 8 planetas, la Luna, atmósferas, anillos, cinturón de
 * asteroides, cinturón de Kuiper, órbitas keplerianas, etiquetas
 * y estrellas. Todo se coloca cada frame con elementos reales.
 */

import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineLoop,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3
} from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { SUN, PLANETS, MOON, BELT, KUIPER } from './config.js';
import { positionFromM, planetPositionAU, orbitPathAU, moonDirection, periodDays } from './kepler.js';
import {
  makeBodyTexture,
  makeCloudTexture,
  makeRingTexture,
  makeGlowTexture,
  makeSelectRingTexture,
  makeStarDotTexture,
  makeBackgroundTexture
} from './textures.js';
import { createSunMaterial, createAtmosphereMaterial } from './shaders.js';
import { MODES } from './scale.js';
import { mulberry32 } from './noise.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const tmpAU = { x: 0, y: 0, z: 0 };
const tmpDir = { x: 0, y: 0, z: 0 };
const nextTick = () => new Promise((r) => requestAnimationFrame(r));

export class SolarSystem {
  /**
   * @param {Scene} scene
   * @param {{ onSelect:(id:string)=>void }} opts
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.onSelect = opts.onSelect || (() => {});
    this.mode = MODES.visual;
    this.bodies = new Map();
    this.pickMeshes = [];
    this.orbitLines = [];
    this.enabled = { orbits: true, labels: true, belt: true, clouds: true };
    this.selectedId = null;

    this._m4 = new Matrix4();
    this._q = new Quaternion();
    this._v = new Vector3();
    this._s = new Vector3();
    this._col = new Color();
  }

  /* ── construcción ─────────────────────────────────────── */
  async build(onProgress = () => {}) {
    const steps = 4 + PLANETS.length + 2;
    let step = 0;
    const tick = async (msg) => {
      step++;
      onProgress(step / steps, msg);
      await nextTick();
    };

    await tick('Fondo estelar…');
    this._buildBackground();
    await tick('Luz del Sol…');
    this._buildSun();

    for (const def of PLANETS) {
      await tick(`Generando textura · ${def.name}…`);
      this._buildPlanet(def);
    }

    await tick('La Luna…');
    this._buildMoon();

    await tick('Cinturón de asteroides…');
    this._buildBelt();
    await tick('Cinturón de Kuiper…');
    this._buildKuiper();

    this.setMode(this.mode);
    onProgress(1, 'Listo');
  }

  _buildBackground() {
    const bg = makeBackgroundTexture();
    this.scene.background = bg;

    // estrellas en puntos (paralaje fino al alejarse)
    const N = 6500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const rnd = mulberry32(9001);
    const palette = [
      [1, 1, 1], [0.8, 0.88, 1], [1, 0.9, 0.76], [1, 0.8, 0.66], [0.72, 0.83, 1]
    ];
    for (let i = 0; i < N; i++) {
      // reparto uniforme en la esfera
      const u = rnd() * 2 - 1;
      const th = rnd() * TAU;
      const r = Math.sqrt(1 - u * u);
      pos[i * 3] = r * Math.cos(th);
      pos[i * 3 + 1] = u;
      pos[i * 3 + 2] = r * Math.sin(th);

      const p = palette[(rnd() * palette.length) | 0];
      const b = 0.45 + Math.pow(rnd(), 2) * 0.55;
      col[i * 3] = p[0] * b;
      col[i * 3 + 1] = p[1] * b;
      col[i * 3 + 2] = p[2] * b;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    const mat = new PointsMaterial({
      size: 2.1,
      sizeAttenuation: false,
      vertexColors: true,
      map: makeStarDotTexture(),
      alphaTest: 0.08,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    this.stars = new Points(geo, mat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // luz de relleno (caras nocturnas apenas visibles)
    this.scene.add(new AmbientLight(0x5a6a95, 1.4));
  }

  _buildSun() {
    const group = new Group();
    group.position.set(0, 0, 0);

    const mesh = new Mesh(
      new SphereGeometry(1, 96, 64),
      createSunMaterial(1.6)
    );
    group.add(mesh);

    // cáscara de corona + halos
    const corona1 = new Mesh(
      new SphereGeometry(1.14, 64, 48),
      createAtmosphereMaterial(0xffb257, 2.6, 2.4)
    );
    corona1.material.side = BackSide;
    const corona2 = new Mesh(
      new SphereGeometry(1.42, 64, 48),
      createAtmosphereMaterial(0xff7a2a, 3.4, 1.5)
    );
    corona2.material.side = BackSide;
    group.add(corona1, corona2);

    const glowTex = makeGlowTexture();
    const halo1 = new Sprite(new SpriteMaterial({
      map: glowTex, blending: AdditiveBlending, transparent: true,
      depthWrite: false, opacity: 0.95, toneMapped: false
    }));
    halo1.scale.setScalar(4.2);
    const halo2 = new Sprite(new SpriteMaterial({
      map: glowTex, blending: AdditiveBlending, transparent: true,
      depthWrite: false, opacity: 0.45, toneMapped: false
    }));
    halo2.scale.setScalar(11);
    group.add(halo1, halo2);

    // luz que ilumina a todo el sistema (sin caída: escala de escena variable)
    const light = new PointLight(0xfff4e2, 2.6, 0, 0);
    group.add(light);

    const body = this._register({
      def: SUN, group, mesh,
      orbitLine: null,
      spinPeriodDays: SUN.rotationHours / 24
    });
    body.halo1 = halo1;
    body.halo2 = halo2;
    this.scene.add(group);
  }

  _buildPlanet(def) {
    const group = new Group();
    const tiltGroup = new Group();
    tiltGroup.rotation.z = def.tiltDeg * DEG;
    group.add(tiltGroup);

    const tex = makeBodyTexture(def);
    const matOpts = {
      map: tex.map,
      roughness: def.tex.kind === 'gas' || def.tex.kind === 'ice' ? 1.0 : 0.92,
      metalness: 0.0
    };
    if (tex.bumpMap) {
      matOpts.bumpMap = tex.bumpMap;
      matOpts.bumpScale = 0.03;
    }
    if (tex.roughnessMap) {
      matOpts.roughnessMap = tex.roughnessMap;
      matOpts.roughness = 1.0;
    }
    const mesh = new Mesh(
      new SphereGeometry(1, def.radiusKm > 4000 ? 96 : 64, def.radiusKm > 4000 ? 64 : 40),
      new MeshStandardMaterial(matOpts)
    );
    tiltGroup.add(mesh);

    // nubes
    let clouds = null;
    if (def.clouds) {
      const ctex = makeCloudTexture(def.clouds);
      clouds = new Mesh(
        new SphereGeometry(1.014, 64, 44),
        new MeshStandardMaterial({
          map: ctex,
          transparent: true,
          opacity: def.clouds.opacity,
          roughness: 1,
          metalness: 0,
          depthWrite: false
        })
      );
      clouds.userData.speed = def.clouds.speed;
      tiltGroup.add(clouds);
    }

    // atmósfera
    if (def.atmosphere) {
      const atmo = new Mesh(
        new SphereGeometry(1.05, 64, 44),
        createAtmosphereMaterial(def.atmosphere.color, def.atmosphere.power, def.atmosphere.intensity)
      );
      tiltGroup.add(atmo);
    }

    // anillos
    let rings = null;
    if (def.rings) {
      rings = this._makeRings(def.rings);
      tiltGroup.add(rings);
    }

    const body = this._register({
      def, group, mesh, clouds, rings,
      el: def.el,
      spinPeriodDays: def.rotationHours / 24
    });

    // línea de órbita (escala con el modo)
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(orbitPathAU(def.el, 512), 3));
    const line = new LineLoop(geo, new LineBasicMaterial({
      color: new Color(def.color).lerp(new Color(0xffffff), 0.25),
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    }));
    line.frustumCulled = false;
    this.scene.add(line);
    this.orbitLines.push(line);
    body.orbitLine = line;

    this.scene.add(group);
  }

  _makeRings(kind) {
    const saturn = kind === 'saturn';
    const inner = saturn ? 1.26 : 1.62;
    const outer = saturn ? 2.32 : 1.95;
    const geo = new RingGeometry(inner, outer, 220, 1);

    // UV radial: u = fracción del radio (la textura es horizontal)
    const pos = geo.getAttribute('position');
    const arr = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const d = Math.hypot(x, y);
      arr[i * 2] = (d - inner) / (outer - inner);
      arr[i * 2 + 1] = 0.5;
    }
    geo.setAttribute('uv', new BufferAttribute(arr, 2));

    const mat = new MeshBasicMaterial({
      map: makeRingTexture(kind),
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
      opacity: saturn ? 0.98 : 0.75
    });
    const mesh = new Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  _buildMoon() {
    const group = new Group();

    const tex = makeBodyTexture(MOON);
    const mesh = new Mesh(
      new SphereGeometry(1, 48, 32),
      new MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap,
        bumpScale: 0.03,
        roughness: 0.95,
        metalness: 0
      })
    );
    group.add(mesh);

    const body = this._register({
      def: MOON, group, mesh,
      el: null,
      parent: 'tierra',
      spinPeriodDays: MOON.rotationHours / 24
    });
    this.moon = body;
    this.scene.add(group);
  }

  _buildBelt() {
    const count = BELT.count;
    const geo = new IcosahedronGeometry(1, 0);
    const mat = new MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true });
    const mesh = new InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;

    const rnd = mulberry32(4242);
    const rocks = [];
    for (let i = 0; i < count; i++) {
      const a = BELT.inner + Math.pow(rnd(), 0.85) * (BELT.outer - BELT.inner);
      const e = rnd() * 0.14;
      const inc = Math.pow(rnd(), 2) * 9;
      const node = rnd() * 360;
      const peri = rnd() * 360;
      const rot = new Quaternion().setFromEuler(
        new Euler(rnd() * TAU, rnd() * TAU, rnd() * TAU, 'XYZ')
      );
      rocks.push({
        el: { a, e, i: inc, L: peri, peri, node },
        M0: rnd() * TAU,
        period: periodDays(a),
        sizeVis: 0.06 + Math.pow(rnd(), 2.6) * 0.5,
        sizeKm: 0.4 + Math.pow(rnd(), 3) * 26,
        rot,
        shade: 0.6 + rnd() * 0.55
      });
      const g = 0.55 + rnd() * 0.35;
      mesh.setColorAt(i, this._col.setRGB(g, g * (0.92 + rnd() * 0.1), g * (0.84 + rnd() * 0.16)));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    this.belt = { mesh, rocks };
    this.scene.add(mesh);
  }

  _buildKuiper() {
    const count = KUIPER.count;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rnd = mulberry32(777);
    const items = [];
    for (let i = 0; i < count; i++) {
      const a = KUIPER.inner + Math.pow(rnd(), 1.15) * (KUIPER.outer - KUIPER.inner);
      const e = rnd() * 0.12;
      const inc = Math.pow(rnd(), 1.6) * 18;
      const peri = rnd() * 360;
      items.push({
        el: { a, e, i: inc, L: peri, peri, node: rnd() * 360 },
        M0: rnd() * TAU,
        period: periodDays(a)
      });
      const b = 0.5 + rnd() * 0.5;
      col[i * 3] = 0.62 * b + 0.1;
      col[i * 3 + 1] = 0.78 * b + 0.08;
      col[i * 3 + 2] = b;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 3));
    const mat = new PointsMaterial({
      size: 2.4,
      sizeAttenuation: false,
      vertexColors: true,
      map: makeStarDotTexture(),
      alphaTest: 0.08,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    const points = new Points(geo, mat);
    points.frustumCulled = false;
    this.kuiper = { points, items };
    this.scene.add(points);
  }

  /* ── registro común de un cuerpo ──────────────────────── */
  _register({ def, group, mesh, clouds = null, rings = null, el = null, parent = null, spinPeriodDays }) {
    const id = def.id;

    // esfera de clic generosa (invisible pero detectable)
    const pick = new Mesh(
      new SphereGeometry(1.9, 12, 8),
      new MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 })
    );
    pick.userData.bodyId = id;
    group.add(pick);

    // etiqueta
    const el2 = document.createElement('div');
    el2.className = 'label';
    el2.textContent = def.name;
    el2.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.onSelect(id);
    });
    const label = new CSS2DObject(el2);
    label.position.set(0, 2.1, 0);
    group.add(label);

    // retícula de selección
    const ring = new Sprite(new SpriteMaterial({
      map: makeSelectRingTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.8,
      toneMapped: false
    }));
    ring.scale.setScalar(3.4);
    ring.visible = false;
    group.add(ring);

    const body = {
      def, id, group, mesh, clouds, rings, el, parent, label, pick, ring,
      spinPeriodDays,
      pos: new Vector3(),
      radiusUnits: 1
    };
    group.userData.bodyId = id;
    mesh.userData.bodyId = id;

    this.bodies.set(id, body);
    this.pickMeshes.push(pick, mesh);
    return body;
  }

  /* ── modos y conmutadores ─────────────────────────────── */
  setMode(mode) {
    this.mode = mode;
    const df = mode.distFactor;

    for (const b of this.bodies.values()) {
      const r = mode.radius(b.def.radiusKm);
      b.radiusUnits = r;
      b.group.scale.setScalar(r);
      b.label.position.y = 2.1;
      b.ring?.scale.setScalar(3.4);
      if (b.orbitLine) b.orbitLine.scale.setScalar(df);
    }

    // la Luna: órbita en radios terrestres (la Tierra mide 1 u en ambos modos)
    if (this.moon) {
      const earth = this.bodies.get('tierra');
      this.moon._localOrbit = mode.moonAU * df / (earth ? earth.radiusUnits : 1);
      this.moon._localScale = mode.radius(MOON.radiusKm) / (earth ? earth.radiusUnits : 1);
    }

    if (this.stars) this.stars.scale.setScalar(mode.starRadius);
    if (this.belt) this.belt.mesh.userData.modeId = mode.id;
    this.applyToggles();
  }

  setToggle(name, value) {
    this.enabled[name] = value;
    this.applyToggles();
  }

  applyToggles() {
    const { orbits, labels, belt, clouds } = this.enabled;
    for (const line of this.orbitLines) line.visible = orbits;
    for (const b of this.bodies.values()) {
      b.label.visible = labels; // el renderer CSS2D gestiona el display
      if (b.clouds) b.clouds.visible = clouds;
    }
    if (this.belt) this.belt.mesh.visible = belt;
    if (this.kuiper) this.kuiper.points.visible = belt;
  }

  setSelected(id) {
    this.selectedId = id;
    for (const b of this.bodies.values()) {
      const sel = b.id === id;
      b.ring.visible = sel;
      b.label.element.classList.toggle('sel', sel);
      if (b.orbitLine) {
        b.orbitLine.material.opacity = sel ? 0.85 : 0.3;
        b.orbitLine.material.color.set(sel ? 0xffc46b : b.def.color);
        if (sel) {
          b.orbitLine.material.color.lerp(new Color(0xffffff), 0.2);
        }
      }
    }
  }

  /* ── animación ────────────────────────────────────────── */
  update(days) {
    const df = this.mode.distFactor;

    for (const b of this.bodies.values()) {
      if (b.id === 'sol') {
        b.pos.set(0, 0, 0);
      } else if (b.el) {
        planetPositionAU(b.el, days, tmpAU);
        b.pos.set(tmpAU.x * df, tmpAU.y * df, tmpAU.z * df);
      } else if (b.parent) {
        const p = this.bodies.get(b.parent);
        if (p) {
          moonDirection(days, tmpDir);
          const orbit = this.moon._localOrbit * (p.radiusUnits || 1);
          // posición relativa en unidades de escena (directa, sin pasar por group)
          b.pos.set(
            p.pos.x + tmpDir.x * orbit,
            p.pos.y + tmpDir.y * orbit,
            p.pos.z + tmpDir.z * orbit
          );
          b.group.scale.setScalar(this.moon._localScale || 1);
        }
      }
      b.group.position.copy(b.pos);

      // rotación sobre el eje propio
      if (b.spinPeriodDays) {
        b.mesh.rotation.y = (days / b.spinPeriodDays) * TAU;
        if (b.clouds) {
          b.clouds.rotation.y = b.mesh.rotation.y * (1 + 0.06 * (b.clouds.userData.speed || 1));
        }
      }
    }

    this._updateBelt(days);
    this._updateKuiper(days);
  }

  _updateBelt(days) {
    const belt = this.belt;
    if (!belt || !belt.mesh.visible) return;
    const df = this.mode.distFactor;
    const real = this.mode.id === 'real';
    const m4 = this._m4;
    const v = this._v;
    const s = this._s;
    const q = this._q;

    for (let i = 0; i < belt.rocks.length; i++) {
      const r = belt.rocks[i];
      positionFromM(r.el, r.M0 + (days / r.period) * TAU, tmpAU);
      v.set(tmpAU.x * df, tmpAU.y * df, tmpAU.z * df);

      const scale = real ? this.mode.radius(r.sizeKm) : r.sizeVis;
      s.setScalar(scale * r.shade);
      m4.compose(v, r.rot, s);
      belt.mesh.setMatrixAt(i, m4);
    }
    belt.mesh.instanceMatrix.needsUpdate = true;
  }

  _updateKuiper(days) {
    const k = this.kuiper;
    if (!k || !k.points.visible) return;
    const df = this.mode.distFactor;
    const attr = k.points.geometry.getAttribute('position');
    const arr = attr.array;

    for (let i = 0; i < k.items.length; i++) {
      const it = k.items[i];
      positionFromM(it.el, it.M0 + (days / it.period) * TAU, tmpAU);
      arr[i * 3] = tmpAU.x * df;
      arr[i * 3 + 1] = tmpAU.y * df;
      arr[i * 3 + 2] = tmpAU.z * df;
    }
    attr.needsUpdate = true;
  }

  /* ── picking ──────────────────────────────────────────── */
  raycast(ndcX, ndcY, camera) {
    const rc = new Raycaster();
    rc.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hits = rc.intersectObjects(this.pickMeshes, false);
    for (const h of hits) {
      const id = h.object.userData.bodyId;
      if (id) return id;
    }
    return null;
  }

  /** posición mundial de un cuerpo (para la cámara) */
  worldPos(id, out = new Vector3()) {
    const b = this.bodies.get(id);
    if (!b) return out.set(0, 0, 0);
    return out.copy(b.group.position);
  }

  radiusOf(id) {
    const b = this.bodies.get(id);
    return b ? b.radiusUnits : 1;
  }

  get(id) {
    return this.bodies.get(id);
  }
}
