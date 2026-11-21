import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  executeGeometryVerification,
  SYNTHETIC_SCENARIOS,
  type VerifyGeometryRequest,
} from "../augmentation/verify-geometry.service.js";

const VerifyGeometrySchema = z.object({
  operation: z.object({
    type: z.enum(["rotate", "rotate360", "flip_h", "flip_v"]),
    params: z
      .object({
        angle: z.number().min(-360).max(360).optional(),
        expandCanvas: z.boolean().optional(),
        intervals: z.number().int().min(2).max(36).optional(),
        activeInterval: z.number().int().min(1).max(36).optional(),
      })
      .optional(),
  }),
  imageSource: z.object({
    type: z.enum(["synthetic", "upload"]),
    scenarioId: z.string().optional(),
    imageBase64: z.string().max(15 * 1024 * 1024, "Image exceeds maximum allowed 15MB size").optional(),
  }),
  customAnnotations: z.union([z.string(), z.array(z.any())]).optional(),
  minAreaRatio: z.number().min(0.0).max(1.0).optional(),
});

const augmentationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/tools/augmentation/scenarios
   * List available synthetic test scenarios with metadata.
   */
  app.get("/scenarios", async () => {
    return Object.entries(SYNTHETIC_SCENARIOS).map(([id, scenario]) => ({
      id,
      name: scenario.name,
      description: scenario.description,
      dimensions: scenario.dimensions,
      boxCount: scenario.boxes.length,
    }));
  });

  /**
   * POST /api/tools/augmentation/verify-geometry
   * Execute geometry verification and physical image transformation using Sharp.
   */
  app.post("/verify-geometry", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = VerifyGeometrySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          message: "Invalid geometry verification parameters.",
          errors: parseResult.error.format(),
        });
      }

      const verifiedResult = await executeGeometryVerification(
        parseResult.data as VerifyGeometryRequest,
      );
      return reply.code(200).send(verifiedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Internal geometry verification error";
      request.log.error(error);
      return reply.code(500).send({
        message: "Failed to execute geometry verification.",
        error: errorMessage,
      });
    }
  });
};

export default augmentationRoutes;
