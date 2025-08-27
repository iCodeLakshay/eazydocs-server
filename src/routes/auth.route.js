import { Router } from "express";
import { getLoggedInUser, login, signup } from "../controllers/auth.controller.js";
import { verifyUser } from "../Middlewares/verifyUser.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyUser, getLoggedInUser);

export default router;