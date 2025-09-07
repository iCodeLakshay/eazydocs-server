import { createClient } from '@supabase/supabase-js'
import { configDotenv } from 'dotenv';
configDotenv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const keyPreview = process.env.SUPABASE_KEY ? `${process.env.SUPABASE_KEY.slice(0,8)}...${process.env.SUPABASE_KEY.slice(-4)}` : 'no-key';
console.log('Connected to supabase — key preview:', keyPreview); // safe preview

export default supabase;