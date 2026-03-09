import { Router } from "express";
import { z } from "zod";
import { ingestAsteroids } from "../services/ingestService.js";
import { classifyAsteroids } from "../services/classificationService.js";
import { scoreAsteroids } from "../services/miningScoreService.js";
import { asteroidStore } from "../storage/asteroidStore.js";

export const asteroidRouter = Router();

const ingestSchema = z.object({
  limit: z.number().int().positive().max(1000).optional().default(100)
});

const idsSchema = z.object({
  ids: z.array(z.string()).min(1)
});

asteroidRouter.post("/ingest", async (req, res, next) => {
  try {
    const { limit } = ingestSchema.parse(req.body || {});
    const records = await ingestAsteroids(limit);
    asteroidStore.upsertMany(records);
    res.json({
      ok: true,
      count: records.length
    });
  } catch (error) {
    next(error);
  }
});

asteroidRouter.post("/classify", (req, res, next) => {
  try {
    const { ids } = idsSchema.parse(req.body);
    const result = classifyAsteroids(ids);
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    next(error);
  }
});

asteroidRouter.post("/score", (req, res, next) => {
  try {
    const { ids } = idsSchema.parse(req.body);
    const result = scoreAsteroids(ids);
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    next(error);
  }
});

asteroidRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    asteroids: asteroidStore.getAll()
  });
});
