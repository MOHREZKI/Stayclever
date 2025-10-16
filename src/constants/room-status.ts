import type { RoomRow } from "@/types/app";

export type RoomStatus = RoomRow["status"];

export interface RoomStatusToken {
  label: string;
  description: string;
  badgeClass: string;
  surfaceClass: string;
  legendSurfaceClass: string;
  dotClass: string;
  statTextClass: string;
  statIconWrapperClass: string;
}

export const ROOM_STATUS_TOKENS: Record<RoomStatus, RoomStatusToken> = {
  available: {
    label: "Tersedia",
    description: "Kamar siap digunakan dan belum memiliki reservasi aktif pada tanggal terpilih.",
    badgeClass: "border border-success/20 bg-success text-success-foreground",
    surfaceClass: "border-2 border-success/40 bg-success/5",
    legendSurfaceClass: "border border-success/30 bg-success/10",
    dotClass: "bg-success",
    statTextClass: "text-success",
    statIconWrapperClass: "bg-success/15 text-success",
  },
  occupied: {
    label: "Terisi",
    description: "Tamu sedang menginap di kamar ini pada tanggal yang dipilih.",
    badgeClass: "border border-destructive/20 bg-destructive text-destructive-foreground",
    surfaceClass: "border-2 border-destructive/40 bg-destructive/5",
    legendSurfaceClass: "border border-destructive/30 bg-destructive/10",
    dotClass: "bg-destructive",
    statTextClass: "text-destructive",
    statIconWrapperClass: "bg-destructive/15 text-destructive",
  },
  cleaning: {
    label: "Pembersihan",
    description: "Staf sedang membersihkan kamar untuk tamu berikutnya.",
    badgeClass: "border border-warning/20 bg-warning text-warning-foreground",
    surfaceClass: "border-2 border-warning/40 bg-warning/5",
    legendSurfaceClass: "border border-warning/30 bg-warning/10",
    dotClass: "bg-warning",
    statTextClass: "text-warning",
    statIconWrapperClass: "bg-warning/15 text-warning",
  },
  reserved: {
    label: "Reservasi",
    description: "Sudah ada tamu yang memesan kamar ini pada tanggal terpilih.",
    badgeClass: "border border-primary/20 bg-primary text-primary-foreground",
    surfaceClass: "border-2 border-primary/40 bg-primary/5",
    legendSurfaceClass: "border border-primary/30 bg-primary/10",
    dotClass: "bg-primary",
    statTextClass: "text-primary",
    statIconWrapperClass: "bg-primary/15 text-primary",
  },
};

export const ROOM_STATUS_ORDER: RoomStatus[] = ["available", "reserved", "occupied", "cleaning"];

export const getRoomStatusToken = (status: RoomStatus) => ROOM_STATUS_TOKENS[status];
