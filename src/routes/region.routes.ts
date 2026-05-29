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
import { linkPlantToRegion, unlinkPlantFromRegion } from "../controllers/plant.controller";
import { CreateRegionSchema, UpdateRegionSchema, validate } from "../lib/schemaValidation";

const router = Router();

router.get("/", getAllRegions);
router.get("/:id", getRegionById);
router.post("/", authenticate, requireRole("ADMIN"), validate(CreateRegionSchema), createRegion);
router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  validate(UpdateRegionSchema),
  updateRegion,
);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteRegion);

// Plant association
router.post(
  "/plants/:id/regions/:regionId",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  linkPlantToRegion,
);
router.delete(
  "/plants/:id/regions/:regionId",
  authenticate,
  requireRole("ADMIN"),
  unlinkPlantFromRegion,
);

export default router;
