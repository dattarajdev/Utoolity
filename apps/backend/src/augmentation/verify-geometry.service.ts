import sharp from "sharp";
import {
  type YoloBox,
  type ImageDimensions,
  getRotationAffineMatrix,
  rotateBox,
  flipHorizontalBox,
  flipVerticalBox,
  yoloToPixel,
  parseYoloAnnotations,
  serializeYoloAnnotations,
  DEFAULT_MIN_AREA_RATIO,
  VISIBILITY_EPSILON,
} from "./sher.js";

export interface BboxRetentionDetail {
  index: number;
  classId: number;
  originalBox: YoloBox;
  transformedBox: YoloBox | null;
  preClipAreaPx: number;
  clippedAreaPx: number;
  retentionRatio: number;
  retained: boolean;
  status: "retained" | "clipped" | "discarded";
  notes?: string;
}

export interface VerifyGeometryRequest {
  operation: {
    type: "rotate" | "rotate360" | "flip_h" | "flip_v";
    params?: {
      angle?: number;
      expandCanvas?: boolean;
      intervals?: number;
      activeInterval?: number;
    };
  };
  imageSource: {
    type: "synthetic" | "upload";
    scenarioId?: string;
    imageBase64?: string;
  };
  customAnnotations?: string | YoloBox[];
  minAreaRatio?: number;
}

export interface VerifyGeometryResponse {
  operation: {
    type: string;
    params: Record<string, unknown>;
    effectiveAngle: number;
    expandCanvas: boolean;
  };
  dimensions: {
    source: ImageDimensions;
    expectedTarget: ImageDimensions;
    actualTarget: ImageDimensions;
    isConsistent: boolean;
    difference: { widthDiff: number; heightDiff: number };
  };
  originalImageBase64: string;
  transformedImageBase64: string;
  originalBoxes: YoloBox[];
  transformedBoxes: YoloBox[];
  originalAnnotationText: string;
  transformedAnnotationText: string;
  retentionDetails: BboxRetentionDetail[];
  summary: {
    totalOriginal: number;
    retainedCount: number;
    discardedCount: number;
    thresholdPercentage: number;
    allConsistent: boolean;
  };
}

export const SYNTHETIC_SCENARIOS: Record<
  string,
  {
    name: string;
    description: string;
    dimensions: ImageDimensions;
    boxes: YoloBox[];
  }
> = {
  "single-centered": {
    name: "Single Centered Object",
    description: "Square 600x600 canvas with a centered box (cx=0.5, cy=0.5, w=0.25, h=0.25).",
    dimensions: { width: 600, height: 600 },
    boxes: [{ classId: 0, cx: 0.5, cy: 0.5, w: 0.25, h: 0.25 }],
  },
  "multi-class": {
    name: "Multiple Objects & Classes",
    description: "800x600 canvas with 4 distinct classes positioned across quadrants.",
    dimensions: { width: 800, height: 600 },
    boxes: [
      { classId: 0, cx: 0.25, cy: 0.3, w: 0.18, h: 0.2 },
      { classId: 1, cx: 0.75, cy: 0.3, w: 0.2, h: 0.22 },
      { classId: 2, cx: 0.3, cy: 0.75, w: 0.22, h: 0.18 },
      { classId: 3, cx: 0.75, cy: 0.75, w: 0.16, h: 0.16 },
    ],
  },
  "border-object": {
    name: "Border Object (Partial Clip)",
    description: "600x600 canvas with a box protruding across the right boundary.",
    dimensions: { width: 600, height: 600 },
    boxes: [{ classId: 1, cx: 0.95, cy: 0.5, w: 0.2, h: 0.2 }],
  },
  "corner-object": {
    name: "Corner Object",
    description: "600x600 canvas with an object near the top-right corner.",
    dimensions: { width: 600, height: 600 },
    boxes: [{ classId: 2, cx: 0.88, cy: 0.12, w: 0.16, h: 0.16 }],
  },
  "aspect-ratio-2to1": {
    name: "Wide Image (2:1 Aspect Ratio)",
    description: "800x400 non-square image to verify dimension swapping and aspect-ratio scaling.",
    dimensions: { width: 800, height: 400 },
    boxes: [{ classId: 0, cx: 0.65, cy: 0.5, w: 0.2, h: 0.4 }],
  },
  "threshold-exact-5": {
    name: "Visibility: Exactly 5.00% Retained",
    description: "Box positioned so that clipping against canvas leaves exactly 5.0% of pre-clip area.",
    dimensions: { width: 1000, height: 1000 },
    // Area = 0.2 * 0.2 = 0.04. Overlap = 0.01 width * 0.2 height = 0.002. Ratio = 0.0500.
    boxes: [{ classId: 2, cx: 1.09, cy: 0.5, w: 0.2, h: 0.2 }],
  },
  "threshold-above-5": {
    name: "Visibility: 5.01% Retained",
    description: "Box positioned so that clipping leaves 5.01% of pre-clip area (retained).",
    dimensions: { width: 1000, height: 1000 },
    // Clipped width = 0.01002 * 0.2 / 0.04 = 0.0501. x1 = 0.98998, cx = 1.08998.
    boxes: [{ classId: 7, cx: 1.08998, cy: 0.5, w: 0.2, h: 0.2 }],
  },
  "threshold-below-5": {
    name: "Visibility: 4.99% Discarded",
    description: "Box positioned so that clipping leaves 4.99% of pre-clip area (discarded by 5% rule).",
    dimensions: { width: 1000, height: 1000 },
    // Clipped width = 0.00998 * 0.2 / 0.04 = 0.0499. x1 = 0.99002, cx = 1.09002.
    boxes: [{ classId: 7, cx: 1.09002, cy: 0.5, w: 0.2, h: 0.2 }],
  },
};

const CLASS_COLORS = [
  "#10B981", // 0: Emerald
  "#3B82F6", // 1: Blue
  "#F59E0B", // 2: Amber
  "#8B5CF6", // 3: Purple
  "#EC4899", // 4: Pink
  "#06B6D4", // 5: Cyan
  "#EF4444", // 6: Red
  "#6366F1", // 7: Indigo
];

/**
 * Generate a synthetic SVG image buffer containing grid background,
 * coordinate axes, and visual representations of bounding boxes with orientation arrows.
 */
export async function generateSyntheticImageBuffer(
  dimensions: ImageDimensions,
  boxes: YoloBox[],
): Promise<Buffer> {
  const { width: W, height: H } = dimensions;

  const boxElements = boxes
    .map((box, idx) => {
      const px = yoloToPixel(box, dimensions);
      const color = CLASS_COLORS[box.classId % CLASS_COLORS.length] ?? "#3B82F6";
      const cornerSize = Math.max(6, Math.min(16, Math.min(px.width, px.height) * 0.2));

      return `
      <!-- Box ${idx} (Class ${box.classId}) -->
      <g id="box-${idx}">
        <!-- Semi-transparent fill -->
        <rect x="${px.x1}" y="${px.y1}" width="${px.width}" height="${px.height}"
              fill="${color}" fill-opacity="0.22" rx="4" />
        <!-- Border -->
        <rect x="${px.x1}" y="${px.y1}" width="${px.width}" height="${px.height}"
              fill="none" stroke="${color}" stroke-width="2.5" rx="4" />
        <!-- Top-left indicator corner -->
        <path d="M ${px.x1} ${px.y1 + cornerSize} L ${px.x1} ${px.y1} L ${px.x1 + cornerSize} ${px.y1}"
              fill="none" stroke="#FFFFFF" stroke-width="3" />
        <!-- Class label tag -->
        <rect x="${px.x1}" y="${Math.max(0, px.y1 - 20)}" width="${Math.min(px.width, 70)}" height="18"
              fill="${color}" rx="3" />
        <text x="${px.x1 + 6}" y="${Math.max(12, px.y1 - 7)}"
              fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold">
          cls:${box.classId}
        </text>
        <!-- Directional arrow inside box pointing up (12 o'clock) to verify rotation -->
        <line x1="${px.x1 + px.width / 2}" y1="${px.y1 + px.height * 0.75}"
              x2="${px.x1 + px.width / 2}" y2="${px.y1 + px.height * 0.25}"
              stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />
        <polyline points="${px.x1 + px.width / 2 - 5},${px.y1 + px.height * 0.25 + 7}
                          ${px.x1 + px.width / 2},${px.y1 + px.height * 0.25}
                          ${px.x1 + px.width / 2 + 5},${px.y1 + px.height * 0.25 + 7}"
                  fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
    })
    .join("\n");

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#36393F" stroke-width="1" />
        </pattern>
      </defs>
      <!-- Charcoal-gray workspace background -->
      <rect width="100%" height="100%" fill="#27292D" />
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.8" />

      <!-- Center coordinate crosshair -->
      <line x1="${W / 2 - 20}" y1="${H / 2}" x2="${W / 2 + 20}" y2="${H / 2}" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="3,3" />
      <line x1="${W / 2}" y1="${H / 2 - 20}" x2="${W / 2}" y2="${H / 2 + 20}" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="3,3" />
      <circle cx="${W / 2}" cy="${H / 2}" r="3" fill="#60A5FA" />

      <!-- Canvas boundary border -->
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#454950" stroke-width="2" />

      <!-- Corner orientation anchor "TL" at (10, 20) -->
      <text x="12" y="24" fill="#9CA3AF" font-family="sans-serif" font-size="12" font-weight="bold">TL (0,0)</text>

      <!-- Render bounding boxes -->
      ${boxElements}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Execute geometry verification workflow:
 * 1. Prepares image buffer and original YOLO boxes.
 * 2. Computes theoretical transformed dimensions & boxes using Phase 1.1 geometry engine.
 * 3. Applies the actual pixel transformation using Sharp.
 * 4. Verifies physical consistency between Sharp image dimensions and geometry engine dimensions.
 * 5. Returns base64 images, transformed annotations, and detailed per-box retention metrics.
 */
export async function executeGeometryVerification(
  req: VerifyGeometryRequest,
): Promise<VerifyGeometryResponse> {
  const minAreaRatio = req.minAreaRatio ?? DEFAULT_MIN_AREA_RATIO;
  let sourceBuffer: Buffer;
  let sourceDimensions: ImageDimensions;
  let originalBoxes: YoloBox[] = [];

  // 1. Resolve source image and bounding boxes
  if (req.imageSource.type === "upload" && req.imageSource.imageBase64) {
    const rawB64 = req.imageSource.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    sourceBuffer = Buffer.from(rawB64, "base64");
    const meta = await sharp(sourceBuffer).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("Invalid uploaded image: unable to read dimensions.");
    }
    sourceDimensions = { width: meta.width, height: meta.height };

    // Resolve custom annotations
    if (typeof req.customAnnotations === "string") {
      const parsed = parseYoloAnnotations(req.customAnnotations);
      originalBoxes = parsed.boxes;
    } else if (Array.isArray(req.customAnnotations)) {
      originalBoxes = req.customAnnotations;
    }
  } else {
    // Synthetic scenario
    const scenarioKey = req.imageSource.scenarioId ?? "single-centered";
    const scenario = SYNTHETIC_SCENARIOS[scenarioKey] ?? SYNTHETIC_SCENARIOS["single-centered"]!;
    sourceDimensions = scenario.dimensions;
    originalBoxes = scenario.boxes;

    // If user provided custom annotation overrides on top of synthetic scenario
    if (typeof req.customAnnotations === "string" && req.customAnnotations.trim().length > 0) {
      const parsed = parseYoloAnnotations(req.customAnnotations);
      if (parsed.boxes.length > 0) {
        originalBoxes = parsed.boxes;
      }
    } else if (Array.isArray(req.customAnnotations) && req.customAnnotations.length > 0) {
      originalBoxes = req.customAnnotations;
    }

    sourceBuffer = await generateSyntheticImageBuffer(sourceDimensions, originalBoxes);
  }

  // 2. Determine operation parameters
  const opType = req.operation.type;
  const opParams = req.operation.params ?? {};
  let effectiveAngle = 0;
  let expandCanvas = false;

  if (opType === "rotate") {
    effectiveAngle = Number(opParams.angle ?? 45);
    expandCanvas = Boolean(opParams.expandCanvas ?? false);
  } else if (opType === "rotate360") {
    const intervals = Math.max(2, Math.min(36, Number(opParams.intervals ?? 4)));
    const activeInterval = Math.max(1, Math.min(intervals, Number(opParams.activeInterval ?? 1)));
    effectiveAngle = Math.round((activeInterval * 360) / intervals);
    expandCanvas = Boolean(opParams.expandCanvas ?? false);
  }

  // 3. Phase 1.1 Geometry Transformation & Expected Dimensions
  let expectedTargetDimensions: ImageDimensions = { ...sourceDimensions };
  const transformedBoxes: YoloBox[] = [];
  const retentionDetails: BboxRetentionDetail[] = [];

  if (opType === "rotate" || opType === "rotate360") {
    const rotResult = getRotationAffineMatrix(sourceDimensions, effectiveAngle, expandCanvas);
    expectedTargetDimensions = rotResult.outputDimensions;

    for (let i = 0; i < originalBoxes.length; i++) {
      const origBox = originalBoxes[i]!;

      // Calculate pre-clip and clipped metrics directly in destination pixel coordinates
      const { width: Ws, height: Hs } = sourceDimensions;
      const { width: Wd, height: Hd } = expectedTargetDimensions;

      const x1 = (origBox.cx - origBox.w / 2.0) * Ws;
      const y1 = (origBox.cy - origBox.h / 2.0) * Hs;
      const x2 = (origBox.cx + origBox.w / 2.0) * Ws;
      const y2 = (origBox.cy + origBox.h / 2.0) * Hs;

      const corners = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ];

      const [[m00, m01, m02], [m10, m11, m12]] = rotResult.matrix;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

      for (const corner of corners) {
        const tx = m00 * corner.x + m01 * corner.y + m02;
        const ty = m10 * corner.x + m11 * corner.y + m12;
        if (tx < minX) minX = tx;
        if (tx > maxX) maxX = tx;
        if (ty < minY) minY = ty;
        if (ty > maxY) maxY = ty;
      }

      const preClipW = Math.max(0, maxX - minX);
      const preClipH = Math.max(0, maxY - minY);
      const preClipArea = preClipW * preClipH;

      const clipX1 = Math.max(0.0, Math.min(Wd, minX));
      const clipX2 = Math.max(0.0, Math.min(Wd, maxX));
      const clipY1 = Math.max(0.0, Math.min(Hd, minY));
      const clipY2 = Math.max(0.0, Math.min(Hd, maxY));

      const clippedW = Math.max(0.0, clipX2 - clipX1);
      const clippedH = Math.max(0.0, clipY2 - clipY1);
      const clippedArea = clippedW * clippedH;

      const retentionRatio = preClipArea > 0 ? clippedArea / preClipArea : 0;
      const retained = preClipArea > 0 && retentionRatio >= minAreaRatio - VISIBILITY_EPSILON && clippedW > 0 && clippedH > 0;

      const transformed = rotateBox(origBox, sourceDimensions, effectiveAngle, expandCanvas, minAreaRatio);

      if (transformed && retained) {
        transformedBoxes.push(transformed);
      }

      let status: "retained" | "clipped" | "discarded" = "retained";
      if (!retained) {
        status = "discarded";
      } else if (retentionRatio < 0.9999) {
        status = "clipped";
      }

      retentionDetails.push({
        index: i,
        classId: origBox.classId,
        originalBox: origBox,
        transformedBox: transformed,
        preClipAreaPx: Math.round(preClipArea),
        clippedAreaPx: Math.round(clippedArea),
        retentionRatio,
        retained,
        status,
        notes: !retained
          ? `Area retained (${(retentionRatio * 100).toFixed(2)}%) < ${(minAreaRatio * 100).toFixed(1)}% threshold`
          : undefined,
      });
    }
  } else if (opType === "flip_h") {
    expectedTargetDimensions = { ...sourceDimensions };
    for (let i = 0; i < originalBoxes.length; i++) {
      const origBox = originalBoxes[i]!;
      const flipped = flipHorizontalBox(origBox);
      transformedBoxes.push(flipped);

      const areaPx = origBox.w * origBox.h * sourceDimensions.width * sourceDimensions.height;
      retentionDetails.push({
        index: i,
        classId: origBox.classId,
        originalBox: origBox,
        transformedBox: flipped,
        preClipAreaPx: Math.round(areaPx),
        clippedAreaPx: Math.round(areaPx),
        retentionRatio: 1.0,
        retained: true,
        status: "retained",
      });
    }
  } else if (opType === "flip_v") {
    expectedTargetDimensions = { ...sourceDimensions };
    for (let i = 0; i < originalBoxes.length; i++) {
      const origBox = originalBoxes[i]!;
      const flipped = flipVerticalBox(origBox);
      transformedBoxes.push(flipped);

      const areaPx = origBox.w * origBox.h * sourceDimensions.width * sourceDimensions.height;
      retentionDetails.push({
        index: i,
        classId: origBox.classId,
        originalBox: origBox,
        transformedBox: flipped,
        preClipAreaPx: Math.round(areaPx),
        clippedAreaPx: Math.round(areaPx),
        retentionRatio: 1.0,
        retained: true,
        status: "retained",
      });
    }
  }

  // 4. Sharp Physical Image Transformation
  let transformedBuffer: Buffer;
  let actualTargetDimensions: ImageDimensions;

  if (opType === "rotate" || opType === "rotate360") {
    if (expandCanvas) {
      // Sharp rotates clockwise for positive angles, matching our geometry engine
      const sharpRotated = sharp(sourceBuffer).rotate(effectiveAngle, { background: "#27292D" });
      const { data, info } = await sharpRotated.png().toBuffer({ resolveWithObject: true });
      transformedBuffer = data;
      actualTargetDimensions = { width: info.width, height: info.height };
    } else {
      // Non-expanded canvas: rotate and crop back to source dimensions centered
      const sharpRotated = sharp(sourceBuffer).rotate(effectiveAngle, { background: "#27292D" });
      const { data: rotData, info: rotInfo } = await sharpRotated.png().toBuffer({ resolveWithObject: true });

      const left = Math.round((rotInfo.width - sourceDimensions.width) / 2);
      const top = Math.round((rotInfo.height - sourceDimensions.height) / 2);

      const { data, info } = await sharp(rotData)
        .extract({
          left: Math.max(0, left),
          top: Math.max(0, top),
          width: sourceDimensions.width,
          height: sourceDimensions.height,
        })
        .png()
        .toBuffer({ resolveWithObject: true });

      transformedBuffer = data;
      actualTargetDimensions = { width: info.width, height: info.height };
    }
  } else if (opType === "flip_h") {
    const { data, info } = await sharp(sourceBuffer).flop().png().toBuffer({ resolveWithObject: true });
    transformedBuffer = data;
    actualTargetDimensions = { width: info.width, height: info.height };
  } else if (opType === "flip_v") {
    const { data, info } = await sharp(sourceBuffer).flip().png().toBuffer({ resolveWithObject: true });
    transformedBuffer = data;
    actualTargetDimensions = { width: info.width, height: info.height };
  } else {
    transformedBuffer = sourceBuffer;
    actualTargetDimensions = { ...sourceDimensions };
  }

  // 5. Dimension Consistency Check
  const widthDiff = Math.abs(actualTargetDimensions.width - expectedTargetDimensions.width);
  const heightDiff = Math.abs(actualTargetDimensions.height - expectedTargetDimensions.height);
  const isConsistent = widthDiff <= 1 && heightDiff <= 1;

  if (!isConsistent) {
    console.warn(
      `[Augmentation Verification] Warning: Dimension inconsistency detected. Sharp actual: ${actualTargetDimensions.width}x${actualTargetDimensions.height}, Geometry expected: ${expectedTargetDimensions.width}x${expectedTargetDimensions.height}`,
    );
  }

  const retainedCount = retentionDetails.filter((r) => r.retained).length;
  const discardedCount = retentionDetails.length - retainedCount;

  return {
    operation: {
      type: opType,
      params: opParams,
      effectiveAngle,
      expandCanvas,
    },
    dimensions: {
      source: sourceDimensions,
      expectedTarget: expectedTargetDimensions,
      actualTarget: actualTargetDimensions,
      isConsistent,
      difference: { widthDiff, heightDiff },
    },
    originalImageBase64: `data:image/png;base64,${sourceBuffer.toString("base64")}`,
    transformedImageBase64: `data:image/png;base64,${transformedBuffer.toString("base64")}`,
    originalBoxes,
    transformedBoxes,
    originalAnnotationText: serializeYoloAnnotations(originalBoxes),
    transformedAnnotationText: serializeYoloAnnotations(transformedBoxes),
    retentionDetails,
    summary: {
      totalOriginal: originalBoxes.length,
      retainedCount,
      discardedCount,
      thresholdPercentage: minAreaRatio * 100,
      allConsistent: isConsistent,
    },
  };
}
