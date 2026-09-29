import { describe, expect, it } from "vitest";
import { LOTUS_LEAVES, viewportPoint } from "./config";
import { LotusLeavesPass } from "./lotus-leaves";

describe("LotusLeavesPass interactivity", () => {
  it("detects hits on visible lotus leaves and ignores outside coordinates", () => {
    const pass = new LotusLeavesPass();
    pass.update(1.0);

    const firstLeaf = LOTUS_LEAVES[0];
    const placement = viewportPoint(firstLeaf.x, firstLeaf.y);

    // Hit test on the center of the first leaf
    const hitIndex = pass.hitTest(placement);
    expect(hitIndex).toBe(0);

    // Hit test far outside pond canvas
    const miss = pass.hitTest({ x: -9999, y: -9999 });
    expect(miss).toBeNull();
  });

  it("applies physics impulses (dip, velocity) on interaction without rotating", () => {
    const pass = new LotusLeavesPass();
    pass.update(1.0);

    const firstLeaf = LOTUS_LEAVES[0];
    const placement = viewportPoint(firstLeaf.x, firstLeaf.y);

    // Initial interaction at leaf location
    const result = pass.interactAt(placement, { x: 5, y: 5 });
    expect(result).not.toBeNull();
    expect(result?.hit).toBe(true);
    expect(result?.leafIndex).toBe(0);

    // Step physics forward and verify it updates without error
    pass.update(1.05);
    pass.update(1.1);
  });

  it("returns null when interacting with empty water", () => {
    const pass = new LotusLeavesPass();
    pass.update(1.0);

    const result = pass.interactAt({ x: -500, y: -500 });
    expect(result).toBeNull();
  });

  it("handles tap distinction vs dragging", () => {
    const pass = new LotusLeavesPass();
    pass.update(1.0);

    const firstLeaf = LOTUS_LEAVES[0];
    const initialX = firstLeaf.x;
    const initialY = firstLeaf.y;
    const placement = viewportPoint(firstLeaf.x, firstLeaf.y);

    // 1. Grab leaf
    const grab = pass.startGrab(placement);
    expect(grab).not.toBeNull();
    expect(grab?.leafIndex).toBe(0);
    expect(pass.isGrabbed(0)).toBe(true);

    // 2. Tiny nudge (< 4px) should be treated as a tap, not repositioning
    pass.updateGrab({ x: placement.x + 1, y: placement.y + 1 });
    const endTap = pass.endGrab();
    expect(endTap?.wasDragged).toBe(false);
    expect(firstLeaf.x).toBe(initialX);
    expect(firstLeaf.y).toBe(initialY);
    expect(pass.isGrabbed()).toBe(false);

    // 3. Significant drag (>= 4px) should reposition the leaf permanently
    pass.startGrab(placement);
    const targetPoint = { x: placement.x + 60, y: placement.y + 40 };
    const updateResult = pass.updateGrab(targetPoint);
    expect(updateResult?.isDragging).toBe(true);

    const endDrag = pass.endGrab(targetPoint);
    expect(endDrag?.wasDragged).toBe(true);
    expect(endDrag?.leafIndex).toBe(0);
    expect(firstLeaf.x).not.toBe(initialX);
    expect(firstLeaf.y).not.toBe(initialY);

    // 4. Verify pass updates cleanly after repositioning
    pass.update(2.0);
    expect(pass.isGrabbed()).toBe(false);

    // Restore original coordinates for subsequent tests
    firstLeaf.x = initialX;
    firstLeaf.y = initialY;
  });

  it("supports canceling an active grab", () => {
    const pass = new LotusLeavesPass();
    pass.update(1.0);

    const firstLeaf = LOTUS_LEAVES[0];
    const placement = viewportPoint(firstLeaf.x, firstLeaf.y);

    pass.startGrab(placement);
    expect(pass.isGrabbed(0)).toBe(true);

    pass.cancelGrab();
    expect(pass.isGrabbed(0)).toBe(false);
  });
});
