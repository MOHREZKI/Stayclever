import { useMemo, useState } from "react";
import { Plus, Coffee } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import type { MenuItemRow } from "@/types/app";

type MenuCategory = "breakfast" | "menu";

const MENU_QUERY_KEY = ["menu-items"];

const Restaurant = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("breakfast");

  const menuQuery = useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, category, price, description")
        .order("category", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MenuItemRow[];
    },
  });

  const menuItems = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);

  const breakfastItems = useMemo(
    () => menuItems.filter((item) => item.category === "breakfast"),
    [menuItems],
  );

  const mainMenuItems = useMemo(
    () => menuItems.filter((item) => item.category === "menu"),
    [menuItems],
  );

  const addMenuItemMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; price: number; category: MenuCategory }) => {
      const { error } = await supabase.from("menu_items").insert({
        name: payload.name,
        description: payload.description,
        price: payload.price,
        category: payload.category,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    },
  });

  const handleAddItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: (formData.get("name") as string)?.trim(),
      description: ((formData.get("description") as string) ?? "").trim() || undefined,
      price: Number(formData.get("price")),
      category: activeCategory,
    };

    if (!payload.name) {
      toast.error("Nama menu harus diisi.");
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      toast.error("Harga menu tidak valid.");
      return;
    }

    try {
      await addMenuItemMutation.mutateAsync(payload);
      toast.success("Menu berhasil ditambahkan!");
      setIsDialogOpen(false);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan menu.";
      toast.error(message);
    }
  };

  const isLoading = menuQuery.isFetching || addMenuItemMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Restoran & Sarapan</h1>
          <p className="text-muted-foreground mt-1">Kelola menu makanan dan minuman</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-primary shadow-md hover:shadow-lg" disabled={menuQuery.isLoading}>
              <Plus className="h-4 w-4" />
              Tambah Menu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Menu Baru</DialogTitle>
              <DialogDescription>Masukkan detail menu restoran</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as MenuCategory)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="breakfast">Sarapan</TabsTrigger>
                    <TabsTrigger value="menu">Menu Utama</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Menu</Label>
                <Input id="name" name="name" required placeholder="Nasi Goreng" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input id="description" name="description" placeholder="Deskripsi singkat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input id="price" name="price" type="number" min={0} step="1000" required placeholder="35000" />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary" disabled={addMenuItemMutation.isPending}>
                {addMenuItemMutation.isPending ? "Menyimpan..." : "Simpan Menu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {menuQuery.isLoading && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Mengambil daftar menu...
        </Card>
      )}

      {menuQuery.isError && !menuQuery.isLoading && (
        <Card className="p-6 text-center text-destructive border border-destructive/40">
          Gagal memuat menu. Pastikan Anda memiliki hak akses dan Supabase tersedia.
        </Card>
      )}

      {!menuQuery.isLoading && !menuQuery.isError && menuItems.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Belum ada menu yang tercatat. Tambahkan item baru untuk memulai.
        </Card>
      )}

      {!menuQuery.isLoading && !menuQuery.isError && menuItems.length > 0 && (
        <Tabs defaultValue="breakfast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="breakfast">Sarapan ({breakfastItems.length})</TabsTrigger>
            <TabsTrigger value="menu">Menu Utama ({mainMenuItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="breakfast" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {breakfastItems.map((item) => (
                <Card key={item.id} className="p-6 bg-gradient-card shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <Coffee className="h-5 w-5 text-accent" />
                    </div>
                    <div className="pt-3 border-t border-border">
                      <p className="text-xl font-bold text-primary">
                        Rp {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mainMenuItems.map((item) => (
                <Card key={item.id} className="p-6 bg-gradient-card shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <Coffee className="h-5 w-5 text-accent" />
                    </div>
                    <div className="pt-3 border-t border-border">
                      <p className="text-xl font-bold text-primary">
                        Rp {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Restaurant;
