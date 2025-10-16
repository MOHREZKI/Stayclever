import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
const WEEKLY_QUERY_KEY = ["reports", "weekly-trend"];
const MONTHLY_QUERY_KEY = ["reports", "monthly-summary"];
const ROOM_TYPE_QUERY_KEY = ["reports", "room-type-occupancy"];

const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" });

const Reports = () => {
  const { isInitialised } = useAuth();

  const weeklyQuery = useQuery({
    queryKey: WEEKLY_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_daily_cashflow")
        .select("date, income, expense")
        .order("date", { ascending: true });
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        date: string;
        income: number;
        expense: number;
      }>;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const monthlyQuery = useQuery({
    queryKey: MONTHLY_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_monthly_summary")
        .select("period, revenue, expenses, profit")
        .order("period", { ascending: true });
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        period: string;
        revenue: number;
        expenses: number;
        profit: number;
      }>;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const roomTypeOccupancyQuery = useQuery({
    queryKey: ROOM_TYPE_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("booking_status, rooms(room_types(name))")
        .eq("booking_status", "checked-in");
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        booking_status: "reservation" | "checked-in" | "checked-out";
        rooms: { room_types: { name: string } | { name: string }[] | null } | null;
      }>;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const weeklyData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        day: dayFormatter.format(date),
        revenue: 0,
        expenses: 0,
      };
    });

    const dataset = weeklyQuery.data ?? [];
    const map = new Map(base.map((item) => [item.key, item]));

    dataset.forEach((row) => {
      const normalized = new Date(row.date).toISOString().slice(0, 10);
      if (!map.has(normalized)) return;
      const bucket = map.get(normalized)!;
      bucket.revenue += Number(row.income) || 0;
      bucket.expenses += Number(row.expense) || 0;
    });

    return Array.from(map.values());
  }, [weeklyQuery.data]);

  const weeklyTotalIncome = weeklyData.reduce((sum, item) => sum + item.revenue, 0);
  const weeklyTotalExpense = weeklyData.reduce((sum, item) => sum + item.expenses, 0);

  const monthlyTrendData = useMemo(() => {
    const dataset = monthlyQuery.data ?? [];
    return dataset.map((item) => ({
      month: item.period,
      revenue: Number(item.revenue) || 0,
      expenses: Number(item.expenses) || 0,
      profit: Number(item.profit) || 0,
    }));
  }, [monthlyQuery.data]);

  const monthlyIncomeTotal = monthlyTrendData.reduce((sum, item) => sum + item.revenue, 0);
  const monthlyExpenseTotal = monthlyTrendData.reduce((sum, item) => sum + item.expenses, 0);
  const monthlyProfitTotal = monthlyIncomeTotal - monthlyExpenseTotal;

  const roomTypeData = useMemo(() => {
    const rows = roomTypeOccupancyQuery.data ?? [];
    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      const roomTypes = row.rooms?.room_types;
      let name = "-";
      if (Array.isArray(roomTypes)) {
        name = roomTypes[0]?.name ?? "-";
      } else if (roomTypes && typeof roomTypes === "object" && "name" in roomTypes) {
        name = roomTypes.name ?? "-";
      }
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      return [];
    }

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value: Number(((value / total) * 100).toFixed(2)),
    }));
  }, [roomTypeOccupancyQuery.data]);

  const COLORS = ["hsl(217 91% 35%)", "hsl(43 96% 56%)", "hsl(142 71% 45%)", "hsl(12 74% 44%)"];

  const isWeeklyReady = !weeklyQuery.isLoading && !weeklyQuery.isError;
  const isMonthlyReady = !monthlyQuery.isLoading && !monthlyQuery.isError;
  const isRoomTypeReady =
    !roomTypeOccupancyQuery.isLoading && !roomTypeOccupancyQuery.isError && roomTypeData.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Laporan Keuangan</h1>
        <p className="text-muted-foreground mt-1">Analisis keuangan per periode</p>
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="daily">Harian</TabsTrigger>
          <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          <TabsTrigger value="yearly">Tahunan</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card className="p-6 bg-gradient-card shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Ringkasan Harian</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-success/10 p-4">
                <p className="text-xs uppercase tracking-wide text-success/70">Total Pendapatan (7 hari)</p>
                <p className="text-2xl font-semibold text-success">{currencyFormatter.format(weeklyTotalIncome)}</p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-4">
                <p className="text-xs uppercase tracking-wide text-destructive/70">Total Pengeluaran (7 hari)</p>
                <p className="text-2xl font-semibold text-destructive">
                  {currencyFormatter.format(weeklyTotalExpense)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-md">
            <h3 className="font-semibold text-lg mb-4">Tren Mingguan</h3>
            {weeklyQuery.isLoading ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Mengambil data tren mingguan...
              </div>
            ) : weeklyQuery.isError || !isWeeklyReady ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Belum ada data tren mingguan yang dapat ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${numberFormatter.format(value / 1_000_000)}jt`}
                  />
                  <Tooltip
                    formatter={(value: number) => `Rp ${numberFormatter.format(value)}`}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Pendapatan" fill="hsl(var(--success))" />
                  <Bar dataKey="expenses" name="Pengeluaran" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card className="p-6 bg-gradient-card shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Ringkasan 6 Bulan Terakhir</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-success/10 p-4">
                <p className="text-xs uppercase tracking-wide text-success/70">Total Pendapatan</p>
                <p className="text-xl font-semibold text-success">{currencyFormatter.format(monthlyIncomeTotal)}</p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-4">
                <p className="text-xs uppercase tracking-wide text-destructive/70">Total Pengeluaran</p>
                <p className="text-xl font-semibold text-destructive">
                  {currencyFormatter.format(monthlyExpenseTotal)}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wide text-primary/70">Total Laba</p>
                <p className="text-xl font-semibold text-primary">{currencyFormatter.format(monthlyProfitTotal)}</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="font-semibold text-lg mb-4">Tren Pendapatan & Pengeluaran</h3>
              {monthlyQuery.isLoading ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Mengambil data tren bulanan...
                </div>
              ) : monthlyQuery.isError || !isMonthlyReady ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Belum ada data tren bulanan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${numberFormatter.format(value / 1_000_000)}jt`}
                    />
                    <Tooltip
                      formatter={(value: number) => `Rp ${numberFormatter.format(value)}`}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Pengeluaran"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--success))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="font-semibold text-lg mb-4">Okupansi per Tipe Kamar</h3>
              {roomTypeOccupancyQuery.isLoading ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Mengambil data okupansi kamar...
                </div>
              ) : roomTypeOccupancyQuery.isError || !isRoomTypeReady ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Belum ada tamu berstatus check-in sehingga data okupansi tidak tersedia.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={roomTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {roomTypeData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <Card className="p-6 bg-gradient-card shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Ringkasan Tahunan</h3>
            </div>
            <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              Gunakan data bulanan di atas sebagai referensi. Segmentasi tahunan akan tersedia setelah beberapa bulan data
              terkumpul.
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-md">
            <h3 className="font-semibold text-lg mb-4">Tren Pendapatan & Pengeluaran Tahunan</h3>
            {monthlyQuery.isLoading ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Mengambil data tren tahunan...
              </div>
            ) : monthlyQuery.isError || !isMonthlyReady ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Belum ada data tren tahunan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${numberFormatter.format(value / 1_000_000)}jt`}
                  />
                  <Tooltip
                    formatter={(value: number) => `Rp ${numberFormatter.format(value)}`}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="hsl(var(--success))" strokeWidth={3} />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Pengeluaran"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
