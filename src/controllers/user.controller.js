import {supabase, supabaseAdmin} from "../utils/supabaseClient.js";
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
        const userId = req.params.id;
        
        // First get the user to find their auth_id
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('auth_id')
            .eq('id', userId)
            .single();
            
        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete from custom users table first
        const { error: dbError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (dbError) {
            return res.status(400).json({ error: dbError.message });
        }

        // Delete from Supabase Auth if auth_id exists
        if (user.auth_id) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
                user.auth_id
            );
            
            if (authError) {
                console.error("Auth user deletion error:", authError);
                // Log error but don't fail the request since custom table deletion succeeded
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error("Delete user error:", error);
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

export const checkUsernameAvailability = async (req, res) => {
  const { username } = req.params;
  
  if (username === undefined) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: "Database error" }); // PGRST116: No rows found, which means username is available
    }

    if (data) {
      return res.json({ available: false });
    } else {
      return res.json({ available: true });
    }
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  
  try {
    // Fetch the user and their auth_id (UUID)
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("auth_id, email")
      .eq("email", email)
      .single();


    if (fetchError || !existingUser || !existingUser.auth_id) {
      return res.status(404).json({ 
        success: false, 
        error: "Email not found or auth_id missing" 
      });
    }

    // First, let's verify the user exists in auth.users
    const { data: authUser, error: authFetchError } = await supabaseAdmin.auth.admin.getUserById(existingUser.auth_id);

    if (authFetchError || !authUser) {
      return res.status(500).json({ 
        success: false, 
        error: "User not found in authentication system" 
      });
    }
    // Use auth_id (UUID) for Supabase Auth admin API
    const { data: updateResult, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.auth_id,
      { password: newPassword }
    );

    if (authError) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update authentication password: " + authError.message 
      });
    }

    // Hash and update password in your custom users table
    const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: dbError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (dbError) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update password in database: " + dbError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Password reset successfully" 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: "Error in resetting password" 
    });
  }
}