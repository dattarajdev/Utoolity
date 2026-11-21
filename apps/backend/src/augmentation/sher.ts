/**
 * Shared Augmentation Engine Façade (`sher.ts`)
 *
 * Unified entrypoint for Utoolity's Augmentation engine across all four tasks:
 * - Task 1: Image-only filters
 * - Task 2: Geometric & annotation augmentations
 * - Task 3: Class balancing
 * - Task 4: Synthetic PNG compositing
 *
 * Phase 1: Exports shared types, validation schemas, and YOLO geometry utilities.
 */

export * from "./types.js";
export * from "./yolo.js";

