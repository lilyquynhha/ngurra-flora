import { Router } from "express";
import {
  getAllOccurrences,
  getOccurrencesByPlant,
  getNearbyOccurrences,
  getOccurrencesInBbox,
  createOccurrence,
  deleteOccurrence,
} from "../controllers/occurrence.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get("/", getAllOccurrences);
router.get("/plant/:plantId", getOccurrencesByPlant);

router.get("/nearby", getNearbyOccurrences);
router.get("/bbox", getOccurrencesInBbox);

router.post("/", authenticate, requireRole("ADMIN", "CONTRIBUTOR"), createOccurrence);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteOccurrence);

export default router;
