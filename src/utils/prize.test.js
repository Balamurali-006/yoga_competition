import { getCompleteScoreTotal, getPrizeForScore } from "./prize";

test("only calculates totals when all five Asana scores are valid", () => {
  expect(getCompleteScoreTotal([9, 10, 9, 9, 9])).toBe(46);
  expect(getCompleteScoreTotal([6, 5, 6, 6, 6])).toBe(29);
  expect(getCompleteScoreTotal([null, null, null, null, null])).toBeNull();
  expect(getCompleteScoreTotal([8, 8, 8, 8, null])).toBeNull();
  expect(getCompleteScoreTotal([8, 8, 8, 8, 11])).toBeNull();
});

test("classifies prize boundaries from the total score", () => {
  expect(getPrizeForScore(50)).toBe("1st Prize");
  expect(getPrizeForScore(40)).toBe("1st Prize");
  expect(getPrizeForScore(39.5)).toBe("2nd Prize");
  expect(getPrizeForScore(30.5)).toBe("2nd Prize");
  expect(getPrizeForScore(30)).toBe("3rd Prize");
  expect(getPrizeForScore(0)).toBe("3rd Prize");
});

test("does not award a prize for invalid scores", () => {
  expect(getPrizeForScore(-1)).toBe("");
  expect(getPrizeForScore(50.5)).toBe("");
  expect(getPrizeForScore(Number.NaN)).toBe("");
});
