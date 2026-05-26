import { Router } from "express";
import {
  getAllRegions,
  getRegionById,
  createRegion,
  updateRegion,
  deleteRegion,
} from "../controllers/region.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get("/", getAllRegions);
router.get("/:id", getRegionById);
router.post("/", authenticate, requireRole("ADMIN"), createRegion);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateRegion);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteRegion);

export default router;