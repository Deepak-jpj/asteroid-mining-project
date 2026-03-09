import { Router } from "express";
import { trainAndSaveModels } from "../services/trainingService.js";

export const modelRouter = Router();

modelRouter.post("/train", async (_req, res, next) => {
  try {
    const output = await trainAndSaveModels();
    res.json({
      ok: true,
      output
    });
  } catch (error) {
    next(error);
  }
});
