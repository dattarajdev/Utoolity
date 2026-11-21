import { api } from "./client";

export interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  dimensions: { width: number; height: number };
  boxCount: number;
}

export interface YoloBoxDto {
  classId: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface BboxRetentionDetailDto {
  index: number;
  classId: number;
  originalBox: YoloBoxDto;
  transformedBox: YoloBoxDto | null;
  preClipAreaPx: number;
  clippedAreaPx: number;
  retentionRatio: number;
  retained: boolean;
  status: "retained" | "clipped" | "discarded";
  notes?: string;
}

export interface VerifyGeometryRequestDto {
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
  customAnnotations?: string | YoloBoxDto[];
  minAreaRatio?: number;
}

export interface VerifyGeometryResponseDto {
  operation: {
    type: string;
    params: Record<string, unknown>;
    effectiveAngle: number;
    expandCanvas: boolean;
  };
  dimensions: {
    source: { width: number; height: number };
    expectedTarget: { width: number; height: number };
    actualTarget: { width: number; height: number };
    isConsistent: boolean;
    difference: { widthDiff: number; heightDiff: number };
  };
  originalImageBase64: string;
  transformedImageBase64: string;
  originalBoxes: YoloBoxDto[];
  transformedBoxes: YoloBoxDto[];
  originalAnnotationText: string;
  transformedAnnotationText: string;
  retentionDetails: BboxRetentionDetailDto[];
  summary: {
    totalOriginal: number;
    retainedCount: number;
    discardedCount: number;
    thresholdPercentage: number;
    allConsistent: boolean;
  };
}

export const augmentationApi = {
  async fetchScenarios(): Promise<ScenarioMetadata[]> {
    const { data } = await api.get<ScenarioMetadata[]>("/tools/augmentation/scenarios");
    return data;
  },

  async verifyGeometry(
    payload: VerifyGeometryRequestDto,
  ): Promise<VerifyGeometryResponseDto> {
    const { data } = await api.post<VerifyGeometryResponseDto>(
      "/tools/augmentation/verify-geometry",
      payload,
    );
    return data;
  },
};
