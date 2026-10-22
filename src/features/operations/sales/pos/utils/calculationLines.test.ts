import test from "node:test";
import assert from "node:assert/strict";
import {
  getCalculationLinesForCartItem,
  sumCalculatedAmount,
} from "./calculationLines";

const lines = [
  {
    inventoryId: 42,
    batchId: 9,
    taxableAmount: 65.25,
    gstAmount: 11.75,
    lineTotal: 77,
  },
  {
    inventoryId: 42,
    batchId: 10,
    taxableAmount: 40.1,
    gstAmount: 7.22,
    lineTotal: 47.32,
  },
  {
    inventoryId: 43,
    batchId: 11,
    taxableAmount: 10,
    gstAmount: 0,
    lineTotal: 10,
  },
];

test("selected batch matches only its server line", () => {
  assert.deepEqual(
    getCalculationLinesForCartItem({ inventoryId: 42, batchId: 9 }, lines),
    [lines[0]],
  );
});

test("saved cart without a batch matches FIFO allocation lines", () => {
  const matches = getCalculationLinesForCartItem({ inventoryId: 42 }, lines);
  assert.deepEqual(matches, lines.slice(0, 2));
  assert.equal(sumCalculatedAmount(matches, "lineTotal"), 124.32);
});

test("unrelated products and missing inventory do not match", () => {
  assert.deepEqual(
    getCalculationLinesForCartItem({ inventoryId: 44 }, lines),
    [],
  );
  assert.deepEqual(getCalculationLinesForCartItem({}, lines), []);
});
