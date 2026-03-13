import { describe, expect, test } from "bun:test";
import {
  meetsMinimumPrimaryInvestment,
  minimumPrimaryUnits,
  primaryInvestmentAmountInrMinor,
} from "./investment";

describe("investment helpers", () => {
  test("computes a primary investment amount", () => {
    expect(primaryInvestmentAmountInrMinor(10, 25_000)).toBe(2_50_000);
  });

  test("rounds the minimum unit count up to the next full unit", () => {
    expect(minimumPrimaryUnits(1_50_001, 15_000)).toBe(11);
  });

  test("accepts allocations that satisfy the minimum investment", () => {
    expect(meetsMinimumPrimaryInvestment(10, 25_000, 2_50_000)).toBe(true);
  });

  test("rejects allocations that are below the minimum investment", () => {
    expect(meetsMinimumPrimaryInvestment(9, 25_000, 2_50_000)).toBe(false);
  });
});
