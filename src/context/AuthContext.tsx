import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseUrl } from "@/lib/supabaseClient";
import type { ActivityRow, ProfileRow, Role } from "@/types/app";

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
  createUser: (payload: { name: string; email: string; role: Role; password: string }) => Promise<void>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  recordActivity: (userId: string, message: string) => Promise<void>;
}

const MAX_ACTIVITIES = 20;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

declare global {
  var __supabaseAdminClient: ReturnType<typeof createClient> | undefined;
}

let supabaseAdmin: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: "stayclever-admin" },
  });
  window.__supabaseAdminClient = supabaseAdmin;
}

const mapActivities = (rows: ActivityRow[] | null | undefined): Activity[] =>
  (rows ?? [])
    .map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: row.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ACTIVITIES);

const toPublicUser = (
  profile: ProfileRow & {
    user_activities?: ActivityRow[] | null;
  },
): PublicUser => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  createdAt: profile.created_at,
  activities: mapActivities(profile.user_activities),
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [isInitialised, setIsInitialised] = useState(false);

  const loadCurrentUser = useCallback(async (userId: string | null) => {
    if (!userId) {
      setCurrentUser(null);
      setUsers([]);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at, user_activities(id, message, created_at)")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      setCurrentUser(null);
      setUsers([]);
      return null;
    }

    const mapped = toPublicUser(data);
    setCurrentUser(mapped);

    if (mapped.role !== "owner") {
      setUsers([mapped]);
    }

    return mapped;
  }, []);

  const loadAllUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at, user_activities(id, message, created_at)")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const mapped = (data ?? []).map(toPublicUser);
    setUsers(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialise = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw new Error(error.message);
        }
        if (cancelled) return;
        const sessionUserId = data.session?.user?.id ?? null;
        const profile = await loadCurrentUser(sessionUserId);
        if (profile?.role === "owner") {
          await loadAllUsers();
        }
      } catch (error) {
        console.error("Failed to initialise auth context", error);
        setCurrentUser(null);
        setUsers([]);
      } finally {
        if (!cancelled) {
          setIsInitialised(true);
        }
      }
    };

    initialise();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (cancelled) return;
      const profile = await loadCurrentUser(session?.user?.id ?? null);
      if (profile?.role === "owner") {
        await loadAllUsers();
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadAllUsers, loadCurrentUser]);

  const recordActivityInternal = useCallback(
    async (userId: string, message: string, options?: { skipRefresh?: boolean }) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const { error } = await supabase.from("user_activities").insert({
        user_id: userId,
        message: trimmed,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (options?.skipRefresh) {
        return;
      }

      if (currentUser?.id === userId) {
        await loadCurrentUser(userId);
      } else if (currentUser?.role === "owner") {
        await loadAllUsers();
      }
    },
    [currentUser, loadAllUsers, loadCurrentUser],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const formattedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Tidak dapat masuk dengan kredensial tersebut.");
      }

      const profile = await loadCurrentUser(data.user.id);
      if (profile?.role === "owner") {
        await loadAllUsers();
      }
      await recordActivityInternal(data.user.id, "Masuk ke sistem.");
    },
    [loadAllUsers, loadCurrentUser, recordActivityInternal],
  );

  const logout = useCallback(async () => {
    if (!currentUser) return;
    await recordActivityInternal(currentUser.id, "Keluar dari sistem.");
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
  }, [currentUser, recordActivityInternal]);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role?: Role }) => {
      const role: Role = payload.role ?? "staff";
      const formattedEmail = payload.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password: payload.password,
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Pendaftaran gagal. Coba lagi.");
      }

      const profilePayload = {
        id: data.user.id,
        name: payload.name.trim(),
        email: formattedEmail,
        role,
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
      if (profileError) {
        throw new Error(profileError.message);
      }

      const profile = await loadCurrentUser(data.user.id);
      if (profile?.role === "owner") {
        await loadAllUsers();
      }
      await recordActivityInternal(data.user.id, "Mendaftar akun baru.");
    },
    [loadAllUsers, loadCurrentUser, recordActivityInternal],
  );

  const createUser = useCallback(
    async (payload: { name: string; email: string; role: Role; password: string }) => {
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error("Hanya owner yang dapat menambahkan pengguna.");
      }
      if (!supabaseAdmin) {
        throw new Error(
          "Konfigurasi admin Supabase belum tersedia. Set VITE_SUPABASE_SERVICE_ROLE_KEY di environment yang aman."
        );
      }

      const adminResponse = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
      });

      if (adminResponse.error || !adminResponse.data.user) {
        throw new Error(adminResponse.error?.message ?? "Gagal membuat pengguna baru.");
      }

      const newUser = adminResponse.data.user;
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: newUser.id,
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
      });

      if (profileError) {
        throw new Error(profileError.message);
      }

      await loadAllUsers();
      await recordActivityInternal(currentUser.id, `Menambahkan pengguna baru ${payload.name} (${payload.role}).`);
    },
    [currentUser, loadAllUsers, recordActivityInternal],
  );

  const updateUserRole = useCallback(
    async (userId: string, role: Role) => {
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error("Hanya owner yang dapat memperbarui role.");
      }
      if (userId === currentUser.id && role !== "owner") {
        throw new Error("Owner tidak dapat menurunkan rolenya sendiri.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (error) {
        throw new Error(error.message);
      }

      if (userId === currentUser.id) {
        await loadCurrentUser(userId);
      } else {
        await loadAllUsers();
      }

      const target = users.find((user) => user.id === userId);
      const targetLabel = target ? `${target.name} (${target.email})` : userId;
      await recordActivityInternal(
        currentUser.id,
        `Memperbarui role pengguna ${targetLabel} menjadi ${role}.`,
      );
    },
    [currentUser, loadAllUsers, loadCurrentUser, recordActivityInternal, users],
  );

  const removeUser = useCallback(
    async (userId: string) => {
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error("Hanya owner yang dapat menghapus pengguna.");
      }
      if (userId === currentUser.id) {
        throw new Error("Owner tidak dapat menghapus dirinya sendiri.");
      }
      if (!supabaseAdmin) {
        throw new Error(
          "Konfigurasi admin Supabase belum tersedia. Set VITE_SUPABASE_SERVICE_ROLE_KEY di environment yang aman."
        );
      }

      const response = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (response.error) {
        throw new Error(response.error.message);
      }

      await loadAllUsers();
      const target = users.find((user) => user.id === userId);
      const targetLabel = target ? `${target.name} (${target.email})` : userId;
      await recordActivityInternal(currentUser.id, `Menghapus pengguna ${targetLabel}.`);
    },
    [currentUser, loadAllUsers, recordActivityInternal, users],
  );

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!currentUser) {
        throw new Error("Tidak ada sesi aktif.");
      }

      const reauth = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (reauth.error) {
        throw new Error("Kata sandi saat ini tidak cocok.");
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message);
      }

      await recordActivityInternal(currentUser.id, "Mengganti kata sandi.");
    },
    [currentUser, recordActivityInternal],
  );

  const resetUserPassword = useCallback(
    async (userId: string, newPassword: string) => {
      if (!currentUser || currentUser.role !== "owner") {
        throw new Error("Hanya owner yang dapat mengatur ulang kata sandi.");
      }
      if (!supabaseAdmin) {
        throw new Error(
          "Konfigurasi admin Supabase belum tersedia. Set VITE_SUPABASE_SERVICE_ROLE_KEY di environment yang aman."
        );
      }

      const response = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (response.error) {
        throw new Error(response.error.message);
      }

      const target = users.find((user) => user.id === userId);
      const targetLabel = target ? `${target.name} (${target.email})` : userId;
      await recordActivityInternal(currentUser.id, `Mengatur ulang kata sandi pengguna ${targetLabel}.`);
    },
    [currentUser, recordActivityInternal, users],
  );

  const recordActivity = useCallback(
    async (userId: string, message: string) => recordActivityInternal(userId, message),
    [recordActivityInternal],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      users,
      currentUser,
      isInitialised,
      login,
      logout,
      register,
      createUser,
      updateUserRole,
      removeUser,
      changeOwnPassword,
      resetUserPassword,
      recordActivity,
    }),
    [
      changeOwnPassword,
      createUser,
      currentUser,
      isInitialised,
      login,
      logout,
      recordActivity,
      register,
      removeUser,
      resetUserPassword,
      updateUserRole,
      users,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
