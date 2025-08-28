import { Router } from "express";
import { getLoggedInUser, login, logout, signup } from "../controllers/auth.controller.js";
import { verifyUser } from "../Middlewares/verifyUser.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyUser, getLoggedInUser);
router.get("/logout", verifyUser, logout);

export default router;