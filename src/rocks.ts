import * as THREE from "three";
import {
  POND_ROCKS,
  ROCKS,
  type RockSetting,
  viewportPoint,
} from "./config";
import {
  SurfaceGeometryBatch,
  type SurfacePoint,
} from "./surface-geometry";

const TAU = Math.PI * 2;

interface RuntimeRockPalette {
  base: THREE.Color;
  highlight: THREE.Color;
  shade: THREE.Color;
  accent: THREE.Color;
}

const PALETTES: RuntimeRockPalette[] = ROCKS.palettes.map((palette) => ({
  base: new THREE.Color(palette.base),
  highlight: new THREE.Color(palette.highlight),
  shade: new THREE.Color(palette.shade),
  accent: new THREE.Color(palette.accent),
}));

export interface ActiveRock {
  setting: RockSetting;
  index: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  depth: "submerged" | "emergent";
  palette: RuntimeRockPalette;
  moss: number;
}

export class RocksPass {
  public readonly bedGroup = new THREE.Group();
  public readonly surfaceShadowGroup = new THREE.Group();
  public readonly surfaceGroup = new THREE.Group();

  // Submerged geometry (drawn onto the underwater pond bed)
  private readonly bedShadowGeometry = new THREE.BufferGeometry();
  private readonly bedRockGeometry = new THREE.BufferGeometry();
  private readonly bedAccentGeometry = new THREE.BufferGeometry();

  // Emergent geometry (breaking the water surface)
  private readonly surfaceShadowGeometry = new THREE.BufferGeometry();
  private readonly surfaceRockGeometry = new THREE.BufferGeometry();
  private readonly surfaceAccentGeometry = new THREE.BufferGeometry();

  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly bedShadowMaterial: THREE.MeshBasicMaterial;

  private readonly bedShadowBatch: SurfaceGeometryBatch;
  private readonly bedRockBatch: SurfaceGeometryBatch;
  private readonly bedAccentBatch: SurfaceGeometryBatch;

  private readonly surfaceShadowBatch: SurfaceGeometryBatch;
  private readonly surfaceRockBatch: SurfaceGeometryBatch;
  private readonly surfaceAccentBatch: SurfaceGeometryBatch;

  private activeRocks: ActiveRock[] = [];

  public constructor() {
    this.bedShadowGeometry.name = "submerged rock shadows";
    this.bedRockGeometry.name = "submerged rocks";
    this.bedAccentGeometry.name = "submerged rock moss";

    this.surfaceShadowGeometry.name = "emergent rock shadows";
    this.surfaceRockGeometry.name = "emergent rocks";
    this.surfaceAccentGeometry.name = "emergent rock moss";

    this.bedShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x051512,
      opacity: 0.38,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: ROCKS.shadow.color,
      opacity: ROCKS.shadow.opacity,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const coloredMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.bedShadowBatch = new SurfaceGeometryBatch(this.bedShadowGeometry, 12_000);
    this.bedRockBatch = new SurfaceGeometryBatch(this.bedRockGeometry, 24_000, true);
    this.bedAccentBatch = new SurfaceGeometryBatch(this.bedAccentGeometry, 12_000, true);

    this.surfaceShadowBatch = new SurfaceGeometryBatch(this.surfaceShadowGeometry, 12_000);
    this.surfaceRockBatch = new SurfaceGeometryBatch(this.surfaceRockGeometry, 24_000, true);
    this.surfaceAccentBatch = new SurfaceGeometryBatch(this.surfaceAccentGeometry, 12_000, true);

    const bedShadowMesh = new THREE.Mesh(this.bedShadowGeometry, this.bedShadowMaterial);
    const bedRockMesh = new THREE.Mesh(this.bedRockGeometry, coloredMaterial);
    const bedAccentMesh = new THREE.Mesh(this.bedAccentGeometry, coloredMaterial);

    const surfaceShadowMesh = new THREE.Mesh(this.surfaceShadowGeometry, this.shadowMaterial);
    const surfaceRockMesh = new THREE.Mesh(this.surfaceRockGeometry, coloredMaterial);
    const surfaceAccentMesh = new THREE.Mesh(this.surfaceAccentGeometry, coloredMaterial);

    for (const mesh of [
      bedShadowMesh,
      bedRockMesh,
      bedAccentMesh,
      surfaceShadowMesh,
      surfaceRockMesh,
      surfaceAccentMesh,
    ]) {
      mesh.frustumCulled = false;
    }

    bedShadowMesh.renderOrder = 0;
    bedRockMesh.renderOrder = 1;
    bedAccentMesh.renderOrder = 2;
    this.bedGroup.add(bedShadowMesh, bedRockMesh, bedAccentMesh);

    surfaceShadowMesh.renderOrder = 0;
    surfaceRockMesh.renderOrder = 1;
    surfaceAccentMesh.renderOrder = 2;
    this.surfaceShadowGroup.add(surfaceShadowMesh);
    this.surfaceGroup.add(surfaceRockMesh, surfaceAccentMesh);

    this.refreshConfig();
  }

  public refreshConfig(): void {
    this.shadowMaterial.color.setHex(ROCKS.shadow.color);
    this.shadowMaterial.opacity = ROCKS.shadow.opacity;

    for (const [index, palette] of ROCKS.palettes.entries()) {
      let target = PALETTES[index];
      if (!target) {
        target = {
          base: new THREE.Color(),
          highlight: new THREE.Color(),
          shade: new THREE.Color(),
          accent: new THREE.Color(),
        };
        PALETTES[index] = target;
      }
      target.base.setHex(palette.base);
      target.highlight.setHex(palette.highlight);
      target.shade.setHex(palette.shade);
      target.accent.setHex(palette.accent);
    }
  }

  public getActiveRocks(): readonly ActiveRock[] {
    return this.activeRocks;
  }

  public hitTest(point: SurfacePoint): ActiveRock | null {
    // Only emergent boulders breaking the surface can be tapped/clicked directly
    for (const rock of this.activeRocks) {
      if (rock.depth !== "emergent") continue;
      const placement = viewportPoint(rock.x, rock.y);
      const dx = point.x - placement.x;
      const dy = point.y - placement.y;
      const cosA = Math.cos(-rock.angle);
      const sinA = Math.sin(-rock.angle);
      const localX = dx * cosA - dy * sinA;
      const localY = dx * sinA + dy * cosA;
      const rx = rock.radiusX * ROCKS.rockScale * 1.1;
      const ry = rock.radiusY * ROCKS.rockScale * 1.1;
      if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1.0) {
        return rock;
      }
    }
    return null;
  }

  public update(_time: number): void {
    this.bedShadowBatch.reset();
    this.bedRockBatch.reset();
    this.bedAccentBatch.reset();

    this.surfaceShadowBatch.reset();
    this.surfaceRockBatch.reset();
    this.surfaceAccentBatch.reset();

    const visibleCount = Math.min(ROCKS.visibleRockCount, POND_ROCKS.length);
    const visibleRocks = POND_ROCKS.slice(0, visibleCount);

    this.activeRocks = visibleRocks.map((rock, index) => {
      const palette =
        PALETTES[
          ((rock.palette % PALETTES.length) + PALETTES.length) % PALETTES.length
        ];
      return {
        setting: rock,
        index,
        x: rock.x,
        y: rock.y,
        radiusX: rock.radiusX * ROCKS.rockScale,
        radiusY: rock.radiusY * ROCKS.rockScale,
        angle: rock.angle,
        depth: rock.depth,
        palette,
        moss: rock.moss,
      };
    });

    for (const rock of this.activeRocks) {
      this.drawRock(rock);
    }

    this.bedShadowBatch.commit();
    this.bedRockBatch.commit();
    this.bedAccentBatch.commit();

    this.surfaceShadowBatch.commit();
    this.surfaceRockBatch.commit();
    this.surfaceAccentBatch.commit();
  }

  private drawRock(rock: ActiveRock): void {
    // All rocks sit on the underwater pond bed — there are no floating rocks
    const shadowBatch = this.bedShadowBatch;
    const rockBatch = this.bedRockBatch;
    const accentBatch = this.bedAccentBatch;

    const center = viewportPoint(rock.x, rock.y);
    const numVerts = 10;
    const cosAngle = Math.cos(rock.angle);
    const sinAngle = Math.sin(rock.angle);

    // Compute stylized organic polygonal perimeter
    const vertices: SurfacePoint[] = [];
    const shadowVertices: SurfacePoint[] = [];

    const shadowOffset = { x: 2.0, y: 3.5 };

    for (let i = 0; i < numVerts; i += 1) {
      const theta = (i / numVerts) * TAU;
      // Deterministic natural organic irregularity per vertex
      const irregularity =
        1.0 +
        Math.sin(rock.index * 17.13 + i * 3.7) * 0.12 +
        Math.cos(rock.index * 31.41 + i * 5.3) * 0.08;

      const lx = rock.radiusX * irregularity * Math.cos(theta);
      const ly = rock.radiusY * irregularity * Math.sin(theta);

      const rx = lx * cosAngle - ly * sinAngle;
      const ry = lx * sinAngle + ly * cosAngle;

      vertices.push({
        x: center.x + rx,
        y: center.y + ry,
      });

      shadowVertices.push({
        x: center.x + rx * 1.08 + shadowOffset.x,
        y: center.y + ry * 1.08 + shadowOffset.y,
      });
    }

    // 1. Draw grounding shadow
    const shadowCenter = {
      x: center.x + shadowOffset.x,
      y: center.y + shadowOffset.y,
    };
    for (let i = 0; i < numVerts; i += 1) {
      const next = (i + 1) % numVerts;
      shadowBatch.triangle(shadowCenter, shadowVertices[i], shadowVertices[next]);
    }

    // 2. Draw rock body with directional facet shading
    // Apex of rock is slightly offset up-left towards sunlit light source
    const lightOffsetDist = 0.22;
    const apex = {
      x: center.x - rock.radiusX * lightOffsetDist * cosAngle,
      y: center.y - rock.radiusY * lightOffsetDist * sinAngle - rock.radiusY * 0.15,
    };

    for (let i = 0; i < numVerts; i += 1) {
      const next = (i + 1) % numVerts;
      const midAngle = ((i + 0.5) / numVerts) * TAU + rock.angle;
      const normalizedAngle = ((midAngle % TAU) + TAU) % TAU;

      // Upper-left facing facets catch sunlit highlights; lower-right catch deep shade
      let facetColor: THREE.Color;
      if (normalizedAngle > Math.PI * 0.65 && normalizedAngle < Math.PI * 1.45) {
        facetColor = rock.palette.highlight;
      } else if (normalizedAngle < Math.PI * 0.35 || normalizedAngle > Math.PI * 1.75) {
        facetColor = rock.palette.shade;
      } else {
        facetColor = rock.palette.base;
      }

      rockBatch.triangle(apex, vertices[i], vertices[next], facetColor);
    }

    // 3. Top crown highlight facet
    const crownVerts: SurfacePoint[] = [];
    const crownScale = 0.45;
    for (let i = 0; i < numVerts; i += 1) {
      crownVerts.push({
        x: apex.x + (vertices[i].x - center.x) * crownScale,
        y: apex.y + (vertices[i].y - center.y) * crownScale,
      });
    }
    for (let i = 0; i < numVerts; i += 1) {
      const next = (i + 1) % numVerts;
      rockBatch.triangle(apex, crownVerts[i], crownVerts[next], rock.palette.highlight);
    }

    // 4. Subtle moss/lichen accents nestled on the stone
    if (rock.moss > 0.08) {
      const mossCount = Math.max(1, Math.round(rock.moss * 4));
      for (let m = 0; m < mossCount; m += 1) {
        const mossAngle = (rock.index * 2.3 + m * 1.9) % TAU;
        const mossDist = (0.35 + (m % 2) * 0.25) * Math.min(rock.radiusX, rock.radiusY);
        const mossCenter = {
          x: center.x + Math.cos(mossAngle) * mossDist,
          y: center.y + Math.sin(mossAngle) * mossDist,
        };
        const mossRadius = (1.5 + (m % 3) * 0.8) * Math.max(0.6, rock.moss);
        accentBatch.circle(mossCenter, mossRadius, rock.palette.accent, 6);
      }
    }
  }

  public dispose(): void {
    this.bedShadowGeometry.dispose();
    this.bedRockGeometry.dispose();
    this.bedAccentGeometry.dispose();
    this.surfaceShadowGeometry.dispose();
    this.surfaceRockGeometry.dispose();
    this.surfaceAccentGeometry.dispose();
    this.bedShadowMaterial.dispose();
    this.shadowMaterial.dispose();
  }
}
