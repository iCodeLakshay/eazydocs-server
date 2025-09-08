import { createBlog, getBlogsByAuthorId } from "../controllers/blog.controller.js";
import express from "express";

const router = express.Router();

router.post("/", createBlog);
router.get("/:authorId", getBlogsByAuthorId)

export default router;