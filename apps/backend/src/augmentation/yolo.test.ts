import test from "node:test";
import assert from "node:assert/strict";

import {
  parseYoloLine,
  parseYoloAnnotations,
  validateYoloBox,
  formatYoloLine,
  serializeYoloAnnotations,
  yoloToPixel,
  pixelToYolo,
  boxToTuple,
  tupleToBox,
  clipBox,
  clipPixelBox,
  flipHorizontalBox,
  flipVerticalBox,
  getRotationAffineMatrix,
  rotateBox,
  rotateBoxes,
  transformBoxAffine,
  DEFAULT_MIN_AREA_RATIO,
  VISIBILITY_EPSILON,
} from "./yolo.js";
import type { YoloBox, PixelBox, ImageDimensions, AffineMatrix2D } from "./types.js";

// Helper: compare numbers with a small floating-point tolerance
function assertClose(actual: number, expected: number, tolerance = 1e-4, msg?: string) {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tolerance,
    `${msg ?? "Number comparison"}: expected ${expected}, got ${actual} (diff: ${diff} > ${tolerance})`,
  );
}

// Helper: compare YoloBoxes with floating-point tolerance
function assertBoxClose(actual: YoloBox, expected: YoloBox, tolerance = 1e-4) {
  assert.strictEqual(actual.classId, expected.classId, "classId mismatch");
  assertClose(actual.cx, expected.cx, tolerance, "cx mismatch");
  assertClose(actual.cy, expected.cy, tolerance, "cy mismatch");
  assertClose(actual.w, expected.w, tolerance, "w mismatch");
  assertClose(actual.h, expected.h, tolerance, "h mismatch");
}

// ============================================================================
// 1. Parsing and Validation Tests
// ============================================================================

test("YOLO Parsing - Valid single and multi-object annotations", () => {
  const input = `
    0 0.500000 0.500000 0.200000 0.400000
    1 0.250000 0.750000 0.100000 0.150000
  `;
  const result = parseYoloAnnotations(input);
  assert.strictEqual(result.validCount, 2);
  assert.strictEqual(result.invalidCount, 0);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.boxes.length, 2);

  assertBoxClose(result.boxes[0]!, { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.4 });
  assertBoxClose(result.boxes[1]!, { classId: 1, cx: 0.25, cy: 0.75, w: 0.1, h: 0.15 });
});

test("YOLO Parsing - Empty annotation string and whitespace-only content", () => {
  const emptyResult = parseYoloAnnotations("");
  assert.strictEqual(emptyResult.boxes.length, 0);
  assert.strictEqual(emptyResult.errors.length, 0);
  assert.strictEqual(emptyResult.validCount, 0);
  assert.strictEqual(emptyResult.invalidCount, 0);

  const whitespaceResult = parseYoloAnnotations("   \n\t  \r\n  \n  ");
  assert.strictEqual(whitespaceResult.boxes.length, 0);
  assert.strictEqual(whitespaceResult.errors.length, 0);
});

test("YOLO Parsing - Reject malformed token counts", () => {
  // 4 tokens (missing h)
  const line4 = parseYoloLine("0 0.5 0.5 0.2", 1);
  assert.strictEqual(line4.box, null);
  assert.ok(line4.error);
  assert.strictEqual(line4.error.lineNumber, 1);
  assert.ok(line4.error.errors[0]?.includes("Expected 5 whitespace-separated values"));

  // 6 tokens (extra value)
  const line6 = parseYoloLine("0 0.5 0.5 0.2 0.2 0.9", 2);
  assert.strictEqual(line6.box, null);
  assert.ok(line6.error);
  assert.strictEqual(line6.error.lineNumber, 2);

  // Non-numeric tokens
  const lineStr = parseYoloLine("cat 0.5 0.5 0.2 0.2", 3);
  assert.strictEqual(lineStr.box, null);
  assert.ok(lineStr.error);
});

test("YOLO Parsing - Reject NaN and non-finite values", () => {
  const nanLine = parseYoloLine("0 NaN 0.5 0.2 0.2", 1);
  assert.strictEqual(nanLine.box, null);
  assert.ok(nanLine.error);
  assert.ok(nanLine.error.errors.some((e) => e.includes("finite")));

  const infLine = parseYoloLine("0 0.5 Infinity 0.2 0.2", 2);
  assert.strictEqual(infLine.box, null);
  assert.ok(infLine.error);
});

test("YOLO Validation - Class ID checks and metadata bounding", () => {
  // Negative class ID
  const negClass = validateYoloBox({ classId: -1, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 });
  assert.ok(negClass.some((e) => e.includes("non-negative integer")));

  // Non-integer class ID
  const floatClass = validateYoloBox({ classId: 1.5, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 });
  assert.ok(floatClass.some((e) => e.includes("non-negative integer")));

  // Class ID within metadata
  const validMetadata = validateYoloBox(
    { classId: 1, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 },
    ["cat", "dog"],
  );
  assert.strictEqual(validMetadata.length, 0);

  // Class ID exceeding metadata (classId=2 with 2 classes [0, 1])
  const exceedMetadata = validateYoloBox(
    { classId: 2, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 },
    ["cat", "dog"],
  );
  assert.ok(exceedMetadata.some((e) => e.includes("out of bounds for defined metadata")));

  // Class ID without metadata defines no upper bound limit
  const highClassNoMeta = validateYoloBox(
    { classId: 99, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 },
    null,
  );
  assert.strictEqual(highClassNoMeta.length, 0);
});

test("YOLO Validation - Normalized coordinate boundaries [0.0, 1.0]", () => {
  assert.ok(validateYoloBox({ classId: 0, cx: -0.01, cy: 0.5, w: 0.2, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 1.01, cy: 0.5, w: 0.2, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: -0.01, w: 0.2, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 1.01, w: 0.2, h: 0.2 }).length > 0);

  // Width and height must be > 0 and <= 1.0
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 0.5, w: 0.0, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 0.5, w: -0.1, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 0.5, w: 1.05, h: 0.2 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.0 }).length > 0);
  assert.ok(validateYoloBox({ classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 1.05 }).length > 0);
});

test("YOLO Serialization - Formats coordinates correctly with 6 decimal places", () => {
  const boxes: YoloBox[] = [
    { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.4 },
    { classId: 3, cx: 0.1234567, cy: 0.9876543, w: 0.1, h: 0.2 },
  ];
  const serialized = serializeYoloAnnotations(boxes);
  const lines = serialized.trim().split("\n");
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], "0 0.500000 0.500000 0.200000 0.400000");
  assert.strictEqual(lines[1], "3 0.123457 0.987654 0.100000 0.200000");

  // Round-trip parse
  const parsed = parseYoloAnnotations(serialized);
  assert.strictEqual(parsed.boxes.length, 2);
  assertBoxClose(parsed.boxes[0]!, boxes[0]!);
  assertClose(parsed.boxes[1]!.cx, 0.123457);
  assertClose(parsed.boxes[1]!.cy, 0.987654);
});

// ============================================================================
// 2. Coordinate Conversion & Round Trips
// ============================================================================

test("Coordinate Conversion - Pixel to Normalized Round-Trip Precision", () => {
  const dimensionsList: ImageDimensions[] = [
    { width: 100, height: 100 },
    { width: 640, height: 480 },
    { width: 1920, height: 1080 },
    { width: 4096, height: 2160 },
  ];

  const testBoxes: YoloBox[] = [
    { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.4 },
    { classId: 1, cx: 0.15, cy: 0.85, w: 0.1, h: 0.2 },
    { classId: 2, cx: 0.8234, cy: 0.3456, w: 0.25, h: 0.35 },
  ];

  for (const dims of dimensionsList) {
    for (const original of testBoxes) {
      const pixel = yoloToPixel(original, dims);
      const reconstructed = pixelToYolo(
        pixel.classId,
        pixel.x1,
        pixel.y1,
        pixel.x2,
        pixel.y2,
        dims,
      );
      assertBoxClose(reconstructed, original, 1e-6);
    }
  }
});

test("Tuple conversion helpers", () => {
  const box: YoloBox = { classId: 2, cx: 0.4, cy: 0.6, w: 0.2, h: 0.3 };
  const tuple = boxToTuple(box);
  assert.deepStrictEqual(tuple, [2, 0.4, 0.6, 0.2, 0.3]);
  const back = tupleToBox(tuple);
  assert.deepStrictEqual(back, box);
});

// ============================================================================
// 3. Flips & Mathematical Correctness
// ============================================================================

test("Flip Transformations - Horizontal Flip (cx' = 1 - cx)", () => {
  const original: YoloBox = { classId: 4, cx: 0.2, cy: 0.3, w: 0.15, h: 0.25 };
  const flipped = flipHorizontalBox(original);

  assert.strictEqual(flipped.classId, 4);
  assertClose(flipped.cx, 0.8);
  assertClose(flipped.cy, 0.3);
  assertClose(flipped.w, 0.15);
  assertClose(flipped.h, 0.25);

  // Double flip returns exact original
  const doubleFlipped = flipHorizontalBox(flipped);
  assertBoxClose(doubleFlipped, original);

  // Centered box cx = 0.5 remains at cx = 0.5
  const centerBox: YoloBox = { classId: 0, cx: 0.5, cy: 0.4, w: 0.2, h: 0.2 };
  assertClose(flipHorizontalBox(centerBox).cx, 0.5);
});

test("Flip Transformations - Vertical Flip (cy' = 1 - cy)", () => {
  const original: YoloBox = { classId: 7, cx: 0.4, cy: 0.15, w: 0.3, h: 0.2 };
  const flipped = flipVerticalBox(original);

  assert.strictEqual(flipped.classId, 7);
  assertClose(flipped.cx, 0.4);
  assertClose(flipped.cy, 0.85);
  assertClose(flipped.w, 0.3);
  assertClose(flipped.h, 0.2);

  // Double flip returns exact original
  const doubleFlipped = flipVerticalBox(flipped);
  assertBoxClose(doubleFlipped, original);

  // Centered box cy = 0.5 remains at cy = 0.5
  const centerBox: YoloBox = { classId: 0, cx: 0.3, cy: 0.5, w: 0.2, h: 0.2 };
  assertClose(flipVerticalBox(centerBox).cy, 0.5);
});

// ============================================================================
// 4. Rotation Mathematics & Envelope Calculation
// ============================================================================

test("Rotation - 90° clockwise rotation on centered square box", () => {
  const dims: ImageDimensions = { width: 200, height: 200 };
  const box: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };

  const rotated = rotateBox(box, dims, 90, false);
  assert.ok(rotated);
  assert.strictEqual(rotated.classId, 0);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);
  assertClose(rotated.w, 0.2);
  assertClose(rotated.h, 0.2);
});

test("Rotation - 90° clockwise rotation swaps width and height for non-square box", () => {
  const dims: ImageDimensions = { width: 100, height: 100 };
  // Centered rectangular box: width=0.4, height=0.2
  const box: YoloBox = { classId: 1, cx: 0.5, cy: 0.5, w: 0.4, h: 0.2 };

  const rotated = rotateBox(box, dims, 90, false);
  assert.ok(rotated);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);
  // After 90° rotation, width becomes 0.2 and height becomes 0.4
  assertClose(rotated.w, 0.2);
  assertClose(rotated.h, 0.4);
});

test("Rotation - 180° rotation mirrors center around image center (0.5, 0.5)", () => {
  const dims: ImageDimensions = { width: 500, height: 500 };
  const box: YoloBox = { classId: 2, cx: 0.3, cy: 0.3, w: 0.1, h: 0.2 };

  const rotated = rotateBox(box, dims, 180, false);
  assert.ok(rotated);
  // cx' = 1 - 0.3 = 0.7, cy' = 1 - 0.3 = 0.7
  assertClose(rotated.cx, 0.7);
  assertClose(rotated.cy, 0.7);
  assertClose(rotated.w, 0.1);
  assertClose(rotated.h, 0.2);
});

test("Rotation - 45° rotation calculates bounding envelope matching sqrt(2) expansion", () => {
  const dims: ImageDimensions = { width: 200, height: 200 };
  // Centered square box of size 0.2 x 0.2
  const box: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };

  const rotated = rotateBox(box, dims, 45, false);
  assert.ok(rotated);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);

  // A square rotated 45° has bounding envelope dimension side * sqrt(2)
  const expectedSide = 0.2 * Math.SQRT2; // ~0.282843
  assertClose(rotated.w, expectedSide, 1e-3);
  assertClose(rotated.h, expectedSide, 1e-3);
});

test("Rotation - Canvas Expansion with expandCanvas = true", () => {
  const dims: ImageDimensions = { width: 200, height: 100 };
  const { outputDimensions } = getRotationAffineMatrix(dims, 90, true);

  // 90° rotation expands canvas to swapped dimensions: width=100, height=200
  assert.strictEqual(outputDimensions.width, 100);
  assert.strictEqual(outputDimensions.height, 200);

  const box: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.4 };
  const rotated = rotateBox(box, dims, 90, true);
  assert.ok(rotated);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);
});

// ============================================================================
// 5. Clipping & Visibility Policy
// ============================================================================

test("Clipping - Box completely inside boundaries is unaltered", () => {
  const box: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };
  const clipped = clipBox(box);
  assert.ok(clipped);
  assertBoxClose(clipped, box);
});

test("Clipping - Box crossing boundary retains classId and recomputes center/dimensions", () => {
  // Box extending past right edge: cx=0.95, w=0.2 => [0.85, 1.05]
  const box: YoloBox = { classId: 5, cx: 0.95, cy: 0.5, w: 0.2, h: 0.2 };
  const clipped = clipBox(box);

  assert.ok(clipped);
  assert.strictEqual(clipped.classId, 5, "Class ID must be preserved");
  // Clipped to [0.85, 1.0] => width = 0.15, center = (0.85 + 1.0) / 2 = 0.925
  assertClose(clipped.w, 0.15);
  assertClose(clipped.cx, 0.925);
  assertClose(clipped.h, 0.2);
  assertClose(clipped.cy, 0.5);
});

test("Clipping - Box fully outside image is rejected (returns null)", () => {
  // Completely off the right edge
  const offRight: YoloBox = { classId: 0, cx: 1.5, cy: 0.5, w: 0.2, h: 0.2 };
  assert.strictEqual(clipBox(offRight), null);

  // Completely off the left edge
  const offLeft: YoloBox = { classId: 0, cx: -0.5, cy: 0.5, w: 0.2, h: 0.2 };
  assert.strictEqual(clipBox(offLeft), null);

  // Completely off the top
  const offTop: YoloBox = { classId: 0, cx: 0.5, cy: -0.5, w: 0.2, h: 0.2 };
  assert.strictEqual(clipBox(offTop), null);

  // Completely off the bottom
  const offBottom: YoloBox = { classId: 0, cx: 0.5, cy: 1.5, w: 0.2, h: 0.2 };
  assert.strictEqual(clipBox(offBottom), null);
});

test("Clipping - Minimum visibility policy (5% area threshold)", () => {
  // Original box has area = 0.2 * 0.2 = 0.04
  // 5% threshold = 0.05 * 0.04 = 0.002
  const original: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };

  // Candidate box overlapping by only 0.005 width (area = 0.005 * 0.2 = 0.001 < 0.002)
  // cx = 1.0 - 0.005/2 = 0.9975, w = 0.2 => x1 = 0.9975 - 0.1 = 0.8975, x2 = 1.0975
  // Overlap is (1.0 - 0.8975) = 0.1025 => area = 0.1025 * 0.2 = 0.0205 > 0.002 (preserved)
  // To make overlap tiny:
  // Let x1 = 0.995, x2 = 1.195 => overlap = 0.005 => area = 0.005 * 0.2 = 0.001 < 0.002
  // cx = (0.995 + 1.195)/2 = 1.095, w = 0.2
  const sliverBox: YoloBox = { classId: 0, cx: 1.095, cy: 0.5, w: 0.2, h: 0.2 };

  // When compared to originalBox, area falls below 5%, so it is discarded
  const discarded = clipBox(sliverBox, DEFAULT_MIN_AREA_RATIO, original);
  assert.strictEqual(discarded, null);

  // But if overlap is 10% (> 5%), it is retained:
  // x1 = 0.98, x2 = 1.18 => overlap = 0.02 => area = 0.02 * 0.2 = 0.004 > 0.002
  // cx = (0.98 + 1.18)/2 = 1.08, w = 0.2
  const retainedBox: YoloBox = { classId: 0, cx: 1.08, cy: 0.5, w: 0.2, h: 0.2 };
  const retained = clipBox(retainedBox, DEFAULT_MIN_AREA_RATIO, original);
  assert.ok(retained);
});

test("Clipping - Zero-area boxes are discarded", () => {
  assert.strictEqual(clipBox({ classId: 0, cx: 0.5, cy: 0.5, w: 0.0, h: 0.2 }), null);
  assert.strictEqual(clipBox({ classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.0 }), null);
});

// ============================================================================
// 6. Multiple Objects and Classes Batch Transformation
// ============================================================================

test("Batch Transformations - Multiple objects with distinct classIds", () => {
  const dims: ImageDimensions = { width: 1000, height: 1000 };
  const boxes: YoloBox[] = [
    { classId: 0, cx: 0.2, cy: 0.2, w: 0.1, h: 0.1 },
    { classId: 1, cx: 0.5, cy: 0.5, w: 0.2, h: 0.3 },
    { classId: 2, cx: 0.8, cy: 0.8, w: 0.15, h: 0.15 },
  ];

  // Rotate 180°
  const result = rotateBoxes(boxes, dims, 180, false);
  assert.strictEqual(result.boxes.length, 3);

  // Verify classId preservation and coordinates
  assert.strictEqual(result.boxes[0]!.classId, 0);
  assertClose(result.boxes[0]!.cx, 0.8);
  assertClose(result.boxes[0]!.cy, 0.8);

  assert.strictEqual(result.boxes[1]!.classId, 1);
  assertClose(result.boxes[1]!.cx, 0.5);
  assertClose(result.boxes[1]!.cy, 0.5);

  assert.strictEqual(result.boxes[2]!.classId, 2);
  assertClose(result.boxes[2]!.cx, 0.2);
  assertClose(result.boxes[2]!.cy, 0.2);
});

// ============================================================================
// 7. Phase 1.1 Targeted Geometry & Visibility Correction Tests
// ============================================================================

// Requirement 1: A 30° rotation
test("Phase 1.1 - 30° rotation on centered rectangular box", () => {
  const dims: ImageDimensions = { width: 1000, height: 1000 };
  const box: YoloBox = { classId: 3, cx: 0.5, cy: 0.5, w: 0.2, h: 0.1 };

  const rotated = rotateBox(box, dims, 30, false);
  assert.ok(rotated);
  assert.strictEqual(rotated.classId, 3);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);

  // Expected envelope: w*cos(30°) + h*sin(30°) and w*sin(30°) + h*cos(30°)
  const expectedW = 0.2 * Math.cos(Math.PI / 6) + 0.1 * Math.sin(Math.PI / 6);
  const expectedH = 0.2 * Math.sin(Math.PI / 6) + 0.1 * Math.cos(Math.PI / 6);
  assertClose(rotated.w, expectedW, 1e-4);
  assertClose(rotated.h, expectedH, 1e-4);
});

// Requirement 2: A 45° rotation
test("Phase 1.1 - 45° clockwise rotation on off-center box", () => {
  const dims: ImageDimensions = { width: 1000, height: 1000 };
  // Box at cx=0.3, cy=0.5 (relative to center dx = -200, dy = 0)
  const box: YoloBox = { classId: 1, cx: 0.3, cy: 0.5, w: 0.1, h: 0.1 };
  const rotated = rotateBox(box, dims, 45, false);
  assert.ok(rotated);
  assert.strictEqual(rotated.classId, 1);

  // Under 45° clockwise rotation: dx' = -200*cos(45°) = -141.421, dy' = -200*sin(45°) = -141.421
  // cx' = (500 - 141.421)/1000 = 0.358579, cy' = (500 - 141.421)/1000 = 0.358579
  assertClose(rotated.cx, 0.358579, 1e-4);
  assertClose(rotated.cy, 0.358579, 1e-4);
  // Bounding envelope of 0.1 x 0.1 square at 45° has width/height = 0.1 * sqrt(2)
  assertClose(rotated.w, 0.1 * Math.SQRT2, 1e-4);
  assertClose(rotated.h, 0.1 * Math.SQRT2, 1e-4);
});

// Requirement 3: Expanded canvas dimensions at 45°
test("Phase 1.1 - Expanded canvas dimensions at 45° for rectangular image", () => {
  const dims: ImageDimensions = { width: 800, height: 600 };
  const { outputDimensions } = getRotationAffineMatrix(dims, 45, true);

  // newW = round(600 * sin(45°) + 800 * cos(45°)) = round(1400 * 0.70710678) = 990
  // newH = round(600 * cos(45°) + 800 * sin(45°)) = round(1400 * 0.70710678) = 990
  assert.strictEqual(outputDimensions.width, 990);
  assert.strictEqual(outputDimensions.height, 990);

  // Centered box remains at (0.5, 0.5) on expanded canvas
  const box: YoloBox = { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 };
  const rotated = rotateBox(box, dims, 45, true);
  assert.ok(rotated);
  assertClose(rotated.cx, 0.5);
  assertClose(rotated.cy, 0.5);
});

// Requirement 4: Exactly 5% visibility retained
test("Phase 1.1 - Exactly 5.0% visibility retained", () => {
  // Pre-clip candidate: w=0.2, h=0.2 (area = 0.04)
  // Clipped to [0, 1]: height=0.2, width=0.01 (overlap = 0.01, clipped area = 0.002)
  // Ratio = 0.002 / 0.04 = 0.050 (exactly 5.0%)
  // x1 = 0.99, x2 = 1.19 => cx = 1.09, w = 0.2
  const box: YoloBox = { classId: 2, cx: 1.09, cy: 0.5, w: 0.2, h: 0.2 };
  const result = clipBox(box, DEFAULT_MIN_AREA_RATIO);
  assert.ok(result, "Box with exactly 5.0% visibility must be retained");
  assert.strictEqual(result.classId, 2);
  assertClose(result.w, 0.01, 1e-6);
  assertClose(result.h, 0.2, 1e-6);
  assertClose(result.cx, 0.995, 1e-6);
  assertClose(result.cy, 0.5, 1e-6);
});

// Requirement 5: 5.01% visibility retained
test("Phase 1.1 - 5.01% visibility retained", () => {
  // Pre-clip area = 0.04 (w=0.2, h=0.2)
  // Clipped area = 0.04 * 0.0501 = 0.002004
  // Clipped width = 0.002004 / 0.2 = 0.01002
  // x1 = 1.0 - 0.01002 = 0.98998, x2 = 0.98998 + 0.2 = 1.18998
  // cx = (0.98998 + 1.18998) / 2 = 1.08998
  const box: YoloBox = { classId: 7, cx: 1.08998, cy: 0.5, w: 0.2, h: 0.2 };
  const result = clipBox(box, DEFAULT_MIN_AREA_RATIO);
  assert.ok(result, "Box with 5.01% visibility must be retained");
  assert.strictEqual(result.classId, 7);
  assertClose(result.w, 0.01002, 1e-6);
  assertClose(result.h, 0.2, 1e-6);
});

// Requirement 6: 4.99% visibility discarded
test("Phase 1.1 - 4.99% visibility discarded", () => {
  // Pre-clip area = 0.04 (w=0.2, h=0.2)
  // Clipped area = 0.04 * 0.0499 = 0.001996
  // Clipped width = 0.001996 / 0.2 = 0.00998
  // x1 = 1.0 - 0.00998 = 0.99002, x2 = 0.99002 + 0.2 = 1.19002
  // cx = (0.99002 + 1.19002) / 2 = 1.09002
  const box: YoloBox = { classId: 7, cx: 1.09002, cy: 0.5, w: 0.2, h: 0.2 };
  const result = clipBox(box, DEFAULT_MIN_AREA_RATIO);
  assert.strictEqual(result, null, "Box with 4.99% visibility must be discarded");
});

// Requirement 7: A rotated bounding box clipped against the expanded destination canvas
test("Phase 1.1 - Rotated bounding box clipped against expanded destination canvas", () => {
  const srcDims: ImageDimensions = { width: 1000, height: 1000 };
  // Position box near top-right edge in source: cx = 0.95, cy = 0.05, w = 0.1, h = 0.1
  const box: YoloBox = { classId: 4, cx: 0.95, cy: 0.05, w: 0.1, h: 0.1 };

  // Rotate 45° with canvas expansion (1000x1000 -> 1414x1414)
  const rotated = rotateBox(box, srcDims, 45, true);
  assert.ok(rotated);
  assert.strictEqual(rotated.classId, 4);
  assert.ok(rotated.cx >= 0 && rotated.cx <= 1);
  assert.ok(rotated.cy >= 0 && rotated.cy <= 1);
  assert.ok(rotated.w > 0 && rotated.w <= 1);
  assert.ok(rotated.h > 0 && rotated.h <= 1);
});

// Requirement 8: A clipping scenario where source and destination dimensions differ
test("Phase 1.1 - Clipping scenario where source and destination dimensions differ (2:1 to 1:2 aspect ratio)", () => {
  const srcDims: ImageDimensions = { width: 1000, height: 500 };
  // Destination with expandCanvas=true under 90° clockwise: 500x1000
  // Source center: (500, 250). Destination center: (250, 500).
  // Position box: cx = 0.975, cy = 0.5, w = 0.1, h = 0.2
  // In source pixels: x in [925, 1025] (center 975, width 100), dx = x - 500 in [425, 525]
  // y in [200, 300] (center 250, height 100), dy = y - 250 in [-50, 50]
  // 90° clockwise rotation:
  // x_dst = 250 - dy in [200, 300] (width = 100px)
  // y_dst = 500 + dx in [925, 1025] (height = 100px, but destination canvas height is 1000)
  // In destination pixel space:
  // Pre-clip: width = 100px, height = 100px, area = 10,000 px^2
  // Clipped: x_dst in [200, 300] (100px), y_dst in [925, 1000] (75px)
  // Clipped area = 100 * 75 = 7,500 px^2. Retention ratio = 7,500 / 10,000 = 75% >= 5% -> retained!
  const box: YoloBox = { classId: 8, cx: 0.975, cy: 0.5, w: 0.1, h: 0.2 };
  const rotated = rotateBox(box, srcDims, 90, true);
  assert.ok(rotated, "Box with 75% retention must be retained");
  assert.strictEqual(rotated.classId, 8);
  // Coordinates on destination canvas (500 x 1000):
  assertClose(rotated.cx, 0.5, 1e-4);
  assertClose(rotated.cy, 0.9625, 1e-4);
  assertClose(rotated.w, 0.2, 1e-4);
  assertClose(rotated.h, 0.075, 1e-4);
});

// Requirement 9: Multiple boxes/classes to ensure class IDs remain intact
test("Phase 1.1 - Multiple boxes/classes ensure all class IDs remain intact", () => {
  const dims: ImageDimensions = { width: 1000, height: 1000 };
  const boxes: YoloBox[] = [
    { classId: 0, cx: 0.5, cy: 0.5, w: 0.2, h: 0.2 },
    { classId: 1, cx: 0.2, cy: 0.3, w: 0.1, h: 0.1 },
    { classId: 5, cx: 0.8, cy: 0.7, w: 0.15, h: 0.15 },
    { classId: 42, cx: 0.5, cy: 0.2, w: 0.1, h: 0.1 },
    { classId: 99, cx: 0.5, cy: 0.8, w: 0.1, h: 0.1 },
  ];

  const result = rotateBoxes(boxes, dims, 90, false);
  assert.strictEqual(result.boxes.length, 5);

  const preservedClassIds = result.boxes.map((b) => b.classId).sort((a, b) => a - b);
  assert.deepStrictEqual(preservedClassIds, [0, 1, 5, 42, 99]);
});

// Requirement 10: Verify geometry against Sharp's actual positive-angle behavior
test("Phase 1.1 - Geometry verified against Sharp's actual positive-angle clockwise rotation", async () => {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  const W = 200;
  const H = 200;

  // Create a 200x200 white background buffer (255)
  const imageBuffer = Buffer.alloc(W * H * 3, 255);

  // Paint a 20x20 black block (0) at top-center:
  // x from 90 to 110 (cx = 100/200 = 0.5, w = 20/200 = 0.1)
  // y from 20 to 40   (cy = 30/200 = 0.15, h = 20/200 = 0.1)
  for (let y = 20; y < 40; y++) {
    for (let x = 90; x < 110; x++) {
      const idx = (y * W + x) * 3;
      imageBuffer[idx] = 0;
      imageBuffer[idx + 1] = 0;
      imageBuffer[idx + 2] = 0;
    }
  }

  const yoloBox: YoloBox = {
    classId: 0,
    cx: 0.5,
    cy: 0.15,
    w: 0.1,
    h: 0.1,
  };

  // 1. Rotate image with Sharp (+90°)
  const rotatedImageBuffer = await sharp(imageBuffer, {
    raw: { width: W, height: H, channels: 3 },
  })
    .rotate(90)
    .raw()
    .toBuffer();

  // 2. Rotate YOLO box with our geometry engine (+90°)
  const rotatedBox = rotateBox(yoloBox, { width: W, height: H }, 90, false);
  assert.ok(rotatedBox);

  // In screen coordinates (origin top-left):
  // Original center (100, 30) rotated 90° clockwise around (100, 100) -> (170, 100)
  // Normalized center: cx' = 170 / 200 = 0.85, cy' = 100 / 200 = 0.5
  assertClose(rotatedBox.cx, 0.85, 1e-4);
  assertClose(rotatedBox.cy, 0.5, 1e-4);
  assertClose(rotatedBox.w, 0.1, 1e-4);
  assertClose(rotatedBox.h, 0.1, 1e-4);

  // 3. Convert rotated YOLO box to pixel coordinates
  const pixelBox = yoloToPixel(rotatedBox, { width: W, height: H });

  // 4. Sample pixel at the center of the predicted bounding box in Sharp's output buffer
  const sampleX = Math.round(pixelBox.x1 + pixelBox.width / 2);
  const sampleY = Math.round(pixelBox.y1 + pixelBox.height / 2);
  const sampleIdx = (sampleY * W + sampleX) * 3;

  assert.strictEqual(
    rotatedImageBuffer[sampleIdx],
    0,
    "Pixel at center of predicted rotated bounding box in Sharp output must be black (R=0)",
  );

  // 5. Verify that original position before rotation (x=100, y=30) is now white
  const oldIdx = (30 * W + 100) * 3;
  assert.strictEqual(
    rotatedImageBuffer[oldIdx],
    255,
    "Original position before rotation must now be white (R=255)",
  );
});

// Additional helper test: clipPixelBox
test("Phase 1.1 - clipPixelBox directly clips pixel coordinates and checks 5% threshold", () => {
  const dims: ImageDimensions = { width: 1000, height: 1000 };
  const pixelBox: PixelBox = {
    classId: 3,
    x1: 990,
    y1: 400,
    x2: 1190,
    y2: 600,
    width: 200,
    height: 200,
  };

  // Pre-clip area = 200 * 200 = 40,000 px^2
  // Clipped to [0, 1000]: x1=990, x2=1000 (width=10px), y1=400, y2=600 (height=200px)
  // Clipped area = 10 * 200 = 2,000 px^2 (exactly 5.0%)
  const retained = clipPixelBox(pixelBox, dims, DEFAULT_MIN_AREA_RATIO);
  assert.ok(retained);
  assert.strictEqual(retained.classId, 3);
  assert.strictEqual(retained.width, 10);
  assert.strictEqual(retained.height, 200);
  assert.strictEqual(retained.x1, 990);
  assert.strictEqual(retained.x2, 1000);

  // 4.99% clipped width = 9.98px -> x1 = 990.02
  const sliverPixelBox: PixelBox = {
    classId: 3,
    x1: 990.02,
    y1: 400,
    x2: 1190.02,
    y2: 600,
    width: 200,
    height: 200,
  };
  const discarded = clipPixelBox(sliverPixelBox, dims, DEFAULT_MIN_AREA_RATIO);
  assert.strictEqual(discarded, null);
});

