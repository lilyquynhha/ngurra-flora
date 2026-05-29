import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import plantRoutes from "./routes/plant.routes";
import regionRoutes from "./routes/region.routes";
import occurrenceRoutes from "./routes/occurence.routes";
import tagRoutes from "./routes/tag.routes";
import { errorHandler } from "./middleware/error.middleware";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// Rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limit on all other routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: "Too many requests, please try again later" },
});

app.use(express.json());
app.use("/auth", authLimiter, authRoutes);
app.use(generalLimiter);
app.use("/plants", plantRoutes);
app.use("/regions", regionRoutes);
app.use("/occurrences", occurrenceRoutes);
app.use("/tags", tagRoutes);

app.use(errorHandler);

export default app;
