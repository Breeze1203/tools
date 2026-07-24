const assert = require("node:assert/strict");
const {
  displayNumber,
  analyzeNodes,
  duration,
  formatPercent,
  formatTime,
  percentage,
  totalActualTime,
  totalSelfTime,
} = require("../metrics");

const missingActual = {
  actualStart: null,
  actualEnd: null,
};

const invalidActual = {
  actualStart: Number.NaN,
  actualEnd: Number.NaN,
};

const validActual = {
  actualStart: 0.1,
  actualEnd: 0.25,
};

assert.equal(duration(missingActual), null);
assert.equal(duration(invalidActual), null);
assert.equal(duration(validActual), 0.25);
assert.equal(totalActualTime([missingActual, invalidActual]), null);
assert.equal(totalActualTime([missingActual, validActual]), 0.25);
assert.equal(percentage(null, 0.25), null);
assert.equal(percentage(Number.NaN, 0.25), null);
assert.equal(formatTime(duration(missingActual)), "-");
assert.equal(formatPercent(percentage(duration(missingActual), 0.25)), "-");
assert.equal(displayNumber(Number.NaN), "-");

const parent = {
  actualStart: 0,
  actualEnd: 10,
  actualRows: 100,
  estimatedRows: 10,
  loops: 1,
  operation: "Nested loop join",
  children: [],
};
const child = {
  actualStart: 0,
  actualEnd: 7,
  actualRows: 100,
  estimatedRows: 100,
  loops: 1,
  operation: "Index lookup",
  children: [],
};
parent.children.push(child);

assert.equal(totalSelfTime([parent, child]), 10);

const analyzed = analyzeNodes([parent, child]);
assert.equal(analyzed.enriched[0].self, 3);
assert.equal(analyzed.enriched[1].self, 7);
assert.equal(analyzed.enriched[0].ratio, 10);
assert.equal(analyzed.enriched[0].estimateLevel, "warning");

console.log("metrics tests passed");
