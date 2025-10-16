import { useState } from "react";
import { useAuth, PublicUser } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type RoleOption = "owner" | "manager" | "staff";

const roleLabels: Record<RoleOption, string> = {
  owner: "Owner",
  manager: "Manajer",
  staff: "Staf",
};

const Users = () => {
  const {
    currentUser,
    users,
    createUser,
    updateUserRole,
    removeUser,
    resetUserPassword,
  } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "staff" as RoleOption,
    password: "",
  });
  const [resetPassword, setResetPassword] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== "owner") {
    return (
      <div className="space-y-6">
        <Card className="border border-border/60 bg-white/85 p-6 shadow">
          <CardTitle className="text-xl">Akses Terbatas</CardTitle>
          <CardDescription>
            Hanya pemilik hotel yang dapat mengelola pengguna. Hubungi pemilik untuk melakukan perubahan akun.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createUser(form);
      toast.success("Pengguna baru berhasil ditambahkan.");
      setForm({ name: "", email: "", role: "staff", password: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan pengguna.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user: PublicUser, role: RoleOption) => {
    if (user.role === role) return;
    try {
      await updateUserRole(user.id, role);
      toast.success(`Role ${user.name} diperbarui menjadi ${roleLabels[role]}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui role.";
      toast.error(message);
    }
  };

  const handleRemove = async (user: PublicUser) => {
    if (!confirm(`Hapus pengguna ${user.name}?`)) return;
    try {
      await removeUser(user.id);
      toast.success("Pengguna dihapus.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus pengguna.";
      toast.error(message);
    }
  };

  const handleResetPassword = async (user: PublicUser) => {
    const newPassword = resetPassword[user.id];
    if (!newPassword) {
      toast.warning("Masukkan kata sandi baru.");
      return;
    }
    try {
      await resetUserPassword(user.id, newPassword);
      toast.success(`Kata sandi ${user.name} diperbarui.`);
      setResetPassword((prev) => ({ ...prev, [user.id]: "" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui kata sandi.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Manajemen Pengguna</h1>
        <p className="text-muted-foreground">
          Tambah akun staf, atur role, dan kelola akses sistem. Hanya owner yang dapat melakukan perubahan di halaman ini.
        </p>
      </div>

      <Card className="border border-border/60 bg-white/85 shadow">
        <CardHeader>
          <CardTitle>Tambah Pengguna Baru</CardTitle>
          <CardDescription>Isi detail di bawah untuk memberikan akses kepada anggota tim.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value: RoleOption) => setForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manajer</SelectItem>
                  <SelectItem value="staff">Staf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi Sementara</Label>
              <Input
                id="password"
                type="text"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Tambah Pengguna"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-white/85 shadow">
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>Pilih role, atur ulang kata sandi, atau hapus pengguna dari sistem.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Aktivitas Terakhir</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-border/40">
                  <TableCell>
                    <div className="font-semibold text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Sejak {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.id === currentUser.id ? (
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {roleLabels[user.role as RoleOption]}
                      </Badge>
                    ) : (
                      <Select value={user.role} onValueChange={(value: RoleOption) => handleRoleChange(user, value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manajer</SelectItem>
                          <SelectItem value="staff">Staf</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                    {user.activities?.[0]
                      ? `${user.activities[0].message} • ${new Date(user.activities[0].createdAt).toLocaleString("id-ID")}`
                      : "Belum ada aktivitas"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Kata sandi baru"
                          type="text"
                          value={resetPassword[user.id] ?? ""}
                          onChange={(event) =>
                            setResetPassword((prev) => ({ ...prev, [user.id]: event.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset
                        </Button>
                      </div>
                      {user.id !== currentUser.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(user)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
