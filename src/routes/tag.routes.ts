import { Router } from "express";
import { getAllTags, getTagById, createTag, deleteTag } from "../controllers/tag.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { linkPlantToTag, unlinkPlantFromTag } from "../controllers/plant.controller";

const router = Router();

router.get("/", getAllTags);
router.get("/:id", getTagById);
router.post("/", authenticate, requireRole("ADMIN", "CONTRIBUTOR"), createTag);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteTag);

// Plant association
router.post(
  "/plants/:id/tags/:tagId",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  linkPlantToTag,
);
router.delete("/plants/:id/tags/:tagId", authenticate, requireRole("ADMIN"), unlinkPlantFromTag);

export default router;
