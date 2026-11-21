import { z } from "zod";

/**
 * Normalized YOLO Bounding Box representation.
 * All coordinates are normalized to [0.0, 1.0] relative to image dimensions.
 *
 * cx: Horizontal center [0.0, 1.0] (0.0 = left edge, 1.0 = right edge)
 * cy: Vertical center [0.0, 1.0] (0.0 = top edge, 1.0 = bottom edge)
 * w:  Box width (0.0, 1.0]
 * h:  Box height (0.0, 1.0]
 * classId: Non-negative integer class index (>= 0)
 */
export interface YoloBox {
  classId: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/**
 * Tuple format for YOLO bounding box: [classId, cx, cy, w, h]
 */
export type YoloBoxTuple = [number, number, number, number, number];

/**
 * Image pixel dimensions.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Bounding box in absolute pixel coordinates.
 */
export interface PixelBox {
  classId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

/**
 * 2D Point in pixel or Cartesian space.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 2D Affine Transformation Matrix [2x3]:
 * | m00  m01  m02 |   | x |   | m00*x + m01*y + m02 |
 * | m10  m11  m12 | * | y | = | m10*x + m11*y + m12 |
 *                     | 1 |
 */
export type AffineMatrix2D = [
  [number, number, number],
  [number, number, number],
];

/**
 * Structured error encountered while validating an annotation line.
 */
export interface AnnotationLineError {
  lineNumber: number;
  lineText: string;
  errors: string[];
}

/**
 * Result of parsing and validating an entire YOLO annotation file.
 */
export interface ParsedAnnotationResult {
  boxes: YoloBox[];
  rawText: string;
  errors: AnnotationLineError[];
  totalLines: number;
  validCount: number;
  invalidCount: number;
}

/**
 * Complete annotation record associated with an image.
 */
export interface AnnotationRecord {
  stem: string;
  imageFileName: string;
  labelFileName: string;
  dimensions?: ImageDimensions;
  boxes: YoloBox[];
  rawText: string;
}

/**
 * Zod schema for runtime validation of a single YOLO box.
 */
export const YoloBoxSchema = z.object({
  classId: z.number().int().nonnegative({ message: "classId must be a non-negative integer" }),
  cx: z.number().min(0.0).max(1.0, { message: "cx must be between 0.0 and 1.0" }),
  cy: z.number().min(0.0).max(1.0, { message: "cy must be between 0.0 and 1.0" }),
  w: z.number().gt(0.0).max(1.0, { message: "w must be greater than 0.0 and at most 1.0" }),
  h: z.number().gt(0.0).max(1.0, { message: "h must be greater than 0.0 and at most 1.0" }),
});

/**
 * Zod schema for image dimensions.
 */
export const ImageDimensionsSchema = z.object({
  width: z.number().int().positive({ message: "width must be a positive integer" }),
  height: z.number().int().positive({ message: "height must be a positive integer" }),
});

// ============================================================================
// Shared Augmentation Operation Contracts (for Task 2 & Task 3 engines)
// ============================================================================

export type GeometricOperationType =
  | "flip_h"
  | "flip_v"
  | "rotate"
  | "rotate360"
  | "shear"
  | "crop"
  | "zoom"
  | "cutout"
  | "mosaic";

export type ImageFilterOperationType =
  | "brightness"
  | "exposure"
  | "blur"
  | "noise"
  | "saturation"
  | "hue"
  | "grayscale"
  | "motion_blur"
  | "camera_gain";

export type SyntheticOperationType = "synthetic_paste";

export type AugmentationOperationType =
  | GeometricOperationType
  | ImageFilterOperationType
  | SyntheticOperationType;

/**
 * Specific parameter schemas for Task 2 geometric augmentations.
 *
 * Rotation Angle Convention:
 * - In screen coordinates where origin (0,0) is at top-left:
 *   - Positive angle (> 0) = CLOCKWISE rotation (matches Sharp's sharp.rotate(angle)).
 *   - Negative angle (< 0) = COUNTER-CLOCKWISE rotation.
 */
export const RotateParamsSchema = z.object({
  /** Rotation angle in degrees: positive = clockwise, negative = counter-clockwise */
  angle: z.number().min(-180.0).max(180.0).default(45),
  /** Whether destination canvas expands to fully enclose the rotated image */
  expandCanvas: z.boolean().default(false),
});

/**
 * 360-degree rotation sweep parameters.
 * Intervals produce angles as multiples of (360 / intervals), rotating clockwise.
 */
export const Rotate360ParamsSchema = z.object({
  intervals: z.number().int().min(2).max(36).default(4),
  includeFullTurn: z.boolean().default(false),
  expandCanvas: z.boolean().default(false),
});

export const ShearParamsSchema = z.object({
  shearX: z.number().min(-0.5).max(0.5).default(0.2),
  shearY: z.number().min(-0.5).max(0.5).default(0.0),
});

export const CropParamsSchema = z.object({
  cropX: z.number().min(0.05).max(0.5).default(0.1),
  cropY: z.number().min(0.05).max(0.5).default(0.1),
});

export const ZoomParamsSchema = z.object({
  scale: z.number().min(0.5).max(2.5).default(1.3),
});

export const CutoutParamsSchema = z.object({
  numHoles: z.number().int().min(1).max(10).default(3),
  holeSize: z.number().min(0.02).max(0.4).default(0.1),
});

export const EmptyParamsSchema = z.record(z.unknown()).default({});

/**
 * Single augmentation operation configuration.
 */
export const AugmentationOperationSchema = z.object({
  type: z.string(),
  enabled: z.boolean().default(true),
  params: z.record(z.unknown()).default({}),
});

export type AugmentationOperation = z.infer<typeof AugmentationOperationSchema>;

/**
 * Dataset class instance counting summary.
 */
export interface ClassInstanceCount {
  classId: number;
  className?: string;
  instanceCount: number;
  imageCount: number;
}

/**
 * Summary of a dataset inspection.
 */
export interface DatasetInspectionSummary {
  datasetId: string;
  folderName: string;
  totalImages: number;
  totalTxt: number;
  validPairs: number;
  missingLabels: number;
  missingLabelFiles: string[];
  orphanLabels: string[];
  corruptedImages: string[];
  invalidLabels: number;
  classes: ClassInstanceCount[];
  classNames?: string[];
  warnings: string[];
}

