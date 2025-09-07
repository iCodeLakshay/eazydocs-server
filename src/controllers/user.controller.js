import supabase from "../utils/supabaseClient.js";
import bcrypt from "bcryptjs";
import { uploadProfilePicture } from "../utils/uploadImage.js";


export const createUser = async (req, res) => {
    try {
        // Hash password if provided
        const payload = { ...req.body };
        if (payload.password) {
            payload.password = await bcrypt.hash(payload.password, 10);
        }

        const { error } = await supabase
            .from('users')
            .insert(payload);

        if (error) return res.status(400).json({ error: error.message });
            
        // Fetch the newly created user (replace 'email' with your unique field if needed)
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', payload.email)
            .single();

        if (fetchError) return res.status(400).json({ error: fetchError.message });

        // Never return password
        if (user && 'password' in user) delete user.password;
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error in creating user' });
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error in fetching users' });
    }
}

export const getUserById = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('id,name,email,username,profile_picture,tagline,biography,topics,social_links,blogs,role,phone_number').eq('id', req.params.id).single();
        if (error) res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error in fetching user' });
    }
}

export const updateUser = async (req, res) => {
    try {      
        let updatePayload = { ...req.body };

        // Parse JSON fields
        if (updatePayload.social_links && typeof updatePayload.social_links === 'string') {
            updatePayload.social_links = JSON.parse(updatePayload.social_links);
        }
        if (updatePayload.topics && typeof updatePayload.topics === 'string') {
            updatePayload.topics = JSON.parse(updatePayload.topics);
        }

        // If file provided, upload and get URL
        if (req.file) {
            const profile_picture_url = await uploadProfilePicture(req.params.id, req.file);            
            // Store the URL string in profile_picture column
            updatePayload.profile_picture = profile_picture_url;
        }

        // Update database with URL string
        const { data, error } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', req.params.id)
            .select('id,name,email,username,profile_picture,tagline,biography,topics,social_links,blogs,role,phone_number');

        if (error) {
            console.error('Database update error:', error);
            return res.status(400).json({ error: error.message });
        }

        const updatedUser = data && data.length > 0 ? data[0] : null;
        if (!updatedUser) return res.status(404).json({ error: 'User not found after update' });

        return res.status(200).json({ 
            message: 'Profile updated successfully',
            user: updatedUser 
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({ error: 'Error in updating user' });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').delete().eq('id', req.params.id);
        if (error) return res.status(400).json({ error: error.message });        
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Error in deleting user' });
    }
}

export const uploadImage = async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileExt = file.originalname.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile_pics/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_pics")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("profile_pics")
      .getPublicUrl(filePath);

    // Update public.users table
    const { error: dbError } = await supabase
      .from("users") // this points to public.users now
      .update({ profile_picture: publicData.publicUrl })
      .eq("id", userId);

    if (dbError) throw dbError;

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      url: publicData.publicUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Upload failed" });
  }
};

