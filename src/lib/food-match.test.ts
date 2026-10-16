import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findBestFoodMatch, isRawStaple, mentionsUncooked, pickFood } from "./food-match";

type Food = {
  id: string;
  name: string;
  aliases: string[];
  foodGroup: string | null;
  ifctCode: string | null;
  caloriesPer100g: number;
};

const curated = (name: string, aliases: string[], kcal: number): Food => ({
  id: name, name, aliases, foodGroup: null, ifctCode: null, caloriesPer100g: kcal,
});
const ifct = (code: string, name: string, group: string, kcal: number): Food => ({
  id: code, name, aliases: [], foodGroup: group, ifctCode: code, caloriesPer100g: kcal,
});

const rajmaCooked = curated("Rajma (kidney bean curry)", ["rajma"], 140);
const steamedRice = curated("Steamed rice", ["chawal"], 130);
const redGramDal = ifct("B021", "Red gram, dal", "Grain Legumes", 331);
const rajmahBrown = ifct("B019", "Rajmah, brown", "Grain Legumes", 298);
const riceRaw = ifct("A015", "Rice, raw, milled", "Cereals and Millets", 356);
const attaFlour = ifct("A019", "Wheat flour, atta", "Cereals and Millets", 320);
const paneer = ifct("M001", "Paneer", "Milk and Milk Products", 257);

describe("isRawStaple", () => {
  it("flags IFCT pulses and whole grains", () => {
    assert.equal(isRawStaple(redGramDal), true);
    assert.equal(isRawStaple(rajmahBrown), true);
    assert.equal(isRawStaple(riceRaw), true);
  });
  it("does not flag curated cooked dishes, flours or other food groups", () => {
    assert.equal(isRawStaple(rajmaCooked), false);
    assert.equal(isRawStaple(steamedRice), false);
    assert.equal(isRawStaple(attaFlour), false);
    assert.equal(isRawStaple(paneer), false);
  });
});

describe("pickFood", () => {
  it("skips a raw semantic match for a cooked portion and uses the cooked old match", () => {
    const r = pickFood("rajma", rajmahBrown, rajmaCooked);
    assert.equal(r.food, rajmaCooked);
    assert.equal(r.used, "old");
    assert.equal(r.skippedRaw, true);
  });
  it("falls back to no match (AI estimate) when only raw foods match", () => {
    const r = pickFood("dal", redGramDal, null);
    assert.equal(r.food, null);
    assert.equal(r.used, "none");
    assert.equal(r.skippedRaw, true);
  });
  it("still prefers the semantic match when it is a cooked/curated food", () => {
    const r = pickFood("rice", steamedRice, null);
    assert.equal(r.food, steamedRice);
    assert.equal(r.used, "new");
    assert.equal(r.skippedRaw, false);
  });
  it("allows raw foods when the user says raw/dry/flour", () => {
    assert.equal(mentionsUncooked("raw rice"), true);
    assert.equal(mentionsUncooked("dry rajma"), true);
    assert.equal(mentionsUncooked("rice"), false);
    assert.equal(pickFood("raw rice", riceRaw, null).food, riceRaw);
  });
  it("does not touch non-staple IFCT foods", () => {
    assert.equal(pickFood("paneer", paneer, null).food, paneer);
  });
});

describe("old matcher with IFCT rows present (regression guard)", () => {
  it("'rajma' resolves to the curated cooked row via its alias", () => {
    assert.equal(findBestFoodMatch("rajma", [rajmahBrown, rajmaCooked, steamedRice]), rajmaCooked);
  });
});
