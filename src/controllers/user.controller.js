import supabase from "../utils/supabaseClient.js";
import bcrypt from "bcryptjs";


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
        const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
        if (error) res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error in fetching user' });
    }
}
export const updateUser = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').update(req.body).eq('id', req.params.id);
        if (error) res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error in updating user' });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').delete().eq('id', req.params.id);
        if (error) res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error in deleting user' });
    }
}

