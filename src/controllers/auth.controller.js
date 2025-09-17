import supabase from "../utils/supabaseClient.js";
import { createUser } from "./user.controller.js";
import jwt from 'jsonwebtoken'

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    let email = identifier;

    if (!identifier.includes("@")) {
      const userRecord = await supabase
        .from("users")
        .select("email")
        .eq("username", identifier)
        .single();
      if (!userRecord.data) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      email = userRecord.data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error.message;

    // correct user reference: data.user contains the supabase user
    const supUser = data.user;

    // sign meaningful payload (user id from auth or from profile table)
    const payload = { id: supUser.id, email: supUser.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    // set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 1000,
    });

    const profileRes = await supabase
      .from("users")
      .select("name,email,username,profile_picture,tagline,biography,social_links,blogs,role,phone_number") // Only safe fields
      .eq("auth_id", supUser.id)
      .single();
    const profile = profileRes.data ?? { id: supUser.id, email: supUser.email };

    // remove sensitive fields before sending
    if (profile && profile.password) delete profile.password;

    return res.status(200).json({ message: "Login successful", user: profile });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

export const signup = async (req, res) => {
    const { email, password, name, phone_number, username } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;

        // Persist profile details in users table via existing controller
        req.body = { email, password, name, phone_number, username };
        return createUser(req, res);
    } catch (error) {
        return res.status(401).json({ error: error.message });
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie("token");
        res.json({ message: "Logged out" })
    } catch (error) {
        res.status(400).json({ message: "Error in logging out" })
    }
}

export const getLoggedInUser = async (req, res) => {
  try {
    // Fetch full profile using email from req.user
    const { data: profile, error } = await supabase
      .from("users")
      .select("id,name,email,username,profile_picture,tagline,biography,social_links,blogs,role,phone_number,topics,created_at")
      .eq("email", req.user.email)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: profile });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
