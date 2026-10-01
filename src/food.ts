import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./config";
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
  maxAge: number;
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

export class FoodPass {
  public readonly shadowGroup = new THREE.Group();
  public readonly group = new THREE.Group();

  private readonly shadowGeometry = new THREE.BufferGeometry();
  private readonly pelletGeometry = new THREE.BufferGeometry();

  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly pelletMaterial: THREE.MeshBasicMaterial;

  private readonly shadowBatch: SurfaceGeometryBatch;
  private readonly pelletBatch: SurfaceGeometryBatch;

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
      const speed = 16 + Math.random() * 28;
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
        maxAge: 20 + Math.random() * 6,
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

    for (const p of this.pellets) {
      p.x = clamp(p.x + p.vx * dt, 8, CANVAS_WIDTH - 8);
      p.y = clamp(p.y + p.vy * dt, 8, CANVAS_HEIGHT - 8);
      p.vx *= Math.exp(-dt * 5.2);
      p.vy *= Math.exp(-dt * 5.2);
      p.age += dt;

      // Check collision with koi mouths
      for (let i = 0; i < school.count; i += 1) {
        const fish = school.fish[i];
        const mouthX =
          fish.renderSpine[0].x + Math.cos(fish.heading) * fish.bodyWidth * 0.45;
        const mouthY =
          fish.renderSpine[0].y + Math.sin(fish.heading) * fish.bodyWidth * 0.45;
        const mouthDist = Math.hypot(p.x - mouthX, p.y - mouthY);

        if (fish.depth < 0.48 && mouthDist < p.radius + fish.bodyWidth * 0.52) {
          p.eaten = true;
          fish.gulpAnimation = 0.38;
          school.ripples.trigger("mouth", { x: mouthX, y: mouthY });
          onPelletEaten?.({ x: p.x, y: p.y });
          break;
        }
      }
    }

    this.pellets = this.pellets.filter((p) => !p.eaten && p.age < p.maxAge);

    // If there is active food floating, orient the school towards the food centroid
    if (this.pellets.length > 0) {
      let sumX = 0;
      let sumY = 0;
      for (const p of this.pellets) {
        sumX += p.x;
        sumY += p.y;
      }
      const centroid = {
        x: sumX / this.pellets.length,
        y: sumY / this.pellets.length,
      };
      school.updateTarget(centroid);
    }

    // Render pellets and their surface shadows
    this.shadowBatch.reset();
    this.pelletBatch.reset();

    for (const p of this.pellets) {
      const shadowOffset = { x: 1.2, y: 1.8 };
      this.shadowBatch.circle(
        { x: p.x + shadowOffset.x, y: p.y + shadowOffset.y },
        p.radius * 1.15,
        SHADOW_COLOR,
        6,
      );
      this.pelletBatch.circle({ x: p.x, y: p.y }, p.radius, p.color, 6);
      this.pelletBatch.circle(
        { x: p.x - p.radius * 0.28, y: p.y - p.radius * 0.28 },
        p.radius * 0.42,
        p.highlight,
        5,
      );
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
