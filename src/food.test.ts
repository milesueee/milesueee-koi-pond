import { describe, expect, it } from "vitest";
import { RIPPLES } from "./config";
import { FoodPass } from "./food";
import { School } from "./school";

describe("FoodPass", () => {
  it("initializes without errors and creates scene groups", () => {
    const food = new FoodPass();
    expect(food.shadowGroup).toBeDefined();
    expect(food.group).toBeDefined();
    expect(food.getPellets()).toHaveLength(0);
  });

  it("spawns pellets around target point with initial float state", () => {
    const food = new FoodPass();
    food.spawnAt({ x: 200, y: 150 }, 6);
    expect(food.getPellets()).toHaveLength(6);
    const first = food.getPellets()[0];
    expect(first.x).toBeGreaterThan(180);
    expect(first.x).toBeLessThan(220);
    expect(first.y).toBeGreaterThan(130);
    expect(first.y).toBeLessThan(170);
    expect(first.depth).toBe(0);
    expect(first.floatDuration).toBeGreaterThan(6);
  });

  it("progresses pellet depth from float to sink over time", () => {
    const food = new FoodPass();
    const school = new School();
    food.spawnAt({ x: 200, y: 150 }, 1);
    const pellet = food.getPellets()[0];
    expect(pellet.depth).toBe(0);

    // Initial update
    food.update(0.016, school);
    expect(pellet.depth).toBe(0);

    // Step forward past float duration into sink phase
    const step = 0.05;
    for (let t = 0.02; t <= pellet.floatDuration + 2.0; t += step) {
      food.update(t, school);
    }
    expect(pellet.depth).toBeGreaterThan(0);
    expect(pellet.depth).toBeLessThanOrEqual(1.0);
  });

  it("reacts to water ripples by gaining outward velocity", () => {
    const food = new FoodPass();
    const school = new School();
    // Spawn pellet at (250, 200)
    food.spawnAt({ x: 250, y: 200 }, 1);
    const pellet = food.getPellets()[0];
    pellet.vx = 0;
    pellet.vy = 0;

    // Trigger a touch ripple at (200, 200) - 50px to the left of the pellet
    school.ripples.trigger("touch", { x: 200, y: 200 });

    const activeRipple = school.ripples.instances.find(
      (r) => r.alive && r.type === "touch",
    );
    expect(activeRipple).toBeDefined();
    if (activeRipple) {
      const profile = RIPPLES.types.touch;
      // Position wavefront directly at distance 50
      activeRipple.age = (50 - profile.startRadius) / profile.expansionSpeed;
    }

    food.update(0.016, school);

    // Pellet should be pushed outward (positive X direction, away from 200)
    expect(pellet.vx).toBeGreaterThan(0);
  });

  it("updates and cleans up food pellets cleanly", () => {
    const food = new FoodPass();
    const school = new School();
    food.spawnAt({ x: 100, y: 100 }, 5);
    expect(food.getPellets()).toHaveLength(5);

    food.update(0.1, school);
    expect(food.getPellets()).toHaveLength(5);

    food.clear();
    expect(food.getPellets()).toHaveLength(0);

    expect(() => food.dispose()).not.toThrow();
  });

  it("triggers subtle drop ripple on feedAt without heavy touch ripples", () => {
    const school = new School();
    school.feedAt({ x: 300, y: 300 });

    const touchRipples = school.ripples.instances.filter(
      (r) => r.alive && r.type === "touch",
    );
    expect(touchRipples).toHaveLength(0);

    const rainRipples = school.ripples.instances.filter(
      (r) => r.alive && r.type === "rain",
    );
    expect(rainRipples).toHaveLength(1);
    expect(rainRipples[0].strength).toBeLessThan(1.0);
  });
});

