import { Router } from "express";
import {
  getAllOccurrences,
  getOccurrencesByPlant,
  getNearbyOccurrences,
  getOccurrencesInBbox,
  createOccurrence,
  updateOccurrence,
  deleteOccurrence,
} from "../controllers/occurrence.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { CreateOccurrenceSchema, UpdateOccurenceSchema, validate } from "../lib/schemaValidation";

const router = Router();

router.get("/", getAllOccurrences);
router.get("/plant/:plantId", getOccurrencesByPlant);

router.get("/nearby", getNearbyOccurrences);
router.get("/bbox", getOccurrencesInBbox);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  validate(CreateOccurrenceSchema),
  createOccurrence,
);
router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN", "CONTRIBUTOR"),
  validate(UpdateOccurenceSchema),
  updateOccurrence,
);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteOccurrence);

export default router;
