import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import plantRoutes from "./routes/plant.routes";
import regionRoutes from "./routes/region.routes";
import occurrenceRoutes from "./routes/occurence.routes";
import tagRoutes from "./routes/tag.routes";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/plants", plantRoutes);
app.use("/regions", regionRoutes);
app.use("/occurrences", occurrenceRoutes);
app.use("/tags", tagRoutes);

app.use(errorHandler);

export default app;
