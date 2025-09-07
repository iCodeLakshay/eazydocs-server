import supabase from "./supabaseClient.js";

// Helper function for image upload
export async function uploadProfilePicture(userId, file) {
  const fileExt = file.originalname.split('.').pop();
  const filePath = `${userId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('profile_pics')
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from('profile_pics')
    .getPublicUrl(filePath);

  return publicData.publicUrl; // ensure this is a string
}