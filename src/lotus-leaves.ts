import * as THREE from "three";
import {
  CANVAS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LOTUS,
  LOTUS_FLOWERS,
  LOTUS_LEAVES,
  viewportPoint,
} from "./config";

interface Point {
  x: number;
  y: number;
}

interface LeafPalette {
  base: THREE.Color;
  light: THREE.Color;
  shade: THREE.Color;
  vein: THREE.Color;
  center: THREE.Color;
}

interface FlowerPalette {
  outerPetal: THREE.Color;
  innerPetal: THREE.Color;
  petalLight: THREE.Color;
  center: THREE.Color;
  centerDark: THREE.Color;
}

const TAU = Math.PI * 2;
const DEFAULT_COLOR = new THREE.Color(0xffffff);

const PALETTES: readonly LeafPalette[] = LOTUS.leafPalettes.map((palette) => ({
  base: new THREE.Color(palette.base),
  light: new THREE.Color(palette.light),
  shade: new THREE.Color(palette.shade),
  vein: new THREE.Color(palette.vein),
  center: new THREE.Color(palette.center),
}));

const FLOWER_PALETTES: readonly FlowerPalette[] = LOTUS.flowerPalettes.map(
  (palette) => ({
    outerPetal: new THREE.Color(palette.outerPetal),
    innerPetal: new THREE.Color(palette.innerPetal),
    petalLight: new THREE.Color(palette.petalLight),
    center: new THREE.Color(palette.center),
    centerDark: new THREE.Color(palette.centerDark),
  }),
);

class LotusGeometryBatch {
  private readonly positions: Float32Array;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly colors?: Float32Array;
  private readonly colorAttribute?: THREE.BufferAttribute;
  private cursor = 0;

  public constructor(
    geometry: THREE.BufferGeometry,
    capacity: number,
    includeColors: boolean,
  ) {
    this.positions = new Float32Array(capacity);
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", this.positionAttribute);
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, 0),
      Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT),
    );

    if (includeColors) {
      this.colors = new Float32Array(capacity);
      this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
      this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("color", this.colorAttribute);
    }
  }

  public reset(): void {
    this.cursor = 0;
  }

  public point(point: Point, color: THREE.Color = DEFAULT_COLOR): void {
    if (this.cursor + 3 > this.positions.length) return;
    this.positions[this.cursor] = point.x;
    this.positions[this.cursor + 1] = point.y;
    this.positions[this.cursor + 2] = 0;
    if (this.colors) {
      this.colors[this.cursor] = color.r;
      this.colors[this.cursor + 1] = color.g;
      this.colors[this.cursor + 2] = color.b;
    }
    this.cursor += 3;
  }

  public triangle(
    a: Point,
    b: Point,
    c: Point,
    color: THREE.Color = DEFAULT_COLOR,
  ): void {
    this.point(a, color);
    this.point(b, color);
    this.point(c, color);
  }

  public triangleColors(
    a: Point,
    b: Point,
    c: Point,
    colorA: THREE.Color,
    colorB: THREE.Color,
    colorC: THREE.Color,
  ): void {
    this.point(a, colorA);
    this.point(b, colorB);
    this.point(c, colorC);
  }

  public line(a: Point, b: Point, color: THREE.Color): void {
    this.point(a, color);
    this.point(b, color);
  }

  public circle(center: Point, radius: number, color: THREE.Color): void {
    for (let index = 0; index < 8; index += 1) {
      const angleA = (index / 8) * TAU;
      const angleB = ((index + 1) / 8) * TAU;
      this.triangle(
        center,
        {
          x: center.x + Math.cos(angleA) * radius,
          y: center.y + Math.sin(angleA) * radius,
        },
        {
          x: center.x + Math.cos(angleB) * radius,
          y: center.y + Math.sin(angleB) * radius,
        },
        color,
      );
    }
  }

  public commit(geometry: THREE.BufferGeometry): void {
    geometry.setDrawRange(0, this.cursor / 3);
    this.positionAttribute.clearUpdateRanges();
    this.positionAttribute.addUpdateRange(0, this.cursor);
    this.positionAttribute.needsUpdate = true;
    if (this.colorAttribute) {
      this.colorAttribute.clearUpdateRanges();
      this.colorAttribute.addUpdateRange(0, this.cursor);
      this.colorAttribute.needsUpdate = true;
    }
  }
}

export interface LotusInteractionResult {
  hit: boolean;
  leafIndex: number;
  center: Point;
  radius: number;
}

export interface LotusGrabUpdateResult {
  leafIndex: number;
  center: Point;
  dragDistance: number;
  isDragging: boolean;
}

export interface LotusGrabEndResult {
  wasDragged: boolean;
  leafIndex: number;
  x: number;
  y: number;
}

export interface LeafDriftResult {
  driftX: number;
  driftY: number;
  rotationDelta: number;
}

function leafNoise(index: number, seed: number): number {
  const n = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Computes lively, multi-frequency fluid current drift and rotational swaying for lotus leaves.
 * Randomizes speed, rotation cadence, direction, and trajectory per leaf for a natural, alive pond.
 */
export function computeLeafDrift(
  time: number,
  phase: number,
  leafIndex = 0,
  driftXScale = LOTUS.driftX,
  driftYScale = LOTUS.driftY,
  rotationAmount = LOTUS.rotationAmount,
): LeafDriftResult {
  // Deterministic individual personality per leaf
  const speedMult = 0.75 + leafNoise(leafIndex, 1.1) * 0.7; // 0.75x to 1.45x individual speed
  const rotDir = leafNoise(leafIndex, 2.3) > 0.5 ? 1 : -1;
  const rotSpeedMult = 0.7 + leafNoise(leafIndex, 3.7) * 0.8;
  const ampXMult = 0.8 + leafNoise(leafIndex, 4.2) * 0.4;
  const ampYMult = 0.8 + leafNoise(leafIndex, 5.5) * 0.4;

  // Lively primary wave frequency (~12-18s period) + secondary ripple swell (~6-9s period)
  const t = time * speedMult;
  const normX =
    Math.sin(t * 0.32 + phase) * 0.72 +
    Math.sin(t * 0.64 + phase * 2.1) * 0.28;

  const normY =
    Math.cos(t * 0.28 + phase * 1.3) * 0.72 +
    Math.cos(t * 0.58 + phase * 0.7) * 0.28;

  // Gentle angular rocking (yaw) with unique sway cadence and direction per leaf
  const normRot =
    (Math.sin(time * rotSpeedMult * 0.25 + phase) * 0.7 +
     Math.sin(time * rotSpeedMult * 0.52 + phase * 1.7) * 0.3) * rotDir;

  return {
    driftX: normX * driftXScale * ampXMult,
    driftY: normY * driftYScale * ampYMult,
    rotationDelta: normRot * rotationAmount,
  };
}

interface GrabbedLeafState {
  leafIndex: number;
  grabOffsetX: number;
  grabOffsetY: number;
  dragDistance: number;
  lastX: number;
  lastY: number;
  dragVelocityX: number;
  dragVelocityY: number;
  lastTime: number;
}

interface LeafPhysicsState {
  displaceX: number;
  displaceY: number;
  velocityX: number;
  velocityY: number;
  dip: number;
  dipVelocity: number;
  visualCenterX: number;
  visualCenterY: number;
  visualRadius: number;
}

export class LotusLeavesPass {
  public readonly shadowGroup = new THREE.Group();
  public readonly group = new THREE.Group();

  private readonly shadowGeometry = new THREE.BufferGeometry();
  private readonly leafGeometry = new THREE.BufferGeometry();
  private readonly veinGeometry = new THREE.BufferGeometry();
  private readonly flowerGeometry = new THREE.BufferGeometry();
  private readonly leafCenterColor = new THREE.Color();
  private readonly leafEdgeColorA = new THREE.Color();
  private readonly leafEdgeColorB = new THREE.Color();
  private readonly shadowMaterial = new THREE.MeshBasicMaterial({
    color: LOTUS.shadow.color,
    opacity: LOTUS.shadow.opacity,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly shadowBatch = new LotusGeometryBatch(
    this.shadowGeometry,
    20_000,
    false,
  );
  private readonly leafBatch = new LotusGeometryBatch(
    this.leafGeometry,
    20_000,
    true,
  );
  private readonly veinBatch = new LotusGeometryBatch(
    this.veinGeometry,
    8_000,
    true,
  );
  private readonly flowerBatch = new LotusGeometryBatch(
    this.flowerGeometry,
    10_000,
    true,
  );
  private readonly physicsStates: LeafPhysicsState[] = [];
  private grabbedLeaf: GrabbedLeafState | null = null;
  private grabTargetX = 0;
  private grabTargetY = 0;
  private lastTime = -1;

  public constructor() {
    this.shadowGeometry.name = "lotus shadows";
    this.leafGeometry.name = "lotus leaves";
    this.veinGeometry.name = "lotus veins";
    this.flowerGeometry.name = "lotus flowers";

    const leafMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const veinMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const flowerMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const shadowMesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    const leafMesh = new THREE.Mesh(this.leafGeometry, leafMaterial);
    const veins = new THREE.LineSegments(this.veinGeometry, veinMaterial);
    const flowers = new THREE.Mesh(this.flowerGeometry, flowerMaterial);
    shadowMesh.frustumCulled = false;
    leafMesh.frustumCulled = false;
    veins.frustumCulled = false;
    flowers.frustumCulled = false;
    leafMesh.renderOrder = 1;
    veins.renderOrder = 2;
    flowers.renderOrder = 3;
    this.shadowGroup.add(shadowMesh);
    this.group.add(leafMesh, veins, flowers);
    this.refreshConfig();
  }

  public refreshConfig(): void {
    this.shadowMaterial.color.setHex(LOTUS.shadow.color);
    this.shadowMaterial.opacity = LOTUS.shadow.opacity;
    for (const [index, palette] of LOTUS.leafPalettes.entries()) {
      const target = PALETTES[index];
      if (!target) continue;
      target.base.setHex(palette.base);
      target.light.setHex(palette.light);
      target.shade.setHex(palette.shade);
      target.vein.setHex(palette.vein);
      target.center.setHex(palette.center);
    }
    for (const [index, palette] of LOTUS.flowerPalettes.entries()) {
      const target = FLOWER_PALETTES[index];
      if (!target) continue;
      target.outerPetal.setHex(palette.outerPetal);
      target.innerPetal.setHex(palette.innerPetal);
      target.petalLight.setHex(palette.petalLight);
      target.center.setHex(palette.center);
      target.centerDark.setHex(palette.centerDark);
    }
  }

  private ensurePhysicsCapacity(count: number): void {
    while (this.physicsStates.length < count) {
      this.physicsStates.push({
        displaceX: 0,
        displaceY: 0,
        velocityX: 0,
        velocityY: 0,
        dip: 0,
        dipVelocity: 0,
        visualCenterX: 0,
        visualCenterY: 0,
        visualRadius: 0,
      });
    }
  }

  private stepPhysics(dt: number, count: number): void {
    this.ensurePhysicsCapacity(count);
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));

    const springK = 22.0;
    const damping = 4.8;
    const dipSpringK = 34.0;
    const dipDamping = 5.4;

    for (let index = 0; index < count; index += 1) {
      const state = this.physicsStates[index];
      const isGrabbed = this.grabbedLeaf?.leafIndex === index;

      if (isGrabbed && this.grabbedLeaf) {
        state.velocityX = this.grabbedLeaf.dragVelocityX;
        state.velocityY = this.grabbedLeaf.dragVelocityY;
        state.dip = 0.25;
        state.dipVelocity = 0;
        continue;
      }

      // Horizontal planar spring-damper
      const accelX = -springK * state.displaceX - damping * state.velocityX;
      const accelY = -springK * state.displaceY - damping * state.velocityY;
      state.velocityX += accelX * clampedDt;
      state.velocityY += accelY * clampedDt;
      state.displaceX += state.velocityX * clampedDt;
      state.displaceY += state.velocityY * clampedDt;

      // Vertical dip (bobbing) spring-damper
      const dipAccel = -dipSpringK * state.dip - dipDamping * state.dipVelocity;
      state.dipVelocity += dipAccel * clampedDt;
      state.dip += state.dipVelocity * clampedDt;
      if (state.dip < -0.15) {
        state.dip = -0.15;
        state.dipVelocity *= 0.5;
      }
      if (state.dip > 1.2) {
        state.dip = 1.2;
        state.dipVelocity *= 0.5;
      }

      // Settle small residual values to zero
      if (
        Math.abs(state.displaceX) < 0.001 &&
        Math.abs(state.displaceY) < 0.001 &&
        Math.abs(state.velocityX) < 0.001 &&
        Math.abs(state.velocityY) < 0.001
      ) {
        state.displaceX = 0;
        state.displaceY = 0;
        state.velocityX = 0;
        state.velocityY = 0;
      }
      if (Math.abs(state.dip) < 0.001 && Math.abs(state.dipVelocity) < 0.001) {
        state.dip = 0;
        state.dipVelocity = 0;
      }
    }
  }

  public hitTest(point: Point): number | null {
    const visibleCount = Math.min(LOTUS_LEAVES.length, LOTUS.visibleLeafCount);
    this.ensurePhysicsCapacity(visibleCount);
    for (let index = visibleCount - 1; index >= 0; index -= 1) {
      const state = this.physicsStates[index];
      const leaf = LOTUS_LEAVES[index];
      if (!leaf) continue;
      const radius =
        state && state.visualRadius > 0
          ? state.visualRadius
          : leaf.radius * LOTUS.radiusScale;
      const centerX =
        state && state.visualRadius > 0
          ? state.visualCenterX
          : viewportPoint(leaf.x, leaf.y).x;
      const centerY =
        state && state.visualRadius > 0
          ? state.visualCenterY
          : viewportPoint(leaf.x, leaf.y).y;
      const dx = point.x - centerX;
      const dy = (point.y - centerY) / Math.max(0.1, LOTUS.verticalScale);
      if (dx * dx + dy * dy <= radius * radius) {
        return index;
      }
    }
    return null;
  }

  public interactAt(
    point: Point,
    impulse?: Point,
  ): LotusInteractionResult | null {
    const leafIndex = this.hitTest(point);
    if (leafIndex === null) return null;

    const state = this.physicsStates[leafIndex];
    const dx = point.x - state.visualCenterX;
    const dy = point.y - state.visualCenterY;
    const dist = Math.hypot(dx, dy);

    let pushX = 0;
    let pushY = 0;
    if (impulse && (Math.abs(impulse.x) > 0.05 || Math.abs(impulse.y) > 0.05)) {
      const len = Math.hypot(impulse.x, impulse.y);
      const clampedLen = Math.min(len, 22);
      pushX = (impulse.x / len) * clampedLen;
      pushY = (impulse.y / len) * clampedLen;
    } else {
      if (dist > 0.5) {
        pushX = -(dx / dist) * 8;
        pushY = -(dy / dist) * 8;
      } else {
        pushX = 0;
        pushY = 6;
      }
    }

    state.velocityX = Math.max(-28, Math.min(28, state.velocityX + pushX * 1.5));
    state.velocityY = Math.max(-28, Math.min(28, state.velocityY + pushY * 1.5));

    const impact = Math.hypot(pushX, pushY);
    state.dipVelocity = Math.min(8.0, state.dipVelocity + 2.6 + impact * 0.14);

    return {
      hit: true,
      leafIndex,
      center: { x: state.visualCenterX, y: state.visualCenterY },
      radius: state.visualRadius,
    };
  }

  public startGrab(point: Point): LotusInteractionResult | null {
    if (this.grabbedLeaf) {
      this.endGrab();
    }

    const leafIndex = this.hitTest(point);
    if (leafIndex === null) return null;

    this.ensurePhysicsCapacity(leafIndex + 1);
    const state = this.physicsStates[leafIndex];
    const leaf = LOTUS_LEAVES[leafIndex];
    if (!state || !leaf) return null;

    const centerX =
      state.visualRadius > 0
        ? state.visualCenterX
        : viewportPoint(leaf.x, leaf.y).x;
    const centerY =
      state.visualRadius > 0
        ? state.visualCenterY
        : viewportPoint(leaf.x, leaf.y).y;
    const radius =
      state.visualRadius > 0
        ? state.visualRadius
        : leaf.radius * LOTUS.radiusScale;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    this.grabbedLeaf = {
      leafIndex,
      grabOffsetX: point.x - centerX,
      grabOffsetY: point.y - centerY,
      dragDistance: 0,
      lastX: point.x,
      lastY: point.y,
      dragVelocityX: 0,
      dragVelocityY: 0,
      lastTime: now,
    };
    this.grabTargetX = centerX;
    this.grabTargetY = centerY;

    // Slight immersion dip when grabbed
    state.dip = 0.22;
    state.dipVelocity = 0;

    return {
      hit: true,
      leafIndex,
      center: { x: centerX, y: centerY },
      radius,
    };
  }

  public updateGrab(point: Point): LotusGrabUpdateResult | null {
    const grabbed = this.grabbedLeaf;
    if (!grabbed) return null;

    const state = this.physicsStates[grabbed.leafIndex];
    if (!state) return null;

    this.grabTargetX = Math.max(
      10,
      Math.min(CANVAS_WIDTH - 10, point.x - grabbed.grabOffsetX),
    );
    this.grabTargetY = Math.max(
      10,
      Math.min(CANVAS_HEIGHT - 10, point.y - grabbed.grabOffsetY),
    );

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const dt = Math.max(0.005, (now - grabbed.lastTime) / 1000);
    const dx = point.x - grabbed.lastX;
    const dy = point.y - grabbed.lastY;
    const dist = Math.hypot(dx, dy);
    grabbed.dragDistance += dist;

    const instantVx = dx / dt;
    const instantVy = dy / dt;
    grabbed.dragVelocityX = grabbed.dragVelocityX * 0.4 + instantVx * 0.6;
    grabbed.dragVelocityY = grabbed.dragVelocityY * 0.4 + instantVy * 0.6;
    grabbed.lastX = point.x;
    grabbed.lastY = point.y;
    grabbed.lastTime = now;

    // Keep leaf immersed with buoyant depth
    state.dip = 0.25;
    state.dipVelocity = 0;

    return {
      leafIndex: grabbed.leafIndex,
      center: { x: this.grabTargetX, y: this.grabTargetY },
      dragDistance: grabbed.dragDistance,
      isDragging: grabbed.dragDistance >= 4,
    };
  }

  public endGrab(point?: Point): LotusGrabEndResult | null {
    const grabbed = this.grabbedLeaf;
    if (!grabbed) return null;
    this.grabbedLeaf = null;

    const leafIndex = grabbed.leafIndex;
    const leaf = LOTUS_LEAVES[leafIndex];
    const state = this.physicsStates[leafIndex];
    if (!leaf || !state) return null;

    if (grabbed.dragDistance < 4) {
      // Tap in place: apply tap impulse without repositioning
      const interactPoint =
        point ?? { x: state.visualCenterX, y: state.visualCenterY };
      this.interactAt(interactPoint);
      return {
        wasDragged: false,
        leafIndex,
        x: leaf.x,
        y: leaf.y,
      };
    }

    // Dragged: compute new anchor coordinates
    const time = this.lastTime >= 0 ? this.lastTime : 0;
    const drift = computeLeafDrift(time, leaf.phase, grabbed.leafIndex);

    const targetPlacementX = this.grabTargetX - drift.driftX;
    const targetPlacementY = this.grabTargetY - drift.driftY;

    const rawLeafX = (targetPlacementX / CANVAS_WIDTH) * CANVAS.width;
    const rawLeafY = (targetPlacementY / CANVAS_HEIGHT) * CANVAS.height;

    const newLeafX = Math.round(
      Math.max(-20, Math.min(CANVAS.width + 20, rawLeafX)),
    );
    const newLeafY = Math.round(
      Math.max(-20, Math.min(CANVAS.height + 20, rawLeafY)),
    );

    leaf.x = newLeafX;
    leaf.y = newLeafY;

    // Zero-pop placement alignment
    const finalPlacement = viewportPoint(leaf.x, leaf.y);
    state.displaceX = targetPlacementX - finalPlacement.x;
    state.displaceY = targetPlacementY - finalPlacement.y;

    // Glide with water viscosity
    state.velocityX = Math.max(-32, Math.min(32, grabbed.dragVelocityX * 0.45));
    state.velocityY = Math.max(-32, Math.min(32, grabbed.dragVelocityY * 0.45));
    state.dipVelocity = 2.8;

    return {
      wasDragged: true,
      leafIndex,
      x: leaf.x,
      y: leaf.y,
    };
  }

  public cancelGrab(): void {
    if (!this.grabbedLeaf) return;
    const leafIndex = this.grabbedLeaf.leafIndex;
    this.grabbedLeaf = null;
    const state = this.physicsStates[leafIndex];
    if (state) {
      state.dipVelocity = 1.0;
    }
  }

  public isGrabbed(leafIndex?: number): boolean {
    if (leafIndex === undefined) return this.grabbedLeaf !== null;
    return this.grabbedLeaf?.leafIndex === leafIndex;
  }

  public getGrabbedLeafIndex(): number | null {
    return this.grabbedLeaf ? this.grabbedLeaf.leafIndex : null;
  }

  public getLeafState(leafIndex: number): Readonly<LeafPhysicsState> | null {
    return this.physicsStates[leafIndex] ?? null;
  }

  public update(time: number): void {
    const dt =
      this.lastTime < 0
        ? 0.016
        : Math.min(0.1, Math.max(0.001, time - this.lastTime));
    this.lastTime = time;

    this.shadowBatch.reset();
    this.leafBatch.reset();
    this.veinBatch.reset();
    this.flowerBatch.reset();

    const visibleLeaves = LOTUS_LEAVES.slice(0, LOTUS.visibleLeafCount);
    const visibleFlowers = LOTUS_FLOWERS.slice(0, LOTUS.visibleFlowerCount);
    this.stepPhysics(dt, visibleLeaves.length);

    for (const [leafIndex, leaf] of visibleLeaves.entries()) {
      const physics = this.physicsStates[leafIndex];
      const placement = viewportPoint(leaf.x, leaf.y);
      const isGrabbed = this.grabbedLeaf?.leafIndex === leafIndex;
      const drift = computeLeafDrift(time, leaf.phase, leafIndex);

      let center: Point;
      if (isGrabbed) {
        center = {
          x: this.grabTargetX,
          y: this.grabTargetY,
        };
        physics.displaceX = this.grabTargetX - (placement.x + drift.driftX);
        physics.displaceY = this.grabTargetY - (placement.y + drift.driftY);
      } else {
        center = {
          x: placement.x + drift.driftX + physics.displaceX,
          y: placement.y + drift.driftY + physics.displaceY,
        };
      }
      const angle = leaf.angle + drift.rotationDelta;
      const baseRadius =
        leaf.radius *
        LOTUS.radiusScale *
        (1 + Math.sin(time * 0.11 + leaf.phase) * 0.012);
      const radius = baseRadius * Math.max(0.7, 1 - physics.dip * 0.055);

      physics.visualCenterX = center.x;
      physics.visualCenterY = center.y;
      physics.visualRadius = radius;

      const palette = PALETTES[
        ((leaf.palette % PALETTES.length) + PALETTES.length) % PALETTES.length
      ];

      const shadowFactor = Math.max(0.2, 1 - physics.dip * 0.35);
      this.drawLeaf(
        this.shadowBatch,
        {
          x: center.x + LOTUS.shadow.offset.x * shadowFactor,
          y: center.y + LOTUS.shadow.offset.y * shadowFactor,
        },
        radius * 1.02,
        angle,
        leaf.phase,
      );
      this.drawLeaf(this.leafBatch, center, radius, angle, leaf.phase, palette);
      this.drawVeins(center, radius, angle, leaf.phase, palette);

      for (const flower of visibleFlowers) {
        if (flower.leafIndex !== leafIndex) continue;
        // Anchor flower relative to the rotated leaf surface
        const cosR = Math.cos(drift.rotationDelta);
        const sinR = Math.sin(drift.rotationDelta);
        const rotOffsetX = flower.offsetX * cosR - flower.offsetY * sinR;
        const rotOffsetY = flower.offsetX * sinR + flower.offsetY * cosR;

        this.drawFlower(
          {
            x: center.x + rotOffsetX,
            y: center.y + rotOffsetY,
          },
          flower.radius *
            LOTUS.flowerRadiusScale *
            Math.max(0.7, 1 - physics.dip * 0.05),
          flower.rotation + drift.rotationDelta,
          FLOWER_PALETTES[
            ((flower.palette % FLOWER_PALETTES.length) +
              FLOWER_PALETTES.length) %
              FLOWER_PALETTES.length
          ],
        );
      }
    }

    this.shadowBatch.commit(this.shadowGeometry);
    this.leafBatch.commit(this.leafGeometry);
    this.veinBatch.commit(this.veinGeometry);
    this.flowerBatch.commit(this.flowerGeometry);
  }

  private edgePoint(
    center: Point,
    radius: number,
    angle: number,
    phase: number,
  ): Point {
    const wobble =
      1 + Math.sin(angle * 3 + phase) * 0.035 + Math.cos(angle * 5 - phase) * 0.025;
    return {
      x: center.x + Math.cos(angle) * radius * wobble,
      y: center.y + Math.sin(angle) * radius * LOTUS.verticalScale * wobble,
    };
  }

  private drawLeaf(
    batch: LotusGeometryBatch,
    center: Point,
    radius: number,
    angle: number,
    phase: number,
    palette?: LeafPalette,
  ): void {
    const start = angle + LOTUS.notchHalfAngle;
    const span = TAU - LOTUS.notchHalfAngle * 2;

    if (palette) this.leafCenterColor.copy(palette.center);

    for (let index = 0; index < LOTUS.leafSegments; index += 1) {
      const angleA = start + (index / LOTUS.leafSegments) * span;
      const angleB = start + ((index + 1) / LOTUS.leafSegments) * span;
      if (palette) {
        this.leafColorAt(this.leafEdgeColorA, palette, angleA, phase);
        this.leafColorAt(this.leafEdgeColorB, palette, angleB, phase);
        batch.triangleColors(
          center,
          this.edgePoint(center, radius, angleA, phase),
          this.edgePoint(center, radius, angleB, phase),
          this.leafCenterColor,
          this.leafEdgeColorA,
          this.leafEdgeColorB,
        );
        continue;
      }
      batch.triangle(
        center,
        this.edgePoint(center, radius, angleA, phase),
        this.edgePoint(center, radius, angleB, phase),
        DEFAULT_COLOR,
      );
    }
  }

  private leafColorAt(
    target: THREE.Color,
    palette: LeafPalette,
    angle: number,
    phase: number,
  ): void {
    const directionalLight = 0.5 + Math.cos(angle + 2.2) * 0.42;
    const organicVariation = Math.sin(angle * 3 + phase * 0.7) * 0.045;
    const tone = Math.max(0, Math.min(1, directionalLight + organicVariation));
    if (tone < 0.5) {
      target.copy(palette.shade).lerp(palette.base, tone * 2);
      return;
    }
    target.copy(palette.base).lerp(palette.light, (tone - 0.5) * 2);
  }

  private drawVeins(
    center: Point,
    radius: number,
    angle: number,
    phase: number,
    palette: LeafPalette,
  ): void {
    const start = angle + LOTUS.notchHalfAngle;
    const span = TAU - LOTUS.notchHalfAngle * 2;
    for (let index = 1; index <= LOTUS.veinCount; index += 1) {
      const veinAngle = start + (index / (LOTUS.veinCount + 1)) * span;
      this.veinBatch.line(
        center,
        this.edgePoint(center, radius * 0.68, veinAngle, phase),
        palette.vein,
      );
    }
    this.leafBatch.circle(center, Math.max(1, radius * 0.075), palette.center);
  }

  private drawFlower(
    center: Point,
    radius: number,
    rotation: number,
    palette: FlowerPalette,
  ): void {
    const drawPetalRing = (
      count: number,
      length: number,
      width: number,
      angleOffset: number,
      primary: THREE.Color,
      alternate: THREE.Color,
    ): void => {
      for (let index = 0; index < count; index += 1) {
        const angle = rotation + angleOffset + (index / count) * TAU;
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const side = { x: -direction.y, y: direction.x };
        const base = {
          x: center.x + direction.x * radius * 0.12,
          y: center.y + direction.y * radius * 0.12,
        };
        const tip = {
          x: center.x + direction.x * radius * length,
          y: center.y + direction.y * radius * length,
        };
        const halfWidth = radius * width;
        const color = index % 3 === 0 ? alternate : primary;
        this.flowerBatch.triangle(
          {
            x: base.x + side.x * halfWidth,
            y: base.y + side.y * halfWidth,
          },
          tip,
          {
            x: base.x - side.x * halfWidth,
            y: base.y - side.y * halfWidth,
          },
          color,
        );
      }
    };

    drawPetalRing(8, 1, 0.22, 0, palette.outerPetal, palette.petalLight);
    drawPetalRing(
      6,
      0.66,
      0.19,
      Math.PI / 6,
      palette.innerPetal,
      palette.petalLight,
    );
    this.flowerBatch.circle(center, radius * 0.28, palette.centerDark);
    this.flowerBatch.circle(center, radius * 0.18, palette.center);
  }
}
