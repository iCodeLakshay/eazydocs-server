import supabase from "../utils/supabaseClient.js";


export const createBlog = async (req, res) => {
    try {
        // Insert the blog and get the created blog data
        const { data: blogData, error: blogError } = await supabase
            .from('blogs')
            .insert(req.body)
            .select()
            .single();
        
        if (blogError) return res.status(400).json({ error: blogError.message });

        // Update the user's blogs array to include the new blog ID
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('blogs')
            .eq('id', req.body.author)
            .single();

        if (userError) return res.status(400).json({ error: userError.message });

        // Add the new blog ID to the existing blogs array
        const updatedBlogs = userData.blogs ? [...userData.blogs, blogData.id] : [blogData.id];

        // Update the user's blogs array
        const { error: updateError } = await supabase
            .from('users')
            .update({ blogs: updatedBlogs })
            .eq('id', req.body.author);

        if (updateError) return res.status(400).json({ error: updateError.message });

        res.status(201).json({
            message: 'Blog created successfully',
            blog: blogData,
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