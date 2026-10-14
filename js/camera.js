/* ═══ Cámara: vuelos, enfoque y seguimiento ══════════════════
 *  · flyTo   → interpola cámara + objetivo hasta un cuerpo
 *              (el destino se recalcula cada frame: el planeta
 *              sigue moviéndose durante el vuelo).
 *  · follow  → traslada cámara y objetivo con el cuerpo para
 *              poder orbitarlo libremente a su alrededor.
 */

import { Vector3 } from 'three';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.followId = null;
    this.flying = false;

    this._fly = null;
    this._onDone = null;
    this._startCam = new Vector3();
    this._startTarget = new Vector3();
    this._target = new Vector3();
    this._camPos = new Vector3();
    this._lastFollow = new Vector3();
  }

  get busy() {
    return this.flying;
  }

  /**
   * Vuela hasta un cuerpo.
   * @param {{ id:string, getPos:()=>Vector3, offset:Vector3 }} ref
   * @param {number} duration segundos
   * @param {() => void} [onDone]
   */
  flyTo(ref, duration = 1.6, onDone = null) {
    this._fly = {
      ref,
      t: 0,
      dur: Math.max(0.05, duration)
    };
    this._startCam.copy(this.camera.position);
    this._startTarget.copy(this.controls.target);
    this._onDone = onDone;
    this.flying = true;
    this.controls.enabled = false;
    this.followId = null;
  }

  /** Cancela vuelo y seguimiento (sin mover la cámara) */
  cancel() {
    this._fly = null;
    this.flying = false;
    this.controls.enabled = true;
    this.followId = null;
  }

  /** Empieza a seguir un cuerpo (o null para dejar de) */
  setFollow(id) {
    if (!id) {
      this.followId = null;
      return;
    }
    this.followId = id;
    this._lastFollow.copy(this.controls.target);
  }

  /**
   * @param {number} dt segundos
   * @param {(id:string) => Vector3} getPos posición viva del cuerpo
   */
  update(dt, getPos) {
    if (this._fly) {
      const f = this._fly;
      f.t += dt / f.dur;

      const pos = getPos(f.ref.id);
      this._target.copy(pos);
      this._camPos.copy(pos).add(f.ref.offset);

      const k = easeInOut(Math.min(1, f.t));
      this.camera.position.lerpVectors(this._startCam, this._camPos, k);
      this.controls.target.lerpVectors(this._startTarget, this._target, k);

      if (f.t >= 1) {
        this._fly = null;
        this.flying = false;
        this.controls.enabled = true;
        this._lastFollow.copy(this._target);
        const cb = this._onDone;
        this._onDone = null;
        if (cb) cb();
      }
      return;
    }

    if (this.followId) {
      const pos = getPos(this.followId);
      // el cuerpo se desplazó desde el frame anterior
      const dx = pos.x - this._lastFollow.x;
      const dy = pos.y - this._lastFollow.y;
      const dz = pos.z - this._lastFollow.z;
      this.camera.position.x += dx;
      this.camera.position.y += dy;
      this.camera.position.z += dz;
      this.controls.target.copy(pos);
      this._lastFollow.copy(pos);
    }
  }
}
