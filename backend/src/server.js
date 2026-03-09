import express from "express";
import cors from "cors";
import { asteroidRouter } from "./routes/asteroidRoutes.js";
import { modelRouter } from "./routes/modelRoutes.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: frontendOrigin
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "asteroid-mining-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/asteroids", asteroidRouter);
app.use("/api/models", modelRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    ok: false,
    message: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
