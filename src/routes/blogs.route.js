import { blogLiked, createBlog, deleteBlog, getAllBlogs, getBlogsByAuthorId, getPopularBlogs, searchBlog } from "../controllers/blog.controller.js";
import express from "express";
import multer from "multer";

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

router.post("/", upload.single('banner_image'), createBlog);
router.get("/all", getAllBlogs);
router.get("/popular", getPopularBlogs);
router.post("/liked/:blogId", blogLiked);
router.get("/:authorId", getBlogsByAuthorId);
router.get("/:keyword", searchBlog);
router.delete("/:blogId", deleteBlog);

export default router;