import { Router } from "express";
import { getAllUsers, getUserById, updateUser, deleteUser, uploadImage, checkUsernameAvailability, resetPassword } from "../controllers/user.controller.js";
import multer from "multer";
import { supabaseAdmin } from "../utils/supabaseClient.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/all', getAllUsers);
router.get('/:id', getUserById);
router.get('/check-username/:username', checkUsernameAvailability);
router.put('/:id', upload.single("profile_picture_file"), updateUser);
router.delete('/:id', deleteUser);
router.post('/upload/:id', upload.single("profile_picture_file"), uploadImage);
router.post('/reset-password', resetPassword)

export default router;