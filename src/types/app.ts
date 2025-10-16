export type Role = "owner" | "manager" | "staff";

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  password_hash?: string;
  user_activities?: ActivityRow[];
}

export interface ActivityRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface RoomRow {
  id: string;
  number: string;
  type: string;
  price: number;
  status: "available" | "occupied" | "cleaning" | "reserved";
  reservation_date?: string | null;
  check_out_date?: string | null;
  created_at?: string;
}

export interface RoomTypeRow {
  id: string;
  name: string;
  created_at?: string;
}

export interface GuestRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  check_in: string;
  check_out: string;
  room_id: string;
  nights: number;
  price_per_night: number;
  total_price: number;
  payment_method: string;
  payment_status: "paid" | "unpaid";
  booking_status: "reservation" | "checked-in" | "checked-out";
  received_by?: string | null;
  created_at?: string;
  room?: Pick<RoomRow, "id" | "number" | "type" | "price" | "status"> | null;
}

export interface MenuItemRow {
  id: string;
  name: string;
  category: "breakfast" | "menu";
  price: number;
  description?: string | null;
  created_at?: string;
}

export interface FacilityRow {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  created_at?: string;
}

export interface TransactionRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category: string;
  created_at?: string;
}

export interface DashboardMetricRow {
  total_guests: number;
  available_rooms: number;
  revenue_today: number;
  occupancy_rate: number;
}

export interface ReportSummaryRow {
  period: string;
  total_guests: number;
  avg_occupancy: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface WeeklyTrendRow {
  day: string;
  revenue: number;
  expenses: number;
}

export interface MonthlyTrendRow {
  month: string;
  revenue: number;
  expenses: number;
}

export interface RoomTypeOccupancyRow {
  name: string;
  value: number;
  color?: string | null;
}
