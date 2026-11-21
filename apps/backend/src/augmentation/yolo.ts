/**
 * YOLO Annotation Utilities & Bounding-Box Geometry Engine
 *
 * Provides mathematically rigorous transformations, parsing, validation,
 * coordinate conversions, and clipping for YOLO-formatted object detection datasets.
 *
 * Coordinate Convention:
 * - Origin: (0, 0) is at the top-left corner of the image canvas.
 * - Axes: Positive X extends to the right; Positive Y extends downwards.
 * - YOLO format: classId cx cy w h
 * - All coordinates are normalized to [0.0, 1.0] relative to image dimensions.
 * - (cx, cy) is the normalized box center:
 *     cx in [0.0, 1.0] (0.0 = left boundary, 1.0 = right boundary)
 *     cy in [0.0, 1.0] (0.0 = top boundary, 1.0 = bottom boundary)
 * - (w, h) are normalized box dimensions in (0.0, 1.0].
 * - classId is a non-negative integer (>= 0).
 *
 * Angular & Rotation Convention:
 * - Positive angle (+θ, > 0): CLOCKWISE rotation in screen space (e.g. +90° turns 12 o'clock to 3 o'clock).
 *   This is natively aligned with Sharp's image processing (`sharp(img).rotate(angle)`).
 * - Negative angle (-θ, < 0): COUNTER-CLOCKWISE rotation.
 * - (Note: The Python OpenCV reference used counter-clockwise positive angles; TypeScript
 *   uses clockwise positive angles to align with Sharp without requiring manual inversion.)
 */

import type {
  YoloBox,
  YoloBoxTuple,
  PixelBox,
  Point2D,
  ImageDimensions,
  AffineMatrix2D,
  AnnotationLineError,
  ParsedAnnotationResult,
} from "./types.js";

// ============================================================================
// 1. Parsing & Serialization
// ============================================================================

/**
 * Validate a single YOLO bounding box.
 * Returns an array of error strings (empty if valid).
 */
export function validateYoloBox(
  box: YoloBox,
  classNames?: string[] | null,
): string[] {
  const errors: string[] = [];
  const { classId, cx, cy, w, h } = box;

  // Class ID check
  if (!Number.isInteger(classId) || classId < 0) {
    errors.push(`Invalid classId=${classId} (must be a non-negative integer).`);
  }
  if (classNames && classNames.length > 0 && classId >= classNames.length) {
    errors.push(
      `classId=${classId} is out of bounds for defined metadata (${classNames.length} classes defined).`,
    );
  }

  // Finite numbers check
  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(w) ||
    !Number.isFinite(h)
  ) {
    errors.push("Bounding box coordinates must be finite real numbers.");
    return errors;
  }

  // Normalized bounds check
  if (cx < 0.0 || cx > 1.0) {
    errors.push(`cx=${cx.toFixed(6)} is out of bounds [0.0, 1.0].`);
  }
  if (cy < 0.0 || cy > 1.0) {
    errors.push(`cy=${cy.toFixed(6)} is out of bounds [0.0, 1.0].`);
  }
  if (w <= 0.0) {
    errors.push(`w=${w.toFixed(6)} must be greater than 0.0.`);
  } else if (w > 1.0) {
    errors.push(`w=${w.toFixed(6)} exceeds maximum normalized width of 1.0.`);
  }
  if (h <= 0.0) {
    errors.push(`h=${h.toFixed(6)} must be greater than 0.0.`);
  } else if (h > 1.0) {
    errors.push(`h=${h.toFixed(6)} exceeds maximum normalized height of 1.0.`);
  }

  return errors;
}

/**
 * Parse a single line from a YOLO annotation file.
 * Returns parsed YoloBox or null if the line is empty or invalid.
 */
export function parseYoloLine(
  line: string,
  lineNumber: number = 1,
  classNames?: string[] | null,
): { box: YoloBox | null; error: AnnotationLineError | null } {
  const trimmed = line.trim();
  if (!trimmed) {
    return { box: null, error: null }; // Blank lines are ignored
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return {
      box: null,
      error: {
        lineNumber,
        lineText: trimmed,
        errors: [
          `Expected 5 whitespace-separated values (<class_id> <cx> <cy> <w> <h>), found ${parts.length}.`,
        ],
      },
    };
  }

  const rawClass = Number(parts[0]);
  const cx = Number(parts[1]);
  const cy = Number(parts[2]);
  const w = Number(parts[3]);
  const h = Number(parts[4]);

  const candidate: YoloBox = {
    classId: rawClass,
    cx,
    cy,
    w,
    h,
  };

  const validationErrors = validateYoloBox(candidate, classNames);
  if (validationErrors.length > 0) {
    return {
      box: null,
      error: {
        lineNumber,
        lineText: trimmed,
        errors: validationErrors,
      },
    };
  }

  return { box: candidate, error: null };
}

/**
 * Parse a complete YOLO annotation text file.
 * Preserves structured validation information and does not silently drop malformed lines.
 */
export function parseYoloAnnotations(
  rawText: string,
  classNames?: string[] | null,
): ParsedAnnotationResult {
  const lines = rawText.split(/\r?\n/);
  const boxes: YoloBox[] = [];
  const errors: AnnotationLineError[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i] ?? "";
    if (!rawLine.trim()) continue;

    const { box, error } = parseYoloLine(rawLine, lineNumber, classNames);
    if (error) {
      errors.push(error);
      invalidCount++;
    } else if (box) {
      boxes.push(box);
      validCount++;
    }
  }

  return {
    boxes,
    rawText,
    errors,
    totalLines: lines.length,
    validCount,
    invalidCount,
  };
}

/**
 * Format a single YoloBox to a YOLO format line string.
 * Uses 6-decimal fixed-point precision for high geometric accuracy.
 */
export function formatYoloLine(box: YoloBox): string {
  return `${box.classId} ${box.cx.toFixed(6)} ${box.cy.toFixed(6)} ${box.w.toFixed(6)} ${box.h.toFixed(6)}`;
}

/**
 * Serialize an array of YoloBoxes into a multi-line YOLO text file.
 */
export function serializeYoloAnnotations(boxes: YoloBox[]): string {
  if (boxes.length === 0) return "";
  return boxes.map(formatYoloLine).join("\n") + "\n";
}

// ============================================================================
// 2. Coordinate Conversions
// ============================================================================

/**
 * Convert a normalized YoloBox to absolute pixel boundaries (PixelBox).
 */
export function yoloToPixel(box: YoloBox, dimensions: ImageDimensions): PixelBox {
  const { width: W, height: H } = dimensions;
  const x1 = (box.cx - box.w / 2.0) * W;
  const y1 = (box.cy - box.h / 2.0) * H;
  const x2 = (box.cx + box.w / 2.0) * W;
  const y2 = (box.cy + box.h / 2.0) * H;
  return {
    classId: box.classId,
    x1,
    y1,
    x2,
    y2,
    width: x2 - x1,
    height: y2 - y1,
  };
}

/**
 * Convert absolute pixel boundaries (x1, y1, x2, y2) back to a normalized YoloBox.
 */
export function pixelToYolo(
  classId: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dimensions: ImageDimensions,
): YoloBox {
  const { width: W, height: H } = dimensions;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const cx = (minX + maxX) / (2.0 * W);
  const cy = (minY + maxY) / (2.0 * H);
  const w = (maxX - minX) / W;
  const h = (maxY - minY) / H;

  return {
    classId,
    cx,
    cy,
    w,
    h,
  };
}

/**
 * Helper to convert YoloBox object to tuple [classId, cx, cy, w, h].
 */
export function boxToTuple(box: YoloBox): YoloBoxTuple {
  return [box.classId, box.cx, box.cy, box.w, box.h];
}

/**
 * Helper to convert tuple [classId, cx, cy, w, h] to YoloBox object.
 */
export function tupleToBox(tuple: YoloBoxTuple | number[]): YoloBox {
  return {
    classId: Number(tuple[0]),
    cx: Number(tuple[1]),
    cy: Number(tuple[2]),
    w: Number(tuple[3]),
    h: Number(tuple[4]),
  };
}

// ============================================================================
// 3. Clipping & Visibility Policy
// ============================================================================

/**
 * Default minimum visible area threshold ratio (5%).
 * Documented visibility policy: If remaining visible area after clipping is < 5% of
 * the candidate box's pre-clip area, the box is discarded (returns null).
 */
export const DEFAULT_MIN_AREA_RATIO = 0.05;

/**
 * Floating-point comparison tolerance for visibility threshold checks.
 * Ensures exactly 5.0% retention is preserved against IEEE-754 precision artifacts.
 */
export const VISIBILITY_EPSILON = 1e-9;

/**
 * Clip a normalized YOLO box to [0.0, 1.0] destination image boundaries.
 *
 * Visibility Policy:
 * 1. Computes candidate box coordinates before clipping:
 *    x1 = cx - w / 2, y1 = cy - h / 2, x2 = cx + w / 2, y2 = cy + h / 2
 *    preClipArea = baselineBox ? (baselineBox.w * baselineBox.h) : (w * h)
 * 2. Clamps coordinates to [0.0, 1.0] destination canvas boundaries:
 *    clipX1 = max(0, min(1, x1)), clipX2 = max(0, min(1, x2)), ...
 * 3. Discards boxes with non-positive dimensions (outside canvas).
 * 4. Compares post-clip area with pre-clip area:
 *    retentionRatio = clippedArea / preClipArea
 *    - Exactly minAreaRatio (e.g. 5%) is retained.
 *    - Strictly less than minAreaRatio is discarded (returns null).
 * 5. Preserves classId intact and formats as normalized YOLO box on the canvas.
 *
 * @param box The candidate normalized YOLO box (may extend beyond [0.0, 1.0] before clipping).
 * @param minAreaRatio Minimum area retention ratio required (default 0.05).
 * @param baselineBox Optional explicit baseline box in the same coordinate frame.
 */
export function clipBox(
  box: YoloBox,
  minAreaRatio: number = DEFAULT_MIN_AREA_RATIO,
  baselineBox?: YoloBox | null,
): YoloBox | null {
  const { classId, cx, cy, w, h } = box;

  if (w <= 0.0 || h <= 0.0) {
    return null;
  }

  let x1 = cx - w / 2.0;
  let y1 = cy - h / 2.0;
  let x2 = cx + w / 2.0;
  let y2 = cy + h / 2.0;

  // Clamp to [0.0, 1.0]
  const clipX1 = Math.max(0.0, Math.min(1.0, x1));
  const clipY1 = Math.max(0.0, Math.min(1.0, y1));
  const clipX2 = Math.max(0.0, Math.min(1.0, x2));
  const clipY2 = Math.max(0.0, Math.min(1.0, y2));

  const nw = Math.max(0.0, clipX2 - clipX1);
  const nh = Math.max(0.0, clipY2 - clipY1);

  // Discard zero or degenerate dimensions
  if (nw <= 0.0 || nh <= 0.0) {
    return null;
  }

  // Pre-clip area in the current coordinate system
  const preClipArea = baselineBox ? baselineBox.w * baselineBox.h : w * h;
  const clippedArea = nw * nh;

  // Visibility threshold check: exactly minAreaRatio is retained, strictly less is discarded
  if (preClipArea > 0.0) {
    const retentionRatio = clippedArea / preClipArea;
    if (retentionRatio < minAreaRatio - VISIBILITY_EPSILON) {
      return null;
    }
  }

  return {
    classId,
    cx: (clipX1 + clipX2) / 2.0,
    cy: (clipY1 + clipY2) / 2.0,
    w: nw,
    h: nh,
  };
}

/**
 * Clip a bounding box in absolute pixel coordinates against destination canvas dimensions.
 * Compares clipped pixel area against pre-clip pixel area to enforce the visibility threshold.
 */
export function clipPixelBox(
  box: PixelBox,
  dimensions: ImageDimensions,
  minAreaRatio: number = DEFAULT_MIN_AREA_RATIO,
): PixelBox | null {
  const { width: W, height: H } = dimensions;
  const preClipWidth = box.x2 - box.x1;
  const preClipHeight = box.y2 - box.y1;
  if (preClipWidth <= 0 || preClipHeight <= 0) return null;
  const preClipArea = preClipWidth * preClipHeight;

  const clipX1 = Math.max(0.0, Math.min(W, box.x1));
  const clipX2 = Math.max(0.0, Math.min(W, box.x2));
  const clipY1 = Math.max(0.0, Math.min(H, box.y1));
  const clipY2 = Math.max(0.0, Math.min(H, box.y2));

  const clippedWidth = Math.max(0.0, clipX2 - clipX1);
  const clippedHeight = Math.max(0.0, clipY2 - clipY1);
  if (clippedWidth <= 0.0 || clippedHeight <= 0.0) return null;
  const clippedArea = clippedWidth * clippedHeight;

  const retentionRatio = clippedArea / preClipArea;
  if (retentionRatio < minAreaRatio - VISIBILITY_EPSILON) return null;

  return {
    classId: box.classId,
    x1: clipX1,
    y1: clipY1,
    x2: clipX2,
    y2: clipY2,
    width: clippedWidth,
    height: clippedHeight,
  };
}

// ============================================================================
// 4. Mathematical Transformations
// ============================================================================

/**
 * Apply horizontal flip to a bounding box.
 * Mirrors across the vertical axis:
 * cx' = 1.0 - cx
 * cy' = cy
 * w' = w
 * h' = h
 */
export function flipHorizontalBox(box: YoloBox): YoloBox {
  return {
    classId: box.classId,
    cx: 1.0 - box.cx,
    cy: box.cy,
    w: box.w,
    h: box.h,
  };
}

/**
 * Apply vertical flip to a bounding box.
 * Mirrors across the horizontal axis:
 * cx' = cx
 * cy' = 1.0 - cy
 * w' = w
 * h' = h
 */
export function flipVerticalBox(box: YoloBox): YoloBox {
  return {
    classId: box.classId,
    cx: box.cx,
    cy: 1.0 - box.cy,
    w: box.w,
    h: box.h,
  };
}

/**
 * Transform all four corners of a box through a 2D affine matrix and compute
 * the resulting axis-aligned bounding envelope on the destination canvas.
 *
 * Mathematical Visibility Calculation:
 * 1. Computes the transformed bounding box envelope in destination pixel coordinates BEFORE clipping:
 *    [minX, maxX] x [minY, maxY], preClipArea = (maxX - minX) * (maxY - minY).
 * 2. Computes the bounding box envelope AFTER clipping in the same destination pixel coordinates:
 *    [clipX1, clipX2] x [clipY1, clipY2] clamped to [0, Wd] x [0, Hd].
 *    clippedArea = (clipX2 - clipX1) * (clipY2 - clipY1).
 * 3. Compares areas in the destination pixel coordinate system to determine visibility:
 *    retentionRatio = clippedArea / preClipArea.
 *    - Exactly minAreaRatio (e.g. 5%) is retained.
 *    - Strictly less than minAreaRatio (5%) is discarded (returns null).
 * 4. Preserves the original classId and returns normalized YOLO representation relative to destination canvas.
 *
 * @param box Source YoloBox.
 * @param matrix 2x3 affine matrix.
 * @param srcDim Source image pixel dimensions.
 * @param dstDim Resulting image pixel dimensions.
 * @param minAreaRatio Minimum area ratio for clipping (default 0.05).
 */
export function transformBoxAffine(
  box: YoloBox,
  matrix: AffineMatrix2D,
  srcDim: ImageDimensions,
  dstDim: ImageDimensions,
  minAreaRatio: number = DEFAULT_MIN_AREA_RATIO,
): YoloBox | null {
  const { width: Ws, height: Hs } = srcDim;
  const { width: Wd, height: Hd } = dstDim;

  // 1. Calculate four un-transformed corners in source pixel space
  const x1 = (box.cx - box.w / 2.0) * Ws;
  const y1 = (box.cy - box.h / 2.0) * Hs;
  const x2 = (box.cx + box.w / 2.0) * Ws;
  const y2 = (box.cy + box.h / 2.0) * Hs;

  const corners: Point2D[] = [
    { x: x1, y: y1 }, // top-left
    { x: x2, y: y1 }, // top-right
    { x: x2, y: y2 }, // bottom-right
    { x: x1, y: y2 }, // bottom-left
  ];

  // 2. Transform each corner through 2D affine matrix
  const [[m00, m01, m02], [m10, m11, m12]] = matrix;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    const tx = m00 * corner.x + m01 * corner.y + m02;
    const ty = m10 * corner.x + m11 * corner.y + m12;

    if (tx < minX) minX = tx;
    if (tx > maxX) maxX = tx;
    if (ty < minY) minY = ty;
    if (ty > maxY) maxY = ty;
  }

  // 3. Calculate transformed bounding box in destination pixel coordinates before clipping
  const preClipWidth = maxX - minX;
  const preClipHeight = maxY - minY;
  if (preClipWidth <= 0.0 || preClipHeight <= 0.0) {
    return null;
  }
  const preClipArea = preClipWidth * preClipHeight;

  // 4. Calculate bounding box after clipping in the same destination pixel coordinate system
  const clipX1 = Math.max(0.0, Math.min(Wd, minX));
  const clipX2 = Math.max(0.0, Math.min(Wd, maxX));
  const clipY1 = Math.max(0.0, Math.min(Hd, minY));
  const clipY2 = Math.max(0.0, Math.min(Hd, maxY));

  const clippedWidth = Math.max(0.0, clipX2 - clipX1);
  const clippedHeight = Math.max(0.0, clipY2 - clipY1);

  if (clippedWidth <= 0.0 || clippedHeight <= 0.0) {
    return null; // Entirely outside destination canvas
  }

  const clippedArea = clippedWidth * clippedHeight;

  // 5. Compare areas in destination pixel coordinates:
  // Exactly minAreaRatio (e.g. 5%) is retained; strictly less than minAreaRatio is discarded.
  const retentionRatio = clippedArea / preClipArea;
  if (retentionRatio < minAreaRatio - VISIBILITY_EPSILON) {
    return null;
  }

  // 6. Convert to normalized YOLO coordinates on destination canvas
  return {
    classId: box.classId,
    cx: (clipX1 + clipX2) / (2.0 * Wd),
    cy: (clipY1 + clipY2) / (2.0 * Hd),
    w: clippedWidth / Wd,
    h: clippedHeight / Hd,
  };
}

/**
 * Compute the 2D affine rotation matrix for an image-centered rotation.
 *
 * Screen-Space Angular Convention:
 * - Origin (0,0) at top-left, +X right, +Y down.
 * - Positive angle (+θ, > 0) = CLOCKWISE rotation (matches Sharp `sharp.rotate(angle)`).
 * - Negative angle (-θ, < 0) = COUNTER-CLOCKWISE rotation.
 *
 * @param srcDim Source image dimensions.
 * @param angleDegrees Rotation angle in degrees (positive = clockwise, negative = counter-clockwise).
 * @param expandCanvas Whether the output canvas expands to fit the rotated bounding envelope.
 */
export function getRotationAffineMatrix(
  srcDim: ImageDimensions,
  angleDegrees: number,
  expandCanvas: boolean = false,
): { matrix: AffineMatrix2D; outputDimensions: ImageDimensions } {
  const { width: W, height: H } = srcDim;
  const cx = W / 2.0;
  const cy = H / 2.0;

  // Convert degrees to radians
  const rad = (angleDegrees * Math.PI) / 180.0;
  let cos = Math.cos(rad);
  let sin = Math.sin(rad);

  // Clean numerical floating-point precision near 0, 1, -1 for cardinal angles
  if (Math.abs(cos) < 1e-12) cos = 0.0;
  if (Math.abs(sin) < 1e-12) sin = 0.0;
  if (Math.abs(cos - 1.0) < 1e-12) cos = 1.0;
  if (Math.abs(cos + 1.0) < 1e-12) cos = -1.0;
  if (Math.abs(sin - 1.0) < 1e-12) sin = 1.0;
  if (Math.abs(sin + 1.0) < 1e-12) sin = -1.0;

  let newW = W;
  let newH = H;
  let tx = (1.0 - cos) * cx + sin * cy;
  let ty = -sin * cx + (1.0 - cos) * cy;

  if (expandCanvas) {
    newW = Math.round(H * Math.abs(sin) + W * Math.abs(cos));
    newH = Math.round(H * Math.abs(cos) + W * Math.abs(sin));
    tx += (newW / 2.0) - cx;
    ty += (newH / 2.0) - cy;
  }

  // Standard clockwise affine rotation matrix around center (cx, cy):
  // |  cos  -sin   tx |
  // |  sin   cos   ty |
  const matrix: AffineMatrix2D = [
    [cos, -sin, tx],
    [sin, cos, ty],
  ];

  return {
    matrix,
    outputDimensions: { width: newW, height: newH },
  };
}

/**
 * Rotate a YoloBox around the image center by angle in degrees.
 *
 * Angular Convention:
 * - Positive angle = CLOCKWISE rotation (matches Sharp).
 * - Negative angle = COUNTER-CLOCKWISE rotation.
 *
 * Visibility Threshold:
 * - Calculates transformed bounding envelope in destination pixel space.
 * - Measures fraction of transformed box remaining after clipping to destination boundaries.
 * - Exactly 5% (minAreaRatio) is retained; strictly less than 5% is discarded (returns null).
 *
 * @param box The input normalized YOLO box.
 * @param srcDim Source image dimensions.
 * @param angleDegrees Angle in degrees (positive = clockwise, negative = counter-clockwise).
 * @param expandCanvas Whether the output canvas expands (default false).
 * @param minAreaRatio Minimum area ratio for clipping (default 0.05).
 */
export function rotateBox(
  box: YoloBox,
  srcDim: ImageDimensions,
  angleDegrees: number,
  expandCanvas: boolean = false,
  minAreaRatio: number = DEFAULT_MIN_AREA_RATIO,
): YoloBox | null {
  const { matrix, outputDimensions } = getRotationAffineMatrix(
    srcDim,
    angleDegrees,
    expandCanvas,
  );
  return transformBoxAffine(box, matrix, srcDim, outputDimensions, minAreaRatio);
}

/**
 * Rotate an entire collection of YoloBoxes around image center.
 * Preserves class IDs and drops boxes that fall below the visibility threshold after rotation.
 *
 * Angular Convention:
 * - Positive angle = CLOCKWISE rotation (matches Sharp).
 * - Negative angle = COUNTER-CLOCKWISE rotation.
 */
export function rotateBoxes(
  boxes: YoloBox[],
  srcDim: ImageDimensions,
  angleDegrees: number,
  expandCanvas: boolean = false,
  minAreaRatio: number = DEFAULT_MIN_AREA_RATIO,
): { boxes: YoloBox[]; outputDimensions: ImageDimensions } {
  const { matrix, outputDimensions } = getRotationAffineMatrix(
    srcDim,
    angleDegrees,
    expandCanvas,
  );

  const transformedBoxes: YoloBox[] = [];
  for (const box of boxes) {
    const transformed = transformBoxAffine(
      box,
      matrix,
      srcDim,
      outputDimensions,
      minAreaRatio,
    );
    if (transformed) {
      transformedBoxes.push(transformed);
    }
  }

  return {
    boxes: transformedBoxes,
    outputDimensions,
  };
}

