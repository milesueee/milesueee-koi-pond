import { describe, expect, it } from "vitest";
import { FoodPass } from "./food";
import { School } from "./school";

describe("FoodPass", () => {
  it("initializes without errors and creates scene groups", () => {
    const food = new FoodPass();
    expect(food.shadowGroup).toBeDefined();
    expect(food.group).toBeDefined();
    expect(food.getPellets()).toHaveLength(0);
  });

  it("spawns pellets around target point", () => {
    const food = new FoodPass();
    food.spawnAt({ x: 200, y: 150 }, 6);
    expect(food.getPellets()).toHaveLength(6);
    const first = food.getPellets()[0];
    expect(first.x).toBeGreaterThan(180);
    expect(first.x).toBeLessThan(220);
    expect(first.y).toBeGreaterThan(130);
    expect(first.y).toBeLessThan(170);
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
});
