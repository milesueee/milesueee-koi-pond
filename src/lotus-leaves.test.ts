import { describe, expect, it } from "vitest";
import { LOTUS, LOTUS_LEAVES, viewportPoint } from "./config";
import { computeLeafDrift, LotusLeavesPass } from "./lotus-leaves";

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

  it("computes slow multi-frequency organic compound drift and rotational sway", () => {
    // Test that computeLeafDrift returns compound motion with varying drift and rotation
    const d0 = computeLeafDrift(0, 0, 8.0, 6.0, 0.1);
    const d1 = computeLeafDrift(10, 0, 8.0, 6.0, 0.1);
    const d2 = computeLeafDrift(25, 0, 8.0, 6.0, 0.1);

    expect(typeof d0.driftX).toBe("number");
    expect(typeof d0.driftY).toBe("number");
    expect(typeof d0.rotationDelta).toBe("number");

    // Drift should be non-zero and vary smoothly over time
    expect(d0.driftX).not.toBe(d1.driftX);
    expect(d0.driftY).not.toBe(d1.driftY);
    expect(d1.driftX).not.toBe(d2.driftX);

    // Bounded within specified max drift amplitude
    expect(Math.abs(d1.driftX)).toBeLessThanOrEqual(8.001);
    expect(Math.abs(d1.driftY)).toBeLessThanOrEqual(6.001);
    expect(Math.abs(d1.rotationDelta)).toBeLessThanOrEqual(0.101);
  });

  it("moves leaves slowly across the pond surface as time progresses", () => {
    const pass = new LotusLeavesPass();
    LOTUS.driftX = 7.0;
    LOTUS.driftY = 5.5;
    LOTUS.rotationAmount = 0.09;

    pass.update(0);
    const state0 = pass.getLeafState(0);
    expect(state0).not.toBeNull();
    const x0 = state0!.visualCenterX;
    const y0 = state0!.visualCenterY;

    // Advance by 12 seconds
    pass.update(12);
    const state1 = pass.getLeafState(0);
    const x1 = state1!.visualCenterX;
    const y1 = state1!.visualCenterY;

    // The leaf should have drifted smoothly across the water
    const distanceMoved = Math.hypot(x1 - x0, y1 - y0);
    expect(distanceMoved).toBeGreaterThan(1.5);
  });

  it("randomizes speed, rotation, and drift behavior across different leaves", () => {
    // Leaf 0 vs Leaf 1 vs Leaf 2 should exhibit different individual speeds, rotation deltas, and drift trajectories
    const leaf0 = computeLeafDrift(5, 0, 0, 12, 10, 0.15);
    const leaf1 = computeLeafDrift(5, 0, 1, 12, 10, 0.15);
    const leaf2 = computeLeafDrift(5, 0, 2, 12, 10, 0.15);

    expect(leaf0.driftX).not.toBeCloseTo(leaf1.driftX, 3);
    expect(leaf0.rotationDelta).not.toBeCloseTo(leaf1.rotationDelta, 3);
    expect(leaf1.driftY).not.toBeCloseTo(leaf2.driftY, 3);
  });
});
