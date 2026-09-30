import { describe, expect, it } from "vitest";
import { ROCKS, POND_ROCKS, viewportPoint } from "./config";
import { RocksPass } from "./rocks";

describe("RocksPass", () => {
  it("initializes without errors and creates submerged and emergent rock groups", () => {
    const pass = new RocksPass();
    expect(pass.bedGroup).toBeDefined();
    expect(pass.surfaceShadowGroup).toBeDefined();
    expect(pass.surfaceGroup).toBeDefined();
  });

  it("populates geometry batches and updates based on visibleRockCount", () => {
    const pass = new RocksPass();
    const origCount = ROCKS.visibleRockCount;

    ROCKS.visibleRockCount = 0;
    pass.update(0);
    expect(pass.getActiveRocks().length).toBe(0);

    ROCKS.visibleRockCount = 6;
    pass.update(1);
    expect(pass.getActiveRocks().length).toBe(6);

    ROCKS.visibleRockCount = Math.min(16, POND_ROCKS.length);
    pass.update(2);
    expect(pass.getActiveRocks().length).toBe(ROCKS.visibleRockCount);

    const submerged = pass.getActiveRocks().filter((r) => r.depth === "submerged");
    const emergent = pass.getActiveRocks().filter((r) => r.depth === "emergent");
    expect(submerged.length).toBeGreaterThan(0);
    expect(emergent.length).toBeGreaterThan(0);

    ROCKS.visibleRockCount = origCount;
  });

  it("hit-tests emergent boulders and ignores empty water", () => {
    const pass = new RocksPass();
    ROCKS.visibleRockCount = POND_ROCKS.length;
    pass.update(0);

    const activeEmergent = pass.getActiveRocks().find((r) => r.depth === "emergent");
    expect(activeEmergent).toBeDefined();
    if (activeEmergent) {
      const center = viewportPoint(activeEmergent.x, activeEmergent.y);
      const hit = pass.hitTest(center);
      expect(hit).not.toBeNull();
      expect(hit?.depth).toBe("emergent");
    }

    // Coordinates in the middle of empty water
    const miss = pass.hitTest({ x: 240, y: 135 });
    expect(miss).toBeNull();
  });

  it("refreshes config and palette without throwing", () => {
    const pass = new RocksPass();
    expect(() => {
      pass.refreshConfig();
      pass.update(0);
    }).not.toThrow();
  });
});
