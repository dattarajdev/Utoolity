import axios from "axios";
import { api } from "./client";

// ---- Types from original Augmentation Studio -------------------------------

export interface ValidationDetail {
  image_name: string;
  errors: string[];
}

export interface ScanResponse {
  image_count: number;
  label_count: number;
  missing_labels: number;
  missing_label_files?: string[];
  orphan_labels?: string[];
  corrupted_images?: string[];
  invalid_annotations: number;
  class_distribution: Record<string, number>;
  image_files: string[];
  validation_errors: ValidationDetail[];
  classes_file: string[] | null;
  classes_verified?: boolean;
  classes_warning?: string | null;
}

export interface ImagePreviewResponse {
  image_b64: string;
  annotation_text: string;
  width: number;
  height: number;
  boxes: number[][];
  validation_errors: string[];
}

export interface AugPreviewResponse {
  original_b64: string;
  augmented_b64: string;
  original_width: number;
  original_height: number;
  augmented_width: number;
  augmented_height: number;
  original_annotation: string;
  augmented_annotation: string;
  original_boxes: number[][];
  augmented_boxes: number[][];
}

export interface AugmentationConfig {
  type: string;
  params: Record<string, unknown>;
}

export interface EstimateResponse {
  original_count: number;
  augmented_count: number;
  total_count: number;
}

export interface GenerateRequest {
  dataset_path: string;
  output_path: string;
  augmentations: AugmentationConfig[];
  preserve_originals: boolean;
  create_classes_file: boolean;
  validate_output: boolean;
  target_total_count?: number;
}

export interface GenerateResponse {
  job_id: string;
}

export interface JobStatusResponse {
  status: "running" | "done" | "error";
  progress: number;
  processed: number;
  total: number;
  errors: string[];
  output_count: number;
  message: string;
  round?: number;
  attempts?: number;
  accepted?: number;
  exact_duplicates?: number;
  borderline?: number;
  shortfall?: number;
}

export interface BrowseFolderResponse {
  path: string | null;
  cancelled: boolean;
  error?: string | null;
}

export interface QuarantineItem {
  item_type: "missing_label" | "orphan_label" | "corrupted_image" | "invalid_annotation";
  filename: string;
}

export interface QuarantineRequest {
  dataset_path: string;
  items: QuarantineItem[];
}

export interface QuarantineRecord {
  original_file: string;
  quarantined_to: string;
  item_type: string;
  status: string;
  error?: string | null;
}

export interface QuarantineResponse {
  success: boolean;
  quarantined_count: number;
  records: QuarantineRecord[];
  audit_report_path: string;
  message: string;
}

// ---- Existing Phase 1 Geometry Types ----------------------------------------

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

// ---- Base URL Resolution & Smart Client ------------------------------------

let activeBaseUrl =
  process.env.NEXT_PUBLIC_AUGMENTATION_API_URL || "http://127.0.0.1:8000/api";

const getClient = () =>
  axios.create({
    baseURL: activeBaseUrl,
    timeout: 120000,
  });

export const getAugmentationBaseUrl = () => activeBaseUrl;
export const setAugmentationBaseUrl = (url: string) => {
  activeBaseUrl = url;
};

// ---- API functions ---------------------------------------------------------

export const checkHealth = async (): Promise<{ status: string }> => {
  // First attempt current active base URL
  try {
    const res = await axios.get(`${activeBaseUrl}/health`, { timeout: 3000 });
    return res.data;
  } catch (err) {
    // If on 8000 failed, try Next.js proxy /api/health
    if (activeBaseUrl !== "/api") {
      try {
        const res2 = await axios.get("/api/health", { timeout: 3000 });
        activeBaseUrl = "/api";
        return res2.data;
      } catch {
        // Fall back to original error
      }
    } else {
      // If /api failed, try 8000 directly
      try {
        const res3 = await axios.get("http://127.0.0.1:8000/api/health", {
          timeout: 3000,
        });
        activeBaseUrl = "http://127.0.0.1:8000/api";
        return res3.data;
      } catch {
        // Fall back
      }
    }
    throw err;
  }
};

export const scanDataset = (datasetPath: string): Promise<ScanResponse> =>
  getClient()
    .post("/scan", { dataset_path: datasetPath })
    .then((r) => r.data);

export const previewImage = (
  datasetPath: string,
  imageName: string,
): Promise<ImagePreviewResponse> =>
  getClient()
    .post("/preview-image", { dataset_path: datasetPath, image_name: imageName })
    .then((r) => r.data);

export const previewAugmentation = (
  datasetPath: string,
  imageName: string,
  augType: string,
  params: Record<string, unknown>,
): Promise<AugPreviewResponse> =>
  getClient()
    .post("/preview-augmentation", {
      dataset_path: datasetPath,
      image_name: imageName,
      aug_type: augType,
      params,
    })
    .then((r) => r.data);

export const estimateOutput = (
  datasetPath: string,
  augmentations: AugmentationConfig[],
  preserveOriginals: boolean,
): Promise<EstimateResponse> =>
  getClient()
    .post("/estimate", {
      dataset_path: datasetPath,
      augmentations,
      preserve_originals: preserveOriginals,
    })
    .then((r) => r.data);

export const generateDataset = (
  payload: GenerateRequest,
): Promise<GenerateResponse> =>
  getClient()
    .post("/generate", payload)
    .then((r) => r.data);

export const getJobStatus = (jobId: string): Promise<JobStatusResponse> =>
  getClient()
    .get(`/job/${jobId}`)
    .then((r) => r.data);

export const browseFolder = (
  initialPath?: string,
  title?: string,
): Promise<BrowseFolderResponse> =>
  getClient()
    .post("/browse-folder", { initial_path: initialPath, title })
    .then((r) => r.data);

export const quarantineFiles = (
  payload: QuarantineRequest,
): Promise<QuarantineResponse> =>
  getClient()
    .post("/quarantine", payload)
    .then((r) => r.data);

// ---- Existing Utoolity Backend Geometry API ---------------------------------

export const augmentationApi = {
  async fetchScenarios(): Promise<ScenarioMetadata[]> {
    const { data } = await api.get<ScenarioMetadata[]>(
      "/tools/augmentation/scenarios",
    );
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
