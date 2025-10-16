export type Role = "owner" | "manager" | "staff";

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}
