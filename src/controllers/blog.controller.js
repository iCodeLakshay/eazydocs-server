import generateSlug from "../utils/generateSlug.js";
import {supabase} from "../utils/supabaseClient.js";

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

// Small helpers
const parseTags = (tags) => {
    if (!tags) return [];
    try {
        if (Array.isArray(tags)) return tags;
        return JSON.parse(tags);
    } catch {
        return [];
    }
};

const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

export const createBlog = async (req, res) => {
    try {
        const { title, subtitle, content, author, tags, isPublished } = req.body;

        if (!title || !subtitle || !content || !author) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const blogPayload = {
            title,
            subtitle,
            content,
            author,
            banner_image: null,
            tags: parseTags(tags),
            slug: generateSlug(title, author, 10),
            isPublished: toBool(isPublished),
            approved: true, // default approved for now
            created_at: new Date().toISOString(),
        };

        // 1) Create blog to get id
        const { data: createdBlog, error: blogError } = await supabase
            .from('blogs')
            .insert(blogPayload)
            .select()
            .single();
        if (blogError) return res.status(400).json({ error: blogError.message });

        // 2) In parallel: upload banner (if any) and fetch user's blogs
        const [bannerImageUrl, userResult] = await Promise.all([
            req.file ? uploadBannerImage(createdBlog.id, req.file) : Promise.resolve(null),
            supabase.from('users').select('blogs').eq('id', author).single(),
        ]);

        if (userResult.error) return res.status(400).json({ error: userResult.error.message });

        // 3) Update blog with banner url (no select round-trip) and update user's blogs
        const updatedBlogs = userResult.data?.blogs ? [...userResult.data.blogs, createdBlog.id] : [createdBlog.id];

        const updates = [];
        if (bannerImageUrl) {
            createdBlog.banner_image = bannerImageUrl; // reflect in response
            updates.push(
                supabase.from('blogs').update({ banner_image: bannerImageUrl }).eq('id', createdBlog.id)
            );
        }
        updates.push(
            supabase.from('users').update({ blogs: updatedBlogs }).eq('id', author)
        );

        const results = await Promise.all(updates);
        const failing = results.find(r => r?.error);
        if (failing?.error) return res.status(400).json({ error: failing.error.message });

        return res.status(201).json({
            message: 'Blog created successfully',
            blog: createdBlog,
            userBlogs: updatedBlogs,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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

export const getAllBlogs = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select(`
                *,
                users (
                    name,
                    profile_picture
                )
            `)
            .order('created_at', { ascending: false });

            if(error)
                return res.status(400).json({ error: error.message });
            console.log("All Blogs data:", data);
            res.status(200).json({ blogs: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const searchBlog = async (req, res) => {
  try {
    const raw = req.params.keyword ?? '';
    const keyword = String(raw).trim();
    if (!keyword) {
      // Return latest blogs when no keyword provided
      const { data, error } = await supabase
        .from('blogs')
        .select(`
          *,
          users (
            name,
            profile_picture
          )
        `)
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ blogs: data });
    }

    // Escape characters that break the OR string (basic)
    const safe = keyword.replace(/[(),]/g, ' ').trim();

    // Build base query
    let query = supabase
      .from('blogs')
      .select(
        `
        *,
        users (
          name,
          profile_picture
        )
      `
      )
      .order('created_at', { ascending: false });

    // OR across blog columns
    // - Use * for PostgREST wildcards
    // - tags.cs.{value} only matches exact tag element
    const orClauses = [
      `title.ilike.*${safe}*`,
      `subtitle.ilike.*${safe}*`,
      `content.ilike.*${safe}*`,
      // Exact tag match (works if tags is text[])
      `tags.cs.{${safe}}`,
    ].join(',');

    query = query.or(orClauses);

    // Add foreign-table OR on users (author name)
    // You can include username also if it exists: `name.ilike.*...*,username.ilike.*...*`
    query = query.or(`name.ilike.*${safe}*`, { foreignTable: 'users' });

    // Optional: if the keyword looks like an ID, also match by author id
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(safe);
    const isInt = /^\d+$/.test(safe);
    if (isUUID || isInt) {
      query = query.or(`author.eq.${safe}`);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ blogs: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};