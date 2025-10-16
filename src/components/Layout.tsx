import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
}

const roleBadge: Record<string, string> = {
  owner: "Owner",
  manager: "Manajer",
  staff: "Staf",
};

export function Layout({ children }: LayoutProps) {
  const { currentUser, logout, changeOwnPassword } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await changeOwnPassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success("Kata sandi berhasil diperbarui.");
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setIsPasswordDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui kata sandi.";
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal keluar. Coba lagi.";
      toast.error(message);
    }
  };

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background/60">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-24 h-80 w-80 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
          <div className="absolute top-1/3 -left-24 h-96 w-96 rounded-full bg-gradient-accent opacity-50 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/40 opacity-30 blur-[140px]" />
        </div>
        <AppSidebar />
        <main className="relative z-10 flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary/70 text-muted-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden" />
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-primary">Stayclever</p>
                  <h1 className="text-lg font-semibold text-foreground">Panel Operasional</h1>
                  <p className="text-xs text-muted-foreground">Kelola aktivitas harian hotel Anda dengan ringkas.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{currentUser?.name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleBadge[currentUser?.role ?? "staff"]} • {todayLabel}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                  Ganti Kata Sandi
                </Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleLogout}>
                  Keluar
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 px-4 pb-10 pt-6 sm:px-6 md:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
          </div>
        </main>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti Kata Sandi</DialogTitle>
            <DialogDescription>Masukkan kata sandi saat ini dan kata sandi baru Anda.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Kata Sandi Saat Ini</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Kata Sandi Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
