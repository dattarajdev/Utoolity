import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import augmentationRoutes from "../routes/augmentation.routes.js";

test("Augmentation Route Plugin - GET /scenarios", async () => {
  const app = Fastify();
  await app.register(augmentationRoutes, { prefix: "/api/tools/augmentation" });

  const res = await app.inject({
    method: "GET",
    url: "/api/tools/augmentation/scenarios",
  });

  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.payload);
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 7);
  assert.ok(data.some((s: { id: string }) => s.id === "single-centered"));
});

test("Augmentation Route Plugin - POST /verify-geometry", async () => {
  const app = Fastify();
  await app.register(augmentationRoutes, { prefix: "/api/tools/augmentation" });

  const res = await app.inject({
    method: "POST",
    url: "/api/tools/augmentation/verify-geometry",
    payload: {
      operation: {
        type: "rotate",
        params: { angle: 90, expandCanvas: true },
      },
      imageSource: {
        type: "synthetic",
        scenarioId: "single-centered",
      },
    },
  });

  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.payload);
  assert.strictEqual(data.dimensions.isConsistent, true);
  assert.strictEqual(data.dimensions.actualTarget.width, 600);
  assert.strictEqual(data.dimensions.actualTarget.height, 600);
  assert.strictEqual(data.transformedBoxes.length, 1);
});

test("Augmentation Route Plugin - Rejects invalid payload", async () => {
  const app = Fastify();
  await app.register(augmentationRoutes, { prefix: "/api/tools/augmentation" });

  const res = await app.inject({
    method: "POST",
    url: "/api/tools/augmentation/verify-geometry",
    payload: {
      operation: {
        type: "invalid_operation_type",
      },
      imageSource: {
        type: "synthetic",
      },
    },
  });

  assert.strictEqual(res.statusCode, 400);
  const data = JSON.parse(res.payload);
  assert.ok(data.message.includes("Invalid"));
});
