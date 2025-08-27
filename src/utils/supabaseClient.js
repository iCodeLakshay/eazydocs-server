import { createClient } from '@supabase/supabase-js'
import { configDotenv } from 'dotenv';
configDotenv();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
if (!supabase) {
    console.error('Failed to create Supabase client');
}else{
    console.log("Connected to supabase")
}
export default supabase;