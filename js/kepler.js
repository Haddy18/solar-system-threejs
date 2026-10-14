/* ═══ Mecánica orbital (Kepler) ══════════════════════════════
 * Resolución de la ecuación de Kepler por Newton-Raphson y
 * transformación perifocal → eclíptica → coordenadas de three.js.
 * Unidades: UA. Eje Y = norte eclíptico (three: +Y arriba).
 */

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
export const SIDEREAL_YEAR_DAYS = 365.2568983;

/** Días transcurridos desde la época J2000 para una fecha (ms) */
export function daysSinceJ2000(ms, j2000) {
  return (ms - j2000) / 86400000;
}

/** Ecuación de Kepler: E - e·sin(E) = M (rad) */
export function solveKepler(M, e) {
  let m = M % TAU;
  if (m > Math.PI) m -= TAU;
  if (m < -Math.PI) m += TAU;

  // aproximación inicial robusta incluso para e altas
  let E = e < 0.8 ? m : Math.PI;
  for (let k = 0; k < 8; k++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const d = f / fp;
    E -= d;
    if (Math.abs(d) < 1e-11) break;
  }
  return E;
}

/** Periodo sidéreo en días (3ª ley de Kepler) */
export function periodDays(a) {
  return SIDEREAL_YEAR_DAYS * Math.pow(a, 1.5);
}

/** Posición orbital a partir de la anomalía media M (rad) */
export function positionFromM(el, M, out) {
  const E = solveKepler(M, el.e);

  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const w = (el.peri - el.node) * DEG;
  const i = el.i * DEG;
  const om = el.node * DEG;
  const cw = Math.cos(w), sw = Math.sin(w);
  const ci = Math.cos(i), si = Math.sin(i);
  const co = Math.cos(om), so = Math.sin(om);

  const X = (co * cw - so * sw * ci) * xv + (-co * sw - so * cw * ci) * yv;
  const Y = (so * cw + co * sw * ci) * xv + (-so * sw + co * cw * ci) * yv;
  const Z = (sw * si) * xv + (cw * si) * yv;

  // eclíptica (X, Y, Z-norte) → three.js (X, Z, −Y)
  out.x = X;
  out.y = Z;
  out.z = -Y;
  return out;
}

/**
 * Posición de un planeta en UA.
 * @param {object} el  elementos orbitales {a,e,i,L,peri,node} en grados
 * @param {number} days días desde J2000
 * @param {{x:number,y:number,z:number}} out destino (coordenadas three.js)
 */
export function planetPositionAU(el, days, out) {
  const M = (el.L - el.peri) * DEG + (days / periodDays(el.a)) * TAU;
  return positionFromM(el, M, out);
}

/** Órbita completa muestreada (Float32Array xyz) en UA */
export function orbitPathAU(el, segments = 512) {
  const arr = new Float32Array(segments * 3);
  const w = (el.peri - el.node) * DEG;
  const i = el.i * DEG;
  const om = el.node * DEG;
  const cw = Math.cos(w), sw = Math.sin(w);
  const ci = Math.cos(i), si = Math.sin(i);
  const co = Math.cos(om), so = Math.sin(om);
  const b = el.a * Math.sqrt(1 - el.e * el.e);

  for (let k = 0; k < segments; k++) {
    const E = (k / segments) * TAU;
    const xv = el.a * (Math.cos(E) - el.e);
    const yv = b * Math.sin(E);

    const X = (co * cw - so * sw * ci) * xv + (-co * sw - so * cw * ci) * yv;
    const Y = (so * cw + co * sw * ci) * xv + (-so * sw + co * cw * ci) * yv;
    const Z = (sw * si) * xv + (cw * si) * yv;

    arr[k * 3] = X;
    arr[k * 3 + 1] = Z;
    arr[k * 3 + 2] = -Y;
  }
  return arr;
}

/**
 * Dirección unitaria de la Luna alrededor de la Tierra (coord. three).
 * Excentricidad 0,0549 e inclinación 5,145° reales; la distancia
 * la decide la escena según el modo.
 */
export function moonDirection(days, out) {
  const M = 124.9 * DEG + (days / 27.321661) * TAU; // fase actual aproximada
  const e = 0.0549;
  const E = solveKepler(M, e);

  const a = 1;
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const i = 5.145 * DEG;
  const w = 0; // simplificación: nodo/peri rotan; basta para el aspecto
  const cw = Math.cos(w), sw = Math.sin(w);
  const ci = Math.cos(i), si = Math.sin(i);

  const X = cw * xv - sw * yv * ci;
  const Y = sw * xv + cw * yv * ci;
  const Z = yv * si + xv * 0;

  out.x = X;
  out.y = Z;
  out.z = -Y;
  const len = Math.hypot(out.x, out.y, out.z) || 1;
  out.x /= len; out.y /= len; out.z /= len;
  return out;
}
