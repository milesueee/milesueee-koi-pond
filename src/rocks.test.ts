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
    expect(submerged.length).toBe(pass.getActiveRocks().length);
    expect(submerged.length).toBeGreaterThan(0);

    ROCKS.visibleRockCount = origCount;
  });

  it("safely ignores empty water and submerged rocks during surface hit-testing", () => {
    const pass = new RocksPass();
    ROCKS.visibleRockCount = POND_ROCKS.length;
    pass.update(0);

    // Submerged rocks on the pond bed do not intercept surface pointer taps
    const firstRock = pass.getActiveRocks()[0];
    if (firstRock) {
      const center = viewportPoint(firstRock.x, firstRock.y);
      const hit = pass.hitTest(center);
      expect(hit).toBeNull();
    }

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

  it("disposes resources cleanly", () => {
    const pass = new RocksPass();
    expect(() => pass.dispose()).not.toThrow();
  });
});
