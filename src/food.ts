import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH, RIPPLES } from "./config";
import { type Vec2, clamp } from "./math";
import { type School } from "./school";
import { SurfaceGeometryBatch } from "./surface-geometry";

export interface FoodPellet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: THREE.Color;
  highlight: THREE.Color;
  age: number;
  floatDuration: number;
  sinkDuration: number;
  settleDuration: number;
  depth: number;
  driftSeed: number;
  eaten: boolean;
}

const PELLET_PALETTES = [
  // Golden toasted grain
  { color: new THREE.Color(0xb8823b), highlight: new THREE.Color(0xdfad68) },
  // Earthy amber brown
  { color: new THREE.Color(0x9e692a), highlight: new THREE.Color(0xc28f4e) },
  // Warm tan biscuit
  { color: new THREE.Color(0xc4914f), highlight: new THREE.Color(0xebbe83) },
  // Spirulina algae olive
  { color: new THREE.Color(0x768045), highlight: new THREE.Color(0x9caa61) },
];

const SHADOW_COLOR = new THREE.Color(0x051a16);
const DEEP_WATER_TINT = new THREE.Color(0x0b261e);

export class FoodPass {
  public readonly shadowGroup = new THREE.Group();
  public readonly group = new THREE.Group();

  private readonly shadowGeometry = new THREE.BufferGeometry();
  private readonly pelletGeometry = new THREE.BufferGeometry();

  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly pelletMaterial: THREE.MeshBasicMaterial;

  private readonly shadowBatch: SurfaceGeometryBatch;
  private readonly pelletBatch: SurfaceGeometryBatch;

  private readonly scratchColor = new THREE.Color();
  private readonly scratchHighlight = new THREE.Color();

  private pellets: FoodPellet[] = [];
  private nextId = 1;
  private previousTime = -1;

  public constructor() {
    this.shadowGeometry.name = "food shadows";
    this.pelletGeometry.name = "food pellets";

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x051a16,
      opacity: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.pelletMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.shadowBatch = new SurfaceGeometryBatch(this.shadowGeometry, 4000);
    this.pelletBatch = new SurfaceGeometryBatch(this.pelletGeometry, 6000, true);

    const shadowMesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    const pelletMesh = new THREE.Mesh(this.pelletGeometry, this.pelletMaterial);

    shadowMesh.frustumCulled = false;
    pelletMesh.frustumCulled = false;

    this.shadowGroup.add(shadowMesh);
    this.group.add(pelletMesh);
  }

  public getPellets(): readonly FoodPellet[] {
    return this.pellets;
  }

  public spawnAt(point: Vec2, count = 6): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 12;
      const speed = 16 + Math.random() * 26;
      const radius = 1.25 + Math.random() * 0.85;
      const palette =
        PELLET_PALETTES[Math.floor(Math.random() * PELLET_PALETTES.length)];

      this.pellets.push({
        id: this.nextId++,
        x: point.x + Math.cos(angle) * (dist * 0.35),
        y: point.y + Math.sin(angle) * (dist * 0.35),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        color: palette.color,
        highlight: palette.highlight,
        age: 0,
        floatDuration: 8 + Math.random() * 4,
        sinkDuration: 4.5 + Math.random() * 1.5,
        settleDuration: 1.8,
        depth: 0,
        driftSeed: Math.random() * 100,
        eaten: false,
      });
    }
  }

  public update(
    time: number,
    school: School,
    onPelletEaten?: (pos: Vec2) => void,
  ): void {
    const dt =
      this.previousTime < 0
        ? 0.016
        : Math.min(Math.max(time - this.previousTime, 0.001), 0.06);
    this.previousTime = time;

    for (let index = 0; index < this.pellets.length; index += 1) {
      const p = this.pellets[index];
      p.age += dt;

      // Calculate depth based on lifecycle phases
      if (p.age <= p.floatDuration) {
        p.depth = 0;
      } else if (p.age <= p.floatDuration + p.sinkDuration) {
        p.depth = clamp((p.age - p.floatDuration) / p.sinkDuration, 0, 1);
      } else {
        p.depth = 1;
      }

      const floatFactor = Math.max(0, 1 - p.depth);

      // Dampen initial ejection velocity
      p.vx *= Math.exp(-dt * 3.5);
      p.vy *= Math.exp(-dt * 3.5);

      // 1. Lively ambient harmonic water current drift
      if (floatFactor > 0.01) {
        const angle1 = time * 0.75 + p.driftSeed;
        const angle2 = time * 1.65 + p.driftSeed * 1.7;
        const currentVx = (Math.cos(angle1) * 2.2 + Math.cos(angle2) * 1.0) * floatFactor;
        const currentVy = (Math.sin(angle1) * 2.2 + Math.sin(angle2) * 1.0) * floatFactor;
        p.vx += (currentVx - p.vx * 0.22) * dt * 2.4;
        p.vy += (currentVy - p.vy * 0.22) * dt * 2.4;
      }

      // 2. React to expanding water surface ripples (touch, rain, mouth splashes)
      if (floatFactor > 0.05) {
        for (const ripple of school.ripples.instances) {
          if (!ripple.alive || ripple.age < 0) continue;
          const profile = RIPPLES.types[ripple.type];
          if (!profile) continue;

          const waveRadius =
            profile.startRadius + ripple.age * profile.expansionSpeed;
          const dx = p.x - ripple.center.x;
          const dy = p.y - ripple.center.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 0.5) {
            const distFromCrest = Math.abs(dist - waveRadius);
            const bandWidth = 14;
            if (distFromCrest < bandWidth) {
              const bandFactor = 1 - distFromCrest / bandWidth;
              const ageFade = Math.max(0, 1 - ripple.age / profile.lifetime);
              const impulse =
                ripple.strength * bandFactor * ageFade * floatFactor * 78;
              const nx = dx / dist;
              const ny = dy / dist;
              p.vx += nx * impulse * dt;
              p.vy += ny * impulse * dt;
            }
          }
        }
      }

      // 3. Pellet-to-pellet soft dispersion to prevent clumped freeze
      if (floatFactor > 0.1) {
        for (let j = index + 1; j < this.pellets.length; j += 1) {
          const p2 = this.pellets[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;
          const minDist = (p.radius + p2.radius) * 2.6;
          if (distSq < minDist * minDist && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const push = ((minDist - dist) / minDist) * 14 * floatFactor * dt;
            const nx = dx / dist;
            const ny = dy / dist;
            p.vx += nx * push;
            p.vy += ny * push;
            p2.vx -= nx * push;
            p2.vy -= ny * push;
          }
        }
      }

      // 4. Koi wake disturbance: swimming koi displace floating pellets
      if (floatFactor > 0.1) {
        for (let fi = 0; fi < school.count; fi += 1) {
          const fish = school.fish[fi];
          if (fish.depth > 0.55) continue;
          const head = fish.renderSpine[0];
          const dx = p.x - head.x;
          const dy = p.y - head.y;
          const dist = Math.hypot(dx, dy);
          const wakeDist = fish.bodyWidth * 1.1;
          if (dist < wakeDist && dist > 1) {
            const push = ((wakeDist - dist) / wakeDist) * 32 * floatFactor * dt;
            p.vx += (dx / dist) * push;
            p.vy += (dy / dist) * push;
          }
        }
      }

      // 5. Descent flutter sway while sinking through water column
      const sway =
        p.depth > 0 && p.depth < 1
          ? Math.sin(time * 3.6 + p.driftSeed) * 1.8 * p.depth * (1 - p.depth * 0.5)
          : 0;

      p.x = clamp(p.x + (p.vx + sway) * dt, 8, CANVAS_WIDTH - 8);
      p.y = clamp(p.y + p.vy * dt, 8, CANVAS_HEIGHT - 8);

      // 6. Check collision with koi mouths
      for (let fi = 0; fi < school.count; fi += 1) {
        const fish = school.fish[fi];
        const mouthX =
          fish.renderSpine[0].x + Math.cos(fish.heading) * fish.bodyWidth * 0.45;
        const mouthY =
          fish.renderSpine[0].y + Math.sin(fish.heading) * fish.bodyWidth * 0.45;
        const mouthDist = Math.hypot(p.x - mouthX, p.y - mouthY);

        const depthDiff = Math.abs(fish.depth - p.depth);
        const canEat =
          (p.depth < 0.48 && fish.depth < 0.48) || depthDiff < 0.35;

        if (canEat && mouthDist < p.radius + fish.bodyWidth * 0.52) {
          p.eaten = true;
          fish.gulpAnimation = 0.38;
          school.ripples.trigger("mouth", { x: mouthX, y: mouthY });
          onPelletEaten?.({ x: p.x, y: p.y });
          break;
        }
      }
    }

    // Filter out eaten pellets and pellets settled past their dissolution time
    this.pellets = this.pellets.filter((p) => {
      const maxLifetime = p.floatDuration + p.sinkDuration + p.settleDuration;
      return !p.eaten && p.age < maxLifetime;
    });

    // If there is active food floating or sinking, orient the school towards food centroid
    if (this.pellets.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let totalWeight = 0;
      for (const p of this.pellets) {
        const weight = Math.max(0.1, 1 - p.depth * 0.65);
        sumX += p.x * weight;
        sumY += p.y * weight;
        totalWeight += weight;
      }
      if (totalWeight > 0) {
        school.updateTarget({
          x: sumX / totalWeight,
          y: sumY / totalWeight,
        });
      }
    }

    // Render pellets and their surface shadows
    this.shadowBatch.reset();
    this.pelletBatch.reset();

    for (const p of this.pellets) {
      // Perspective scale shrinks as pellet sinks into the deep pond bed
      let scale = 1.0 - p.depth * 0.32;
      if (p.depth >= 1) {
        const settleElapsed = p.age - p.floatDuration - p.sinkDuration;
        scale *= Math.max(0, 1 - settleElapsed / p.settleDuration);
      }
      const currentRadius = Math.max(0.15, p.radius * scale);

      // Surface drop shadow only exists while near water surface
      const shadowAlpha = Math.max(0, 1 - p.depth * 2.8);
      if (shadowAlpha > 0.02) {
        const shadowOffset = { x: 1.2 * shadowAlpha, y: 1.8 * shadowAlpha };
        this.shadowBatch.circle(
          { x: p.x + shadowOffset.x, y: p.y + shadowOffset.y },
          currentRadius * 1.15 * shadowAlpha,
          SHADOW_COLOR,
          6,
        );
      }

      // Color darkens and blends with deep pond water tint as it sinks
      this.scratchColor.copy(p.color).lerp(DEEP_WATER_TINT, p.depth * 0.72);
      this.pelletBatch.circle({ x: p.x, y: p.y }, currentRadius, this.scratchColor, 6);

      // Highlight specular dot fades out as pellet submerges beneath the meniscus
      if (p.depth < 0.35) {
        const highlightAlpha = 1 - p.depth / 0.35;
        this.scratchHighlight.copy(p.highlight).lerp(this.scratchColor, 1 - highlightAlpha);
        this.pelletBatch.circle(
          { x: p.x - currentRadius * 0.28, y: p.y - currentRadius * 0.28 },
          currentRadius * 0.42 * highlightAlpha,
          this.scratchHighlight,
          5,
        );
      }
    }

    this.shadowBatch.commit();
    this.pelletBatch.commit();
  }

  public clear(): void {
    this.pellets = [];
    this.shadowBatch.reset();
    this.pelletBatch.reset();
    this.shadowBatch.commit();
    this.pelletBatch.commit();
  }

  public dispose(): void {
    this.pellets = [];
    this.shadowGeometry.dispose();
    this.pelletGeometry.dispose();
    this.shadowMaterial.dispose();
    this.pelletMaterial.dispose();
  }
}
