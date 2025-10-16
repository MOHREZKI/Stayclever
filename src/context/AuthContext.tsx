import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";
import type { Role } from "@/types/app";

/* -------------------------------------------------------------------------- */
/*                                  TYPING                                    */
/* -------------------------------------------------------------------------- */

interface Activity {
  id: string;
  message: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  activities: Activity[];
}

interface AuthContextValue {
  users: PublicUser[];
  currentUser: PublicUser | null;
  isInitialised: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role?: Role }) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                                  CONTEXT                                   */
/* -------------------------------------------------------------------------- */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [isInitialised, setIsInitialised] = useState(false);

  /* ------------------------------ LOAD USER -------------------------------- */

  const loadCurrentUser = useCallback(async (userId: string | null) => {
    if (!userId) {
      setCurrentUser(null);
      setUsers([]);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const mapped: PublicUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as Role,
      createdAt: data.created_at,
      activities: [],
    };

    setCurrentUser(mapped);
    return mapped;
  }, []);

  /* ------------------------------ INIT SESSION ----------------------------- */

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data.session?.user?.id ?? null;
        await loadCurrentUser(sessionUserId);
      } catch {
        setCurrentUser(null);
      } finally {
        setIsInitialised(true);
      }
    };

    init();
  }, [loadCurrentUser]);

  /* ------------------------------ LOGIN / OUT ------------------------------ */

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.user) await loadCurrentUser(data.user.id);
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }, []);

  /* ------------------------------ REGISTER --------------------------------- */

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role?: Role }) => {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
      });

      if (error) throw new Error(error.message);
      const userId = data.user?.id;
      if (!userId) throw new Error("User ID tidak ditemukan setelah sign-up.");

      const newProfile: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: userId,
        name: payload.name,
        email: payload.email,
        role: payload.role ?? "staff",
      };

      const { error: insertError } = await supabase.from("profiles").insert(newProfile);
      if (insertError) throw new Error(insertError.message);
    },
    [],
  );

  /* -------------------------------------------------------------------------- */

  const value = useMemo<AuthContextValue>(
    () => ({
      users,
      currentUser,
      isInitialised,
      login,
      logout,
      register,
    }),
    [users, currentUser, isInitialised, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/*                                  HOOKS                                     */
/* -------------------------------------------------------------------------- */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
