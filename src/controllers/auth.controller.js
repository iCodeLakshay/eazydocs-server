import supabase from "../utils/supabaseClient.js";
import { createUser } from "./user.controller.js";
import jwt from 'jsonwebtoken'

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;

        // Created JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

        // Set that JWT token in the cookies
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // for only https in production
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 1000, // for deleting token after 7 days
        });

        res.status(200).json({ message: "Login successfull", user });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

export const signup = async (req, res) => {
    const { email, password, name, phone_number } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;

        // Persist profile details in users table via existing controller
        req.body = { email, password, name, phone_number };
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

export const getLoggedInUser = (req, res) =>{
    res.json({user: req.user});
}