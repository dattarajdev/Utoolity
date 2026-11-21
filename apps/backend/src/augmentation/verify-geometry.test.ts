import test from "node:test";
import assert from "node:assert/strict";
import {
  executeGeometryVerification,
  generateSyntheticImageBuffer,
  SYNTHETIC_SCENARIOS,
} from "./verify-geometry.service.js";
import { yoloToPixel } from "./sher.js";
import sharp from "sharp";

test("Verify Geometry Service - Synthetic Image Generation", async () => {
  const scenario = SYNTHETIC_SCENARIOS["single-centered"]!;
  const buffer = await generateSyntheticImageBuffer(scenario.dimensions, scenario.boxes);

  assert.ok(buffer);
  assert.ok(buffer.length > 0);

  const meta = await sharp(buffer).metadata();
  assert.strictEqual(meta.width, 600);
  assert.strictEqual(meta.height, 600);
  assert.strictEqual(meta.format, "png");
});

test("Verify Geometry Service - 90° Clockwise Rotation with Canvas Expansion", async () => {
  const result = await executeGeometryVerification({
    operation: {
      type: "rotate",
      params: { angle: 90, expandCanvas: true },
    },
    imageSource: {
      type: "synthetic",
      scenarioId: "aspect-ratio-2to1", // 800x400
    },
  });

  // 800x400 rotated 90° expands to 400x800
  assert.strictEqual(result.dimensions.source.width, 800);
  assert.strictEqual(result.dimensions.source.height, 400);
  assert.strictEqual(result.dimensions.expectedTarget.width, 400);
  assert.strictEqual(result.dimensions.expectedTarget.height, 800);
  assert.strictEqual(result.dimensions.actualTarget.width, 400);
  assert.strictEqual(result.dimensions.actualTarget.height, 800);
  assert.strictEqual(result.dimensions.isConsistent, true);

  assert.strictEqual(result.transformedBoxes.length, 1);
  assert.ok(result.transformedImageBase64.startsWith("data:image/png;base64,"));
  assert.strictEqual(result.summary.retainedCount, 1);
  assert.strictEqual(result.summary.discardedCount, 0);
});

test("Verify Geometry Service - 45° Rotation with Canvas Expansion Dimension Check", async () => {
  const result = await executeGeometryVerification({
    operation: {
      type: "rotate",
      params: { angle: 45, expandCanvas: true },
    },
    imageSource: {
      type: "synthetic",
      scenarioId: "single-centered", // 600x600
    },
  });

  // 600x600 at 45° expands to round(600*sqrt(2)) = round(848.528) = 849
  assert.strictEqual(result.dimensions.expectedTarget.width, 849);
  assert.strictEqual(result.dimensions.expectedTarget.height, 849);
  assert.strictEqual(result.dimensions.actualTarget.width, 849);
  assert.strictEqual(result.dimensions.actualTarget.height, 849);
  assert.strictEqual(result.dimensions.isConsistent, true);
  assert.strictEqual(result.summary.retainedCount, 1);
});

test("Verify Geometry Service - 45° Rotation without Canvas Expansion (Preserves 600x600)", async () => {
  const result = await executeGeometryVerification({
    operation: {
      type: "rotate",
      params: { angle: 45, expandCanvas: false },
    },
    imageSource: {
      type: "synthetic",
      scenarioId: "single-centered", // 600x600
    },
  });

  assert.strictEqual(result.dimensions.expectedTarget.width, 600);
  assert.strictEqual(result.dimensions.expectedTarget.height, 600);
  assert.strictEqual(result.dimensions.actualTarget.width, 600);
  assert.strictEqual(result.dimensions.actualTarget.height, 600);
  assert.strictEqual(result.dimensions.isConsistent, true);
  assert.strictEqual(result.summary.retainedCount, 1);
});

test("Verify Geometry Service - Horizontal and Vertical Flips", async () => {
  const flipHResult = await executeGeometryVerification({
    operation: { type: "flip_h" },
    imageSource: { type: "synthetic", scenarioId: "border-object" },
  });
  assert.strictEqual(flipHResult.dimensions.isConsistent, true);
  assert.strictEqual(flipHResult.transformedBoxes.length, 1);
  // cx was 0.95, after flip_h should be 0.05
  assert.ok(Math.abs(flipHResult.transformedBoxes[0]!.cx - 0.05) < 1e-4);

  const flipVResult = await executeGeometryVerification({
    operation: { type: "flip_v" },
    imageSource: { type: "synthetic", scenarioId: "corner-object" },
  });
  assert.strictEqual(flipVResult.dimensions.isConsistent, true);
  assert.strictEqual(flipVResult.transformedBoxes.length, 1);
  // cy was 0.12, after flip_v should be 0.88
  assert.ok(Math.abs(flipVResult.transformedBoxes[0]!.cy - 0.88) < 1e-4);
});

test("Verify Geometry Service - 360° Sweep Interval Testing", async () => {
  // Interval 1 of 4 = 90°
  const step1 = await executeGeometryVerification({
    operation: {
      type: "rotate360",
      params: { intervals: 4, activeInterval: 1, expandCanvas: false },
    },
    imageSource: { type: "synthetic", scenarioId: "single-centered" },
  });
  assert.strictEqual(step1.operation.effectiveAngle, 90);

  // Interval 2 of 4 = 180°
  const step2 = await executeGeometryVerification({
    operation: {
      type: "rotate360",
      params: { intervals: 4, activeInterval: 2, expandCanvas: false },
    },
    imageSource: { type: "synthetic", scenarioId: "single-centered" },
  });
  assert.strictEqual(step2.operation.effectiveAngle, 180);

  // Interval 3 of 4 = 270°
  const step3 = await executeGeometryVerification({
    operation: {
      type: "rotate360",
      params: { intervals: 4, activeInterval: 3, expandCanvas: false },
    },
    imageSource: { type: "synthetic", scenarioId: "single-centered" },
  });
  assert.strictEqual(step3.operation.effectiveAngle, 270);
});

test("Verify Geometry Service - Visibility Threshold Scenarios (5.00%, 5.01%, 4.99%)", async () => {
  // 1. Exactly 5.00% retained
  const exact5 = await executeGeometryVerification({
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    imageSource: { type: "synthetic", scenarioId: "threshold-exact-5" },
  });
  assert.strictEqual(exact5.summary.retainedCount, 1, "Exactly 5.0% must be retained");
  assert.strictEqual(exact5.summary.discardedCount, 0);
  assert.strictEqual(exact5.retentionDetails[0]?.retained, true);

  // 2. 5.01% retained
  const above5 = await executeGeometryVerification({
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    imageSource: { type: "synthetic", scenarioId: "threshold-above-5" },
  });
  assert.strictEqual(above5.summary.retainedCount, 1, "5.01% must be retained");
  assert.strictEqual(above5.summary.discardedCount, 0);
  assert.strictEqual(above5.retentionDetails[0]?.retained, true);

  // 3. 4.99% discarded
  const below5 = await executeGeometryVerification({
    operation: { type: "rotate", params: { angle: 0, expandCanvas: false } },
    imageSource: { type: "synthetic", scenarioId: "threshold-below-5" },
  });
  assert.strictEqual(below5.summary.retainedCount, 0, "4.99% must be discarded");
  assert.strictEqual(below5.summary.discardedCount, 1);
  assert.strictEqual(below5.retentionDetails[0]?.retained, false);
});
