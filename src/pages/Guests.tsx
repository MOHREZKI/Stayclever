import { useEffect, useMemo, useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseQuery, useSupabaseMutation } from "@/hooks/useSupabaseQuery";
import type { GuestRow } from "@/types/app";
import { useAuth } from "@/context/AuthContext";

const ROOMS_QUERY_KEY = ["rooms", "booking"];
const GUESTS_QUERY_KEY = ["guests"];
const TRANSACTIONS_QUERY_KEY = ["transactions"];

type RoomStatus = "available" | "occupied" | "cleaning" | "reserved";
type BookingStatus = "reservation" | "checked-in" | "checked-out";
type PaymentStatus = "paid" | "unpaid";

interface RoomOption {
  id: string;
  number: string;
  price: number;
  status: RoomStatus;
  typeId: string;
  typeName: string;
}

interface RoomTypeOption {
  id: string;
  name: string;
  price: number;
}

interface GuestItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  roomId: string;
  roomNumber: string;
  roomType: string;
  receivedByName?: string;
}

const mapRoomTypeName = (value: unknown): string => {
  if (!value) return "-";
  if (Array.isArray(value)) {
    return value[0]?.name ?? "-";
  }
  if (typeof value === "object" && "name" in value) {
    return (value as { name?: string }).name ?? "-";
  }
  return "-";
};

const Guests = () => {
  const queryClient = useQueryClient();
  const { currentUser, recordActivity, isInitialised } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  // Menggunakan custom hook untuk rooms - lebih efisien
  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useSupabaseQuery(
    "rooms",
    "id, number, price, status, type_id, room_types(name)",
    { status: "available" }, // Hanya ambil kamar yang available
    {
      staleTime: 30000,
      enabled: isInitialised,
    }
  );

  const rooms: RoomOption[] = useMemo(
    () =>
      (roomsData ?? []).map((room) => ({
        id: room.id,
        number: room.number,
        price: room.price,
        status: room.status,
        typeId: room.type_id ?? "",
        typeName: mapRoomTypeName(room.room_types),
      })),
    [roomsData],
  );

  // Menggunakan custom hook untuk guests - lebih efisien
  const { data: guestsData, isLoading: guestsLoading, error: guestsError } = useSupabaseQuery(
    "guests",
    "id, name, phone, email, check_in, check_out, nights, price_per_night, total_price, payment_method, payment_status, booking_status, room_id, received_by, profiles!guests_received_by_fkey(name), rooms(id, number, status, price, room_types(name))",
    undefined,
    {
      staleTime: 20000,
      enabled: isInitialised,
    }
  );

  const guests: GuestItem[] = useMemo(
    () =>
      (guestsData ?? []).map((guest) => ({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        email: guest.email ?? "-",
        checkIn: guest.check_in,
        checkOut: guest.check_out,
        nights: guest.nights,
        pricePerNight: guest.price_per_night,
        totalPrice: guest.total_price,
        paymentMethod: guest.payment_method,
        paymentStatus: guest.payment_status,
        bookingStatus: guest.booking_status,
        roomId: guest.room_id,
        roomNumber: guest.rooms?.number ?? "-",
        roomType: guest.rooms ? mapRoomTypeName(guest.rooms.room_types) : "-",
        receivedByName: guest.profiles?.name ?? undefined,
      })),
    [guestsData],
  );

  const roomTypeOptions = useMemo<RoomTypeOption[]>(() => {
    const byType = new Map<string, RoomTypeOption>();
    rooms
      .filter((room) => room.status === "available")
      .forEach((room) => {
        if (!room.typeId) {
          return;
        }
        const existing = byType.get(room.typeId);
        if (!existing || room.price < existing.price) {
          byType.set(room.typeId, {
            id: room.typeId,
            name: room.typeName,
            price: room.price,
          });
        }
      });
    return Array.from(byType.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find((room) => room.id === selectedRoomId) ?? null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    setSelectedRoomId("");
  }, [selectedRoomTypeId]);

  const availableRoomsForSelectedType = useMemo(
    () =>
      rooms.filter(
        (room) => room.status === "available" && room.typeId === selectedRoomTypeId,
      ),
    [rooms, selectedRoomTypeId],
  );

  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
    return Number.isFinite(diff) && diff > 0 ? Math.ceil(diff) : 0;
  }, [checkInDate, checkOutDate]);

  const calculatedPrice = useMemo(() => {
    if (!selectedRoom || nights === 0) return 0;
    return selectedRoom.price * nights;
  }, [nights, selectedRoom]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(term) ||
        guest.roomNumber.toLowerCase().includes(term) ||
        guest.email.toLowerCase().includes(term) ||
        guest.phone.toLowerCase().includes(term),
    );
  }, [guests, searchTerm]);

  // Menggunakan custom mutation hook
  const addGuestMutation = useSupabaseMutation(
    async (payload: {
      name: string;
      phone: string;
      email: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      bookingStatus: BookingStatus;
      paymentMethod: string;
      paymentStatus: PaymentStatus;
      roomId: string;
      roomNumber: string;
      roomTypeName: string;
      pricePerNight: number;
      totalPrice: number;
      receivedBy: string | null;
    }) => {
      const { error } = await supabase.from("guests").insert({
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        nights: payload.nights,
        price_per_night: payload.pricePerNight,
        total_price: payload.totalPrice,
        payment_method: payload.paymentMethod,
        payment_status: payload.paymentStatus,
        booking_status: payload.bookingStatus,
        room_id: payload.roomId,
        received_by: payload.receivedBy,
      });
      if (error) throw error;

      const roomUpdates: Partial<{
        status: RoomStatus;
        reservation_date: string;
        check_out_date: string;
      }> = {
        reservation_date: payload.checkIn,
        check_out_date: payload.checkOut,
      };

      if (payload.bookingStatus === "checked-in") {
        roomUpdates.status = "occupied";
      } else if (payload.bookingStatus === "reservation") {
        roomUpdates.status = "reserved";
      }

      const { error: roomError } = await supabase.from("rooms").update(roomUpdates).eq("id", payload.roomId);
      if (roomError) {
        throw roomError;
      }

      const shouldCreateTransaction = payload.bookingStatus === "checked-in" && payload.totalPrice > 0;
      if (shouldCreateTransaction) {
        const { error: txError } = await supabase.from("transactions").insert({
          type: "income",
          amount: Number(payload.totalPrice),
          category: "Kamar",
          description: `Pembayaran kamar ${payload.roomTypeName} • Kamar ${payload.roomNumber}`,
          date: payload.checkIn,
        });
        if (txError) {
          throw txError;
        }
      }
    },
    {
      onSuccess: async () => {
        // Invalidate semua queries yang relevan
        [
          GUESTS_QUERY_KEY,
          ROOMS_QUERY_KEY,
          ["rooms"],
          ["dashboard-metrics"],
          ["recent-guests"],
          ["team-activities"],
          ["reports", "room-type-occupancy"],
          ["recent-transactions"],
          ["reports", "weekly-trend"],
          ["reports", "monthly-summary"],
          TRANSACTIONS_QUERY_KEY,
        ].forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: true });
        });
      },
      invalidateQueries: ["guests", "rooms", "transactions"],
    }
  );

  const checkoutMutation = useSupabaseMutation(
    async (payload: { guestId: string; roomId: string | null }) => {
      const { error } = await supabase
        .from("guests")
        .update({ booking_status: "checked-out" satisfies BookingStatus })
        .eq("id", payload.guestId);
      if (error) throw error;

      if (!payload.roomId) return;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" as RoomStatus })
        .eq("id", payload.roomId);
      if (roomError) throw error;

      setTimeout(async () => {
        const { error: resetError } = await supabase
          .from("rooms")
          .update({ status: "available" as RoomStatus, reservation_date: null, check_out_date: null })
          .eq("id", payload.roomId);
        if (!resetError) {
          await queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
          await queryClient.invalidateQueries({ queryKey: ["rooms"] });
        }
      }, 3000);
    },
    {
      invalidateQueries: ["guests", "rooms"],
    }
  );

  const handleAddGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRoomTypeId) {
      toast.error("Pilih tipe kamar terlebih dahulu.");
      return;
    }

    if (!selectedRoom) {
      toast.error("Pilih nomor kamar yang tersedia.");
      return;
    }

    if (nights <= 0) {
      toast.error("Tanggal check out harus setelah check in.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: (formData.get("name") as string)?.trim(),
      phone: (formData.get("phone") as string)?.trim(),
      email: ((formData.get("email") as string) ?? "").trim(),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      bookingStatus: formData.get("bookingStatus") as BookingStatus,
      paymentMethod: (formData.get("paymentMethod") as string) ?? "",
      paymentStatus: formData.get("paymentStatus") as PaymentStatus,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      roomTypeName: selectedRoom.typeName,
      pricePerNight: selectedRoom.price,
      totalPrice: calculatedPrice,
      receivedBy: currentUser?.id ?? null,
    };

    try {
      await addGuestMutation.mutateAsync(payload);
      if (currentUser) {
        try {
          const roomLabel = `Kamar ${selectedRoom.number} • ${selectedRoom.typeName}`;
          await recordActivity(
            currentUser.id,
            `Menerima tamu ${payload.name} (${payload.bookingStatus === "checked-in" ? "check-in" : "reservasi"}) di ${roomLabel}.`,
          );
        } catch (activityError) {
          console.error("Gagal mencatat aktivitas tamu", activityError);
        }
      }
      toast.success("Tamu berhasil ditambahkan!");
      setIsDialogOpen(false);
      setSelectedRoomTypeId("");
      setSelectedRoomId("");
      setCheckInDate("");
      setCheckOutDate("");
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan tamu.";
      toast.error(message);
    }
  };

  const handleCheckout = async (guestId: string) => {
    const guest = guests.find((item) => item.id === guestId);
    if (!guest) {
      toast.error("Data tamu tidak ditemukan.");
      return;
    }
    if (guest.bookingStatus !== "checked-in") {
      toast.warning("Tamu ini belum berstatus check-in.");
      return;
    }

    try {
      await checkoutMutation.mutateAsync({ guestId: guest.id, roomId: guest.roomId });
      toast.success(`Check-out berhasil. Kamar ${guest.roomNumber} sedang dibersihkan.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal melakukan check-out.";
      toast.error(message);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    if (status === "reservation") {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Reservasi</Badge>;
    }

    if (status === "checked-out") {
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20">Check Out</Badge>;
    }

    return <Badge className="bg-success text-success-foreground">Check In</Badge>;
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    return status === "paid"
      ? <Badge className="bg-success text-success-foreground">Lunas</Badge>
      : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Belum Lunas</Badge>;
  };

  const isLoading = !isInitialised || roomsLoading || guestsLoading;
  const isError = isInitialised && (roomsError || guestsError);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Tamu</h1>
          <p className="text-muted-foreground mt-1">Kelola data tamu hotel</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-3xl bg-gradient-to-r from-primary to-primary/80 text-white font-semibold px-6 py-3"
              disabled={isLoading}
            >
              Tambah Tamu
            </Button>
          </DialogTrigger>

          <DialogContent
            className="w-[95vw] max-w-3xl h-[90vh] overflow-hidden rounded-2xl p-0 shadow-xl"
            style={{ top: "5vh", transform: "translate(-50%, 0)" }}
          >
            <div className="flex h-full min-h-[60vh] flex-col">
              <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-4">
                <DialogTitle className="text-xl font-semibold text-foreground">Tambah Tamu Baru</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Isi data tamu, detail reservasi, dan status pembayaran dalam satu tampilan teratur.
                </DialogDescription>
              </DialogHeader>

              <form
                id="guest-form"
                onSubmit={handleAddGuest}
                className="flex-1 overflow-y-auto px-6 py-6 pb-40 space-y-6 sm:pb-10"
              >
                <section className="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm space-y-4">
                  <header>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Data Tamu</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">Informasi Kontak</h3>
                  </header>
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input id="name" name="name" required placeholder="Masukkan nama lengkap tamu" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Nomor Telepon</Label>
                      <Input id="phone" name="phone" required placeholder="08xxxxxxxxxx" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required placeholder="email@contoh.com" />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm space-y-4">
                  <header>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Detail Booking</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">Reservasi & Kamar</h3>
                  </header>
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <div>
                      <Label>Status Booking</Label>
                      <Select name="bookingStatus" defaultValue="reservation" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reservation">Reservasi</SelectItem>
                          <SelectItem value="checked-in">Check In Sekarang</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Pilih Tipe Kamar</Label>
                      <Select value={selectedRoomTypeId} onValueChange={setSelectedRoomTypeId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe kamar" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {roomTypeOptions.length === 0 ? (
                            <SelectItem value="-" disabled>
                              Tidak ada tipe kamar tersedia
                            </SelectItem>
                          ) : (
                            roomTypeOptions.map((typeOption) => (
                              <SelectItem key={typeOption.id} value={typeOption.id}>
                                {typeOption.name} • Rp {typeOption.price.toLocaleString("id-ID")}/malam
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Pilih Nomor Kamar</Label>
                      <Select
                        value={selectedRoomId}
                        onValueChange={setSelectedRoomId}
                        disabled={!selectedRoomTypeId || availableRoomsForSelectedType.length === 0}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              selectedRoomTypeId ? "Pilih kamar tersedia" : "Pilih tipe kamar terlebih dahulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {availableRoomsForSelectedType.length === 0 ? (
                            <SelectItem value="-" disabled>
                              {selectedRoomTypeId
                                ? "Tidak ada kamar tersedia untuk tipe ini"
                                : "Pilih tipe kamar terlebih dahulu"}
                            </SelectItem>
                          ) : (
                            availableRoomsForSelectedType.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                Kamar {room.number} • Rp {room.price.toLocaleString("id-ID")}/malam
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                      <div>
                        <Label htmlFor="checkIn">Check In</Label>
                        <Input
                          id="checkIn"
                          name="checkIn"
                          type="date"
                          value={checkInDate}
                          onChange={(event) => setCheckInDate(event.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkOut">Check Out</Label>
                        <Input
                          id="checkOut"
                          name="checkOut"
                          type="date"
                          value={checkOutDate}
                          onChange={(event) => setCheckOutDate(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm space-y-4">
                  <header>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Pembayaran</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">Metode & Status</h3>
                  </header>
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <div>
                      <Label>Metode Pembayaran</Label>
                      <Select name="paymentMethod" defaultValue="Bank Mandiri" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih metode" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          <SelectItem value="Kredit">Kredit</SelectItem>
                          <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                          <SelectItem value="BNI">BNI</SelectItem>
                          <SelectItem value="BCA">BCA</SelectItem>
                          <SelectItem value="BRI">BRI</SelectItem>
                          <SelectItem value="QRIS">QRIS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status Pembayaran</Label>
                      <Select name="paymentStatus" defaultValue="unpaid" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Lunas</SelectItem>
                          <SelectItem value="unpaid">Belum Lunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {selectedRoom && nights > 0 && calculatedPrice > 0 && (
                  <Card className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-primary">Ringkasan Tarif</p>
                        <p>
                          {selectedRoom.typeName} • Kamar {selectedRoom.number}
                        </p>
                        <p>Rp {selectedRoom.price.toLocaleString("id-ID")}/malam</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Durasi {nights} malam</p>
                        <p className="text-2xl font-bold text-primary">
                          Rp {calculatedPrice.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </form>

              <div className="sticky bottom-0 shrink-0 border-t border-border/60 bg-card/90 px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:pt-5">
                <Button
                  type="submit"
                  form="guest-form"
                  className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 py-4 text-base font-semibold text-white shadow-lg sm:py-5 sm:text-lg"
                  disabled={addGuestMutation.isPending}
                >
                  {addGuestMutation.isPending ? "Menyimpan..." : "Simpan Data Tamu"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari tamu atau nomor kamar..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Mengambil data tamu dan kamar...
        </Card>
      )}

      {isError && !isLoading && (
        <Card className="p-6 text-center text-destructive border border-destructive/40">
          Gagal memuat data tamu. Periksa koneksi Supabase Anda atau izin akses pengguna saat ini.
        </Card>
      )}

      {!isLoading && !isError && filteredGuests.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Belum ada tamu. Tambahkan tamu baru setelah kamar tersedia.
        </Card>
      )}

      <div className="grid gap-4">
        {!isLoading &&
          !isError &&
          filteredGuests.map((guest) => (
            <Card key={guest.id} className="p-6 bg-gradient-card shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{guest.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {guest.roomType} • Kamar {guest.roomNumber}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {getStatusBadge(guest.bookingStatus)}
                      {getPaymentBadge(guest.paymentStatus)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Kontak</p>
                      <p className="font-medium">📞 {guest.phone}</p>
                      <p className="font-medium">📧 {guest.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tanggal</p>
                      <p className="font-medium">
                        📅 In: {new Date(guest.checkIn).toLocaleDateString("id-ID")}
                      </p>
                      <p className="font-medium">
                        📅 Out: {new Date(guest.checkOut).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pembayaran</p>
                      <p className="font-medium">{guest.paymentMethod}</p>
                      <p className="font-medium">{guest.nights} malam</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Biaya</p>
                        <p className="text-xl font-bold text-primary">
                          Rp {guest.totalPrice.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rp {guest.pricePerNight.toLocaleString("id-ID")}/malam × {guest.nights} malam
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={guest.bookingStatus !== "checked-in" || checkoutMutation.isPending}
                        onClick={() => handleCheckout(guest.id)}
                        className="w-full md:w-auto"
                      >
                        {checkoutMutation.isPending ? "Memproses..." : "Checkout Tamu"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};

export default Guests;
