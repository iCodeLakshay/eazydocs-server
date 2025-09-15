import generateSlug from "../utils/generateSlug.js";
import supabase from "../utils/supabaseClient.js";

// Helper function for banner image upload
async function uploadBannerImage(blogId, file) {
    const fileExt = file.originalname.split('.').pop();
    const filePath = `blog-${blogId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('blog_banners')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

    if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
    }

    const { data: publicData } = supabase.storage
        .from('blog_banners')
        .getPublicUrl(filePath);

    return publicData.publicUrl;
}

export const createBlog = async (req, res) => {
    try {
        // Parse tags if it's a string
        let parsedTags = [];
        if (req.body.tags) {
            try {
                parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
            } catch (error) {
                return res.status(400).json({ error: 'Invalid tags format' });
            }
        }

        // Parse isPublished boolean
        const isPublished = req.body.isPublished === 'true' || req.body.isPublished === true;

        // Prepare blog data
        const blogData = {
            title: req.body.title,
            subtitle: req.body.subtitle,
            content: req.body.content,
            author: req.body.author,
            tags: parsedTags,
            slug: generateSlug(req.body.title, req.body.author, 10),
            isPublished: isPublished,
            approved: true, // Default to false, admin will approve
            created_at: new Date().toISOString(),
        };

        // Insert the blog first to get the blog ID
        const { data: createdBlog, error: blogError } = await supabase
            .from('blogs')
            .insert(blogData)
            .select()
            .single();
        
        if (blogError) return res.status(400).json({ error: blogError.message });

        // Upload banner image if provided
        let bannerImageUrl = null;
        if (req.file) {
            try {
                bannerImageUrl = await uploadBannerImage(createdBlog.id, req.file);
                
                // Update the blog with banner image URL
                const { data: updatedBlog, error: updateError } = await supabase
                    .from('blogs')
                    .update({ banner_image: bannerImageUrl })
                    .eq('id', createdBlog.id)
                    .select()
                    .single();

                if (updateError) return res.status(400).json({ error: updateError.message });
                createdBlog.banner_image = bannerImageUrl;
            } catch (uploadError) {
                console.error('Banner image upload failed:', uploadError);
                return res.status(400).json({ error: 'Failed to upload banner image' });
            }
        }

        // Update the user's blogs array to include the new blog ID
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('blogs')
            .eq('id', req.body.author)
            .single();

        if (userError) return res.status(400).json({ error: userError.message });

        // Add the new blog ID to the existing blogs array
        const updatedBlogs = userData.blogs ? [...userData.blogs, createdBlog.id] : [createdBlog.id];

        // Update the user's blogs array
        const { error: updateError } = await supabase
            .from('users')
            .update({ blogs: updatedBlogs })
            .eq('id', req.body.author);

        if (updateError) return res.status(400).json({ error: updateError.message });

        res.status(201).json({
            message: 'Blog created successfully',
            blog: createdBlog,
            userBlogs: updatedBlogs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getBlogsByAuthorId = async (req, res) => {
    try {
        const authorId = req.params.authorId;
        const { data, error } = await supabase
            .from('blogs')
            .select(`
                *,
                users (
                    name,
                    profile_picture
                )
            `)
            .eq('author', authorId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({ blogs: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        // Fetch the blog to get the author ID
        const { data: blogData, error: fetchError } = await supabase
            .from('blogs')
            .select('author')
            .eq('id', blogId)
            .single();

        if (fetchError) {
            return res.status(400).json({ error: fetchError.message });
        }

        // Check if the user is the author of the blog
        if (blogData.author !== req.body.authorId) {
            return res.status(403).json({ error: 'You are not authorized to delete this blog' });
        }

        // Delete the blog
        const { error: deleteError } = await supabase
            .from('blogs')
            .delete()
            .eq('id', blogId);

        if (deleteError) {
            return res.status(400).json({ error: deleteError.message });
        }

        // Remove the blog ID from the user's blogs array
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('blogs')
            .eq('id', blogData.author)
            .single();
        if (userError) return res.status(400).json({ error: userError.message });

        const updatedBlogs = userData.blogs ? userData.blogs.filter(id => id !== blogId) : [];

        // Update the user's blogs array
        const { error: updateError } = await supabase
            .from('users')
            .update({ blogs: updatedBlogs })
            .eq('id', blogData.author);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}