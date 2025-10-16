import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
export const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// ✅ Client utama (frontend)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "stayclever-auth",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ✅ Client service role (untuk operasi admin)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
