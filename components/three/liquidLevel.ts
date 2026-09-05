import { Plane, Vector3, type Object3D } from "three";
import { BODY_HEIGHT, LIQUID_LEVEL_RATIO, TOTAL_HEIGHT } from "./bottleGeometry";

/**
 * Nivo tečnosti kao SVETSKA horizontalna clipping ravan (spec 13 → F). Mesh `Liquid` je puna
 * unutrašnjost stakla (bottleGeometry.ts), a ravan seče sve iznad nivoa — pa kad se bočica
 * nagne, površina ostaje ravna kao prava tečnost, umesto da se naginje sa staklom.
 *
 * Nivo je na 78 % tela, u lokalnom prostoru SPOLJNE grupe bočice (model je u njoj spušten za
 * TOTAL/2 da se okreće oko svog centra — vidi BottleModel.tsx).
 */
export const LIQUID_LEVEL_LOCAL_Y = BODY_HEIGHT * LIQUID_LEVEL_RATIO - TOTAL_HEIGHT / 2;

const point = new Vector3();
const normal = new Vector3();

/**
 * Ravan kroz tačku nivoa: three zadržava pozitivnu stranu normale, pa normala gleda NADOLE
 * (tečnost ispod ostaje, iznad se seče). `slosh` naginje normalu oko z (radijani) —
 * zapljuskivanje. Zove se POSLE `group.updateMatrixWorld(true)` u istom frejmu, inače se
 * ravan računa iz matrice prošlog frejma i površina trza dok se bočica naginje.
 */
export function updateLiquidPlane(plane: Plane, group: Object3D, slosh = 0, levelLocalY = LIQUID_LEVEL_LOCAL_Y): void {
  point.set(0, levelLocalY, 0);
  group.localToWorld(point);
  normal.set(-Math.sin(slosh), -Math.cos(slosh), 0);
  plane.setFromNormalAndCoplanarPoint(normal, point);
}

/**
 * Zapljuskivanje: prigušena opruga (1-DOF) čiji ugao prati ugaonu brzinu bočice — ~1.2 Hz,
 * damping 0.9, najviše ±8° (spec F). Bočica koja se naglo nagne ili zavrti (klik) gurne
 * površinu u suprotnu stranu, pa se ona zaljulja i smiri.
 */
export class SloshSpring {
  angle = 0;
  velocity = 0;
  private readonly omega: number;
  private readonly damping: number;
  private readonly limit: number;
  private readonly gain: number;

  constructor({ hz = 1.2, damping = 0.9, limitDeg = 8, gain = 3 } = {}) {
    this.omega = 2 * Math.PI * hz;
    this.damping = damping;
    this.limit = (limitDeg * Math.PI) / 180;
    this.gain = gain;
  }

  /** `deltaRotation`: promena `rotation.z` bočice od prošlog frejma (rad); `dt` u sekundama. */
  step(dt: number, deltaRotation: number): void {
    if (!(dt > 0)) return;
    // Bočica koja se okreće brzinom ω gura površinu suprotno: dv = −gain · ω · dt = −gain · Δθ.
    this.velocity -= deltaRotation * this.gain;
    const k = this.omega * this.omega;
    const c = 2 * this.damping * this.omega;
    this.velocity += (-k * this.angle - c * this.velocity) * dt;
    this.angle += this.velocity * dt;
    if (this.angle > this.limit) {
      this.angle = this.limit;
      this.velocity = Math.min(0, this.velocity);
    } else if (this.angle < -this.limit) {
      this.angle = -this.limit;
      this.velocity = Math.max(0, this.velocity);
    }
  }

  /** Udar (klik/tap), u rad/s. */
  kick(velocity: number): void {
    this.velocity += velocity;
  }
}
