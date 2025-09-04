import jwt from "jsonwebtoken";
import supabase from "../utils/supabaseClient.js";

export const verifyUser = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Not Authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return res.status(401).json({ error: "Invalid token" });

    // Only verify identity, e.g.:
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("email", decoded.email)
      .single();
    req.user = user ?? { email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Not Authenticated" });
  }
};