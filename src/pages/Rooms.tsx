import { useMemo, useState } from "react";
import { Plus, Bed, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import type { GuestRow } from "@/types/app";

interface RoomTypeOption {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  typeId: string;
  typeName: string;
  price: number;
  status: "available" | "occupied" | "cleaning" | "reserved";
  reservationDate?: string;
  checkOutDate?: string;
}

type ReservationRow = Pick<GuestRow, "id" | "name" | "room_id" | "booking_status" | "payment_status" | "check_in" | "check_out">;

interface ReservationSummary {
  guestName: string;
  bookingStatus: ReservationRow["booking_status"];
  paymentStatus: ReservationRow["payment_status"];
  checkIn: string;
  checkOut: string;
}

const Rooms = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { isInitialised } = useAuth();

  const { data: roomTypesData, isLoading: isRoomTypesLoading } = useQuery({
    queryKey: ["room-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RoomTypeOption[];
    },
    enabled: isInitialised,
  });

const { data: roomsData, isLoading: isRoomsLoading, isError: isRoomsError } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, number, price, status, reservation_date, check_out_date, type_id, room_types(name)")
        .order("number", { ascending: true });
      if (error) throw error;
      type RoomRow = {
        id: string;
        number: string;
        price: number;
        status: Room["status"];
        reservation_date: string | null;
        check_out_date: string | null;
        type_id: string;
        room_types: { name: string } | { name: string }[] | null;
      };
      return (data ?? []) as RoomRow[];
    },
    enabled: isInitialised,
  });

  const { data: reservationsData, isLoading: isReservationsLoading } = useQuery({
    queryKey: ["room-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, name, room_id, booking_status, payment_status, check_in, check_out");
      if (error) throw error;
      return (data ?? []) as ReservationRow[];
    },
    enabled: isInitialised,
  });

  const rooms = useMemo<Room[]>(
    () =>
      (roomsData ?? []).map((room) => {
        const typeName = Array.isArray(room.room_types)
          ? room.room_types[0]?.name
          : room.room_types?.name;
        return {
          id: room.id,
          number: room.number,
          price: room.price,
          status: room.status,
          reservationDate: room.reservation_date ?? undefined,
          checkOutDate: room.check_out_date ?? undefined,
          typeId: room.type_id,
          typeName: typeName ?? "-",
        } as Room;
      }),
    [roomsData],
  );

  const addRoomMutation = useMutation({
    mutationFn: async (payload: { number: string; typeId: string; price: number }) => {
      const { error } = await supabase.from("rooms").insert({
        number: payload.number,
        type_id: payload.typeId,
        price: payload.price,
        status: "available",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (payload: { id: string; number: string; typeId: string; price: number }) => {
      const { error } = await supabase
        .from("rooms")
        .update({ number: payload.number, type_id: payload.typeId, price: payload.price })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: Room["status"] }) => {
      const { error } = await supabase.from("rooms").update({ status: payload.status }).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const addRoomTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("room_types").insert({ name });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["room-types"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
      ]);
    },
  });

  const handleAddRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const number = (formData.get("number") as string)?.trim();
    const typeId = formData.get("type") as string;
    const price = Number(formData.get("price"));

    if (!number || !typeId) {
      toast.error("Nomor kamar dan tipe harus diisi.");
      return;
    }

    try {
      if (isEditMode && editingRoom) {
        await updateRoomMutation.mutateAsync({ id: editingRoom.id, number, typeId, price });
        toast.success("Kamar berhasil diperbarui!");
      } else {
        await addRoomMutation.mutateAsync({ number, typeId, price });
        toast.success("Kamar berhasil ditambahkan!");
      }
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingRoom(null);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan kamar.";
      toast.error(message);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Hapus kamar ini?")) return;
    try {
      await deleteRoomMutation.mutateAsync(roomId);
      toast.success("Kamar berhasil dihapus!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus kamar.";
      toast.error(message);
    }
  };

  const handleAddRoomType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = (formData.get("typeName") as string)?.trim();
    if (!name) {
      toast.error("Nama tipe kamar harus diisi.");
      return;
    }

    if (roomTypesData?.some((type) => type.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Tipe kamar sudah ada.");
      return;
    }

    try {
      await addRoomTypeMutation.mutateAsync(name);
      toast.success("Tipe kamar berhasil ditambahkan!");
      setIsTypeDialogOpen(false);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan tipe kamar.";
      toast.error(message);
    }
  };

  const updateRoomStatus = async (roomId: string, newStatus: Room["status"]) => {
    try {
      await updateStatusMutation.mutateAsync({ id: roomId, status: newStatus });
      toast.success("Status kamar berhasil diperbarui!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui status kamar.";
      toast.error(message);
    }
  };

  const getStatusBadge = (status: Room["status"]) => {
    const variants = {
      available: { label: "Tersedia", className: "bg-success text-success-foreground" },
      occupied: { label: "Terisi", className: "bg-destructive text-destructive-foreground" },
      cleaning: { label: "Pembersihan", className: "bg-warning text-warning-foreground" },
      reserved: { label: "Reservasi", className: "bg-primary text-primary-foreground" },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getStatusColor = (status: Room["status"]) => {
    const colors = {
      available: "border-success/30 bg-success/5",
      occupied: "border-destructive/30 bg-destructive/5",
      cleaning: "border-warning/30 bg-warning/5",
      reserved: "border-primary/30 bg-primary/5",
    };
    return colors[status];
  };

  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
  };

  const roomInfoMap = useMemo(() => {
    const map = new Map<string, { number: string; typeName: string }>();
    rooms.forEach((room) => map.set(room.id, { number: room.number, typeName: room.typeName }));
    return map;
  }, [rooms]);

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, ReservationSummary[]>();
    if (!reservationsData || !selectedDate) {
      return map;
    }

    const target = new Date(selectedDate);
    target.setHours(0, 0, 0, 0);

    reservationsData.forEach((reservation) => {
      if (!reservation.room_id || !reservation.check_in || !reservation.check_out) {
        return;
      }
      const checkIn = new Date(reservation.check_in);
      checkIn.setHours(0, 0, 0, 0);
      const checkOut = new Date(reservation.check_out);
      checkOut.setHours(0, 0, 0, 0);

      if (target >= checkIn && target <= checkOut) {
        const summary: ReservationSummary = {
          guestName: reservation.name,
          bookingStatus: reservation.booking_status,
          paymentStatus: reservation.payment_status,
          checkIn: reservation.check_in,
          checkOut: reservation.check_out,
        };
        const existing = map.get(reservation.room_id) ?? [];
        existing.push(summary);
        map.set(reservation.room_id, existing);
      }
    });

    return map;
  }, [reservationsData, selectedDate]);

  const reservationsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [] as Array<{ roomId: string; roomNumber: string; roomType: string; details: ReservationSummary }>;
    const list: Array<{ roomId: string; roomNumber: string; roomType: string; details: ReservationSummary }> = [];
    reservationsByRoom.forEach((value, key) => {
      const roomInfo = roomInfoMap.get(key);
      if (!roomInfo) return;
      value.forEach((item) => {
        list.push({ roomId: key, roomNumber: roomInfo.number, roomType: roomInfo.typeName, details: item });
      });
    });
    return list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, "id"));
  }, [reservationsByRoom, roomInfoMap, selectedDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Kamar</h1>
          <p className="text-muted-foreground mt-1">Kelola kamar hotel dan ketersediaan</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Tipe Kamar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Tipe Kamar</DialogTitle>
                <DialogDescription>Buat tipe kamar baru</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRoomType} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="typeName">Nama Tipe Kamar</Label>
                  <Input id="typeName" name="typeName" required placeholder="Contoh: Executive, Presidential" />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  Simpan Tipe
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setIsEditMode(false);
              setEditingRoom(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-primary shadow-md hover:shadow-lg">
                <Plus className="h-4 w-4" />
                Tambah Kamar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Kamar" : "Tambah Kamar Baru"}</DialogTitle>
                <DialogDescription>
                  {isEditMode ? "Update detail kamar" : "Masukkan detail kamar hotel"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Nomor Kamar</Label>
                  <Input 
                    id="number" 
                    name="number" 
                    required 
                    placeholder="101"
                    defaultValue={editingRoom?.number}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipe Kamar</Label>
                  <Select name="type" required defaultValue={editingRoom?.typeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe kamar" />
                    </SelectTrigger>
                    <SelectContent>
                    {isRoomTypesLoading ? (
                      <SelectItem value="-" disabled>
                        Memuat tipe kamar...
                      </SelectItem>
                    ) : (roomTypesData?.length ?? 0) === 0 ? (
                      <SelectItem value="-" disabled>
                        Tambahkan tipe kamar terlebih dahulu
                      </SelectItem>
                    ) : (
                      roomTypesData?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Harga per Malam (Rp)</Label>
                  <Input 
                    id="price" 
                    name="price" 
                    type="number" 
                    required 
                    placeholder="500000"
                    defaultValue={editingRoom?.price}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  {isEditMode ? "Update Kamar" : "Simpan Kamar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-card shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Kamar</p>
              <h3 className="text-2xl font-bold text-foreground">{stats.total}</h3>
            </div>
            <Bed className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6 bg-gradient-card shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tersedia</p>
              <h3 className="text-2xl font-bold text-success">{stats.available}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-success font-bold">✓</span>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-gradient-card shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Terisi</p>
              <h3 className="text-2xl font-bold text-destructive">{stats.occupied}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <span className="text-destructive font-bold">×</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-card shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-1/2">
            <Label className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Filter Tanggal</Label>
            <div className="mt-3 rounded-3xl border border-border/50 bg-muted/10 p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => setSelectedDate(date ?? selectedDate)}
                className="mx-auto"
              />
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Ringkasan Hari Ini</p>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedDate ? selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Pilih tanggal"}
                </h3>
              </div>
              {selectedDate && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {reservationsForSelectedDate.length} kamar tercatat
                </Badge>
              )}
            </div>

            {isReservationsLoading ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/5 p-5 text-sm text-muted-foreground">
                Memuat data reservasi...
              </div>
            ) : reservationsForSelectedDate.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/5 p-5 text-sm text-muted-foreground">
                Belum ada kamar yang memiliki reservasi atau pembayaran pada tanggal ini.
              </div>
            ) : (
              <ul className="space-y-3">
                {reservationsForSelectedDate.map((entry) => (
                  <li
                    key={`${entry.roomId}-${entry.details.guestName}-${entry.details.checkIn}`}
                    className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Kamar {entry.roomNumber} • {entry.roomType}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.details.guestName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.details.checkIn).toLocaleDateString("id-ID")}
                          {" "}–{" "}
                          {new Date(entry.details.checkOut).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={
                            entry.details.bookingStatus === "checked-in"
                              ? "bg-success text-success-foreground"
                              : "bg-primary text-primary-foreground"
                          }
                        >
                          {entry.details.bookingStatus === "checked-in" ? "Check-in" : "Reservasi"}
                        </Badge>
                        <Badge
                          className={
                            entry.details.paymentStatus === "paid"
                              ? "bg-success text-success-foreground"
                              : "bg-warning text-warning-foreground"
                          }
                        >
                          {entry.details.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {isRoomsLoading && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Memuat data kamar...
        </Card>
      )}

      {isRoomsError && !isRoomsLoading && (
        <Card className="p-6 text-center text-destructive border border-destructive/40">
          Gagal memuat data kamar. Pastikan Supabase tersedia.
        </Card>
      )}

      {!isRoomsLoading && !isRoomsError && rooms.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Belum ada kamar. Tambahkan kamar baru untuk memulai.
        </Card>
      )}

      {!isRoomsLoading && !isRoomsError && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className={`p-6 shadow-sm hover:shadow-md transition-all border-2 ${getStatusColor(room.status)}`}>
              <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Kamar {room.number}</h3>
                  <p className="text-sm text-muted-foreground">{room.typeName}</p>
                </div>
                {getStatusBadge(room.status)}
              </div>
              
              {room.reservationDate && room.status === "reserved" && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground">Tanggal Reservasi</p>
                  <p className="text-sm font-semibold text-primary">
                    {new Date(room.reservationDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
              )}
              
              {room.checkOutDate && room.status === "occupied" && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-muted-foreground">Check Out</p>
                  <p className="text-sm font-semibold text-destructive">
                    {new Date(room.checkOutDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <p className="text-2xl font-bold text-primary">
                  Rp {room.price.toLocaleString('id-ID')}
                  <span className="text-sm text-muted-foreground font-normal">/malam</span>
                </p>
              </div>

              {selectedDate && !isReservationsLoading && (
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    Status {selectedDate.toLocaleDateString("id-ID")}
                  </p>
                  {(() => {
                    const todaysReservations = reservationsByRoom.get(room.id) ?? [];
                    if (todaysReservations.length === 0) {
                      return <p className="text-sm text-muted-foreground">Tidak ada reservasi pada tanggal ini.</p>;
                    }
                    return todaysReservations.map((reserve) => (
                      <div key={`${reserve.guestName}-${reserve.checkIn}`} className="flex items-center justify-between text-sm">
                        <div className="text-foreground">
                          <p className="font-medium">{reserve.guestName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reserve.checkIn).toLocaleDateString("id-ID")}
                            {" "}–{" "}
                            {new Date(reserve.checkOut).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={
                              reserve.bookingStatus === "checked-in"
                                ? "bg-success text-success-foreground"
                                : "bg-primary text-primary-foreground"
                            }
                          >
                            {reserve.bookingStatus === "checked-in" ? "Check-in" : "Reservasi"}
                          </Badge>
                          <Badge
                            className={
                              reserve.paymentStatus === "paid"
                                ? "bg-success text-success-foreground"
                                : "bg-warning text-warning-foreground"
                            }
                          >
                            {reserve.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                          </Badge>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Update Status</Label>
                <Select 
                  value={room.status} 
                  onValueChange={(value) => updateRoomStatus(room.id, value as Room["status"])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tersedia</SelectItem>
                    <SelectItem value="occupied">Terisi</SelectItem>
                    <SelectItem value="reserved">Reservasi</SelectItem>
                    <SelectItem value="cleaning">Pembersihan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 gap-1"
                  onClick={() => handleEditRoom(room)}
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 gap-1 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </Button>
              </div>
            </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rooms;
