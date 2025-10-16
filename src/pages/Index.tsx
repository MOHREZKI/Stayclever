import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@/assets/hotel-hero.jpg";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import type { DashboardMetricRow } from "@/types/app";

const Index = () => {
  const { currentUser, recordActivity, isInitialised } = useAuth();
  const [activityNote, setActivityNote] = useState("");
  const firstName = currentUser?.name.split(" ")[0] ?? "Tim";
  const activities = currentUser?.activities ?? [];

  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_metrics")
        .select("total_guests, available_rooms, revenue_today, occupancy_rate")
        .maybeSingle();
      if (error) throw error;
      return data as DashboardMetricRow | null;
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const metrics = metricsQuery.data ?? null;

  const recentGuestsQuery = useQuery({
    queryKey: ["recent-guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select(
          "id, name, check_in, check_out, total_price, booking_status, created_at, received_by, profiles!guests_received_by_fkey(name), rooms(number, room_types(name))",
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        id: string;
        name: string;
        check_in: string;
        check_out: string;
        total_price: number;
        booking_status: string;
        created_at: string;
        rooms: { number: string; room_types: { name: string } | { name: string }[] | null } | null;
        profiles: { name?: string | null } | null;
      }>;
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const recentTransactionsQuery = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, date, category")
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        id: string;
        description: string;
        amount: number;
        type: "income" | "expense";
        date: string;
        category: string;
      }>;
    },
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const teamActivitiesQuery = useQuery({
    queryKey: ["team-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activities")
        .select("id, message, created_at, user_id, profiles(name, role)")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (
        data ?? []
      ) as Array<{
        id: string;
        message: string;
        created_at: string;
        user_id: string;
        profiles: { name?: string | null; role?: string | null } | null;
      }>;
    },
    enabled: isInitialised && !!currentUser,
    staleTime: 20000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const recentGuests = recentGuestsQuery.data ?? [];
  const recentTransactions = recentTransactionsQuery.data ?? [];
  const incomeSummary = recentTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseSummary = recentTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const teamActivities = teamActivitiesQuery.data ?? [];

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const metricCards = useMemo(
    () => [
      {
        title: "Tamu Aktif",
        value:
          metricsQuery.isLoading || metricsQuery.isError
            ? "-"
            : metrics
            ? metrics.total_guests.toLocaleString("id-ID")
            : "0",
        description: "Reservasi & check-in berjalan",
      },
      {
        title: "Kamar Tersedia",
        value:
          metricsQuery.isLoading || metricsQuery.isError
            ? "-"
            : metrics
            ? metrics.available_rooms.toLocaleString("id-ID")
            : "0",
        description: "Siap dijual atau disewakan",
      },
      {
        title: "Pendapatan Hari Ini",
        value:
          metricsQuery.isLoading || metricsQuery.isError
            ? "-"
            : metrics
            ? `Rp ${metrics.revenue_today.toLocaleString("id-ID")}`
            : "Rp 0",
        description: "Akumulasi dari transaksi tamu",
      },
      {
        title: "Okupansi",
        value:
          metricsQuery.isLoading || metricsQuery.isError
            ? "-"
            : metrics
            ? `${metrics.occupancy_rate.toFixed(2)}%`
            : "0%",
        description: "Presentase kamar terisi",
      },
    ],
    [metrics, metricsQuery.isError, metricsQuery.isLoading],
  );

  const handleActivitySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !activityNote.trim()) {
      return;
    }
    try {
      await recordActivity(currentUser.id, activityNote.trim());
      setActivityNote("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-12 md:space-y-16">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/30 bg-gradient-primary text-white shadow-2xl shadow-primary/20">
        <img src={heroImage} alt="Hotel Lobby" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-primary/55 to-primary/25" />
        <div className="relative px-8 py-10 md:px-12 md:py-14">
          <div className="space-y-5 max-w-3xl">
            <Badge variant="outline" className="rounded-full border-white/30 bg-white/10 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/80">
              Stayclever
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold leading-snug md:text-5xl">
                Selamat datang, {firstName}! Kelola hotel lebih ringan dan rapi.
              </h1>
              <p className="max-w-xl text-base text-white/80 md:text-lg">
                Stayclever Hotel Pro membantu operasional hotel kecil dan menengah tanpa kerumitan. Hubungkan data tamu,
                kamar, serta transaksi Anda ketika sudah siap — dashboard akan otomatis menampilkan ringkasannya.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card
            key={card.title}
            className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur"
          >
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">{card.value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </Card>
        ))}
      </div>

      {metricsQuery.isError && (
        <Card className="rounded-[2rem] border border-destructive/40 bg-destructive/10 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-destructive">Gagal memuat ringkasan</h3>
          <p className="text-sm text-destructive">
            Periksa konfigurasi Supabase atau pastikan view <code>dashboard_metrics</code> tersedia.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
          <h3 className="text-lg font-semibold text-foreground">Langkah Selanjutnya</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Masukkan data dasar hotel (kamar, tipe harga, dan staf).</li>
            <li>Hubungkan sumber reservasi atau input manual transaksi harian.</li>
            <li>Nyalakan notifikasi agar tim kecil Anda tahu setiap perubahan.</li>
          </ul>
        </Card>
        <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
          <h3 className="text-lg font-semibold text-foreground">Status Ringkas</h3>
          <p className="text-sm text-muted-foreground">
            Data tamu, kamar, dan keuangan tersinkron otomatis dari Supabase. Pastikan Anda memiliki hak akses untuk
            melakukan perubahan sesuai peran.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Tamu Terbaru</h3>
            <span className="text-xs text-muted-foreground">5 data terakhir</span>
          </div>
          {recentGuestsQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat data tamu terbaru...</p>
          ) : recentGuests.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Belum ada tamu pada hari ini.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentGuests.map((guest) => {
                const roomName = Array.isArray(guest.rooms?.room_types)
                  ? guest.rooms?.room_types[0]?.name
                  : guest.rooms?.room_types?.name;
                return (
                  <li
                    key={guest.id}
                    className="rounded-2xl border border-muted/40 bg-muted/10 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {guest.booking_status === "checked-in" ? "Check-in" : "Reservasi"} •{" "}
                          {roomName ?? "Tanpa tipe"} • Kamar {guest.rooms?.number ?? "-"}
                        </p>
                        {guest.profiles?.name && (
                          <p className="text-xs text-muted-foreground">
                            Diterima oleh {guest.profiles.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{new Date(guest.created_at).toLocaleString("id-ID")}</p>
                        <p>{currencyFormatter.format(guest.total_price)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Transaksi Terakhir</h3>
            <span className="text-xs text-muted-foreground">5 data terakhir</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-success/10 p-3">
              <p className="text-xs text-success/80 uppercase tracking-wide">Pendapatan Terakhir</p>
              <p className="text-lg font-semibold text-success">
                {currencyFormatter.format(incomeSummary)}
              </p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="text-xs text-destructive/80 uppercase tracking-wide">Pengeluaran Terakhir</p>
              <p className="text-lg font-semibold text-destructive">
                {currencyFormatter.format(expenseSummary)}
              </p>
            </div>
          </div>
          {recentTransactionsQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat transaksi...</p>
          ) : recentTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Belum ada transaksi yang dicatat.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="rounded-2xl border border-muted/40 bg-muted/10 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.category} • {new Date(transaction.date).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        transaction.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {currencyFormatter.format(transaction.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
        <h3 className="text-lg font-semibold text-foreground">Catatan Aktivitas Pengguna</h3>
        <p className="text-sm text-muted-foreground">
          Simpan aktivitas penting yang Anda tangani. Catatan ini membantu pemilik memantau tindakan terakhir setiap pengguna.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleActivitySubmit}>
          <Textarea
            placeholder="Contoh: Menerima tamu keluarga Siregar di kamar 203."
            value={activityNote}
            onChange={(event) => setActivityNote(event.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!activityNote.trim() || !currentUser}>
              Simpan Aktivitas
            </Button>
          </div>
        </form>
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Aktivitas Terakhir</h4>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
          ) : (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {activities.slice(0, 5).map((activity) => (
                <li
                  key={activity.id}
                  className="rounded-2xl border border-muted/50 bg-muted/20 p-3 text-foreground"
                >
                  <p className="font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString("id-ID")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-border/60 bg-white/85 p-6 shadow-lg shadow-black/10 backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Aktivitas Tim Terbaru</h3>
          <span className="text-xs text-muted-foreground">
            {teamActivitiesQuery.isLoading ? "Memuat..." : `${teamActivities.length} aktivitas`}
          </span>
        </div>
        {teamActivitiesQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Memuat aktivitas tim...</p>
        ) : teamActivities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {teamActivities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-2xl border border-muted/40 bg-muted/10 px-4 py-3 text-foreground"
              >
                <p className="font-medium">
                  {activity.profiles?.name ?? "Pengguna"}{" "}
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    ({activity.profiles?.role ?? "tidak diketahui"})
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString("id-ID")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Index;
