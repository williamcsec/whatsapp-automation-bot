import { createBrowserClient } from '@supabase/ssr';

// Safe to expose to the client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This creates a singleton supabase client that can be used across client components
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
