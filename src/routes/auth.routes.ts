import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { LoginSchema, RegisterSchema, validate } from "../lib/schemaValidation";

const router = Router();

router.post("/register", validate(RegisterSchema), register);
router.post("/login", validate(LoginSchema), login);
router.get("/me", authenticate, me);

export default router;
