import { Router } from "express";
import {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  linkPlantToRegion,
  unlinkPlantFromRegion,
  getNearbyPlants,
} from "../controllers/plant.controller";
import { linkPlantToTag, unlinkPlantFromTag } from "../controllers/plant.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { CreatePlantSchema, UpdatePlantSchema, validate } from "../lib/schemaValidation";

const router = Router();

router.get("/", getAllPlants);
router.get("/nearby", getNearbyPlants);
router.get("/:id", getPlantById);
router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  validate(CreatePlantSchema),
  createPlant,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  validate(UpdatePlantSchema),
  updatePlant,
);
router.delete("/:id", authenticate, requireRole("ADMIN"), deletePlant);

// Region association
router.post(
  "/:id/regions/:regionId",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  linkPlantToRegion,
);
router.delete("/:id/regions/:regionId", authenticate, requireRole("ADMIN"), unlinkPlantFromRegion);

// Tag association
router.post("/:id/tags/:tagId", authenticate, requireRole("ADMIN", "CONTRIBUTOR"), linkPlantToTag);
router.delete("/:id/tags/:tagId", authenticate, requireRole("ADMIN"), unlinkPlantFromTag);

export default router;
