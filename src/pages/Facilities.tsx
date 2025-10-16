import { Card } from "@/components/ui/card";
import { Wifi, Tv, Wind, Coffee, CarFront, Dumbbell, Sparkles, LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { FacilityRow } from "@/types/app";
import { useAuth } from "@/context/AuthContext";

const iconMap: Record<string, LucideIcon> = {
  wifi: Wifi,
  tv: Tv,
  ac: Wind,
  minibar: Coffee,
  parking: CarFront,
  gym: Dumbbell,
};

const Facilities = () => {
  const { isInitialised } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, description, icon")
        .order("name", { ascending: true });
      if (error) {
        throw error;
      }
      return data as FacilityRow[];
    },
    enabled: isInitialised,
  });

  const facilities = data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Fasilitas Hotel</h1>
        <p className="text-muted-foreground mt-1">Daftar fasilitas yang tersedia untuk tamu</p>
      </div>

      {(!isInitialised || isLoading) && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Mengambil data fasilitas...
        </Card>
      )}

      {isError && !isLoading && (
        <Card className="p-6 text-center text-destructive border border-destructive/40">
          Gagal memuat fasilitas. Periksa koneksi Supabase Anda.
        </Card>
      )}

      {!isLoading && !isError && facilities.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Belum ada fasilitas yang tercatat. Tambahkan data melalui Supabase.
        </Card>
      )}

      {!isLoading && !isError && facilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => {
            const Icon = facility.icon ? iconMap[facility.icon] ?? Sparkles : Sparkles;
            return (
              <Card
                key={facility.id}
                className="p-6 bg-gradient-card shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-2xl w-fit">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl text-foreground">{facility.name}</h3>
                    <p className="text-muted-foreground mt-2">{facility.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Facilities;
