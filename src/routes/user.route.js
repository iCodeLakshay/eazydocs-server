import { Router } from "express";
import { getAllUsers, getUserById, updateUser, deleteUser, uploadImage, checkUsernameAvailability } from "../controllers/user.controller.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/all', getAllUsers);
router.get('/:id', getUserById);
router.get('/check-username/:username', checkUsernameAvailability);
router.put('/:id', upload.single("profile_picture_file"), updateUser);
router.delete('/:id', deleteUser);
router.post('/upload/:id', upload.single("profile_picture_file"), uploadImage);

export default router;