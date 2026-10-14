/* ═══ Modos de escala ════════════════════════════════════════
 * visual: distancias comprimidas (100 u/UA) y radios con raíz
 *         cuadrada → todo se ve, aunque no es literal.
 * real:   1 unidad = 1 radio terrestre y distancias reales;
 *         la verdad del enorme vacío que hay entre planetas.
 */

import { AU_KM, EARTH_RADIUS_KM, MOON_DISTANCE_AU } from './config.js';

const VIS_K = 1 / Math.sqrt(EARTH_RADIUS_KM); // Tierra → 1 unidad

export const MODES = {
  visual: {
    id: 'visual',
    label: 'escala visual',
    /** unidades de escena por UA */
    distFactor: 100,
    /** radio de la esfera de estrellas (unidades) */
    starRadius: 60000,
    /** radio de un cuerpo de `radiusKm` km (unidades) */
    radius: (km) => VIS_K * Math.sqrt(km),
    /** distancia de la Luna a la Tierra (UA) */
    moonAU: 0.045,
    camMin: 0.06,
    camMax: 250000
  },
  real: {
    id: 'real',
    label: 'escala real',
    distFactor: AU_KM / EARTH_RADIUS_KM, // ≈ 23.479 u/UA
    starRadius: 3000000,
    radius: (km) => km / EARTH_RADIUS_KM,
    moonAU: MOON_DISTANCE_AU,
    camMin: 0.01,
    camMax: 6000000
  }
};

export const VISUAL = MODES.visual;
export const REAL = MODES.real;

export function getMode(id) {
  return MODES[id] || MODES.visual;
}
