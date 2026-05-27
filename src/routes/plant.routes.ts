import { Router } from "express";
import {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  linkPlantToRegion,
  unlinkPlantFromRegion,
} from "../controllers/plant.controller";
import { linkPlantToTag, unlinkPlantFromTag } from "../controllers/plant.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get("/", getAllPlants);
router.get("/:id", getPlantById);
router.post("/", authenticate, requireRole("ADMIN", "CONTRIBUTOR"), createPlant);
router.patch("/:id", authenticate, requireRole("ADMIN", "CONTRIBUTOR"), updatePlant);
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
