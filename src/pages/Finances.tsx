import { useMemo, useState } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import type { TransactionRow } from "@/types/app";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type TransactionType = "income" | "expense";

const TRANSACTIONS_QUERY_KEY = ["transactions"];

const Finances = () => {
  const queryClient = useQueryClient();
  const { isInitialised } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeType, setActiveType] = useState<TransactionType>("income");

  const transactionsQuery = useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, date, category, created_at")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransactionRow[];
    },
    staleTime: 20000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isInitialised,
  });

  const transactions = useMemo(
    () =>
      (transactionsQuery.data ?? []).map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    [transactionsQuery.data],
  );

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "income") {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const balance = totals.income - totals.expense;

  const addTransactionMutation = useMutation({
    mutationFn: async (payload: {
      type: TransactionType;
      amount: number;
      category: string;
      description: string;
      date: string;
    }) => {
      const { error } = await supabase.from("transactions").insert({
        type: payload.type,
        amount: payload.amount,
        category: payload.category,
        description: payload.description,
        date: payload.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      [TRANSACTIONS_QUERY_KEY, ["recent-transactions"], ["reports", "weekly-trend"], ["reports", "monthly-summary"], ["dashboard-metrics"]].forEach(
        (key) => {
          queryClient.invalidateQueries({ queryKey: key, exact: true });
        },
      );
    },
  });

  const handleAddTransaction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      type: activeType,
      amount: Number(formData.get("amount")),
      category: (formData.get("category") as string)?.trim(),
      description: (formData.get("description") as string)?.trim(),
      date: (formData.get("date") as string) ?? "",
    };

    if (!payload.category) {
      toast.error("Kategori wajib diisi.");
      return;
    }

    if (!payload.description) {
      toast.error("Deskripsi wajib diisi.");
      return;
    }

    if (!payload.date) {
      toast.error("Tanggal wajib dipilih.");
      return;
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      toast.error("Jumlah transaksi tidak valid.");
      return;
    }

    try {
      await addTransactionMutation.mutateAsync(payload);
      toast.success("Transaksi berhasil ditambahkan!");
      setIsDialogOpen(false);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan transaksi.";
      toast.error(message);
    }
  };

  const isLoading = !isInitialised || transactionsQuery.isLoading || addTransactionMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Keuangan</h1>
          <p className="text-muted-foreground mt-1">Catat pemasukan dan pengeluaran hotel</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-primary shadow-md hover:shadow-lg" disabled={transactionsQuery.isLoading}>
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Transaksi</DialogTitle>
              <DialogDescription>Catat pemasukan atau pengeluaran</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Tabs value={activeType} onValueChange={(value) => setActiveType(value as TransactionType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">Pemasukan</TabsTrigger>
                    <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input id="amount" name="amount" type="number" min={0} step="1000" required placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" name="category" required placeholder="Kamar, Restoran, dll" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea id="description" name="description" required placeholder="Detail transaksi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary" disabled={addTransactionMutation.isPending}>
                {addTransactionMutation.isPending ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {transactionsQuery.isLoading && (
        <Card className="p-6 text-center text-muted-foreground border-dashed">
          Mengambil transaksi terbaru...
        </Card>
      )}

      {transactionsQuery.isError && !transactionsQuery.isLoading && (
        <Card className="p-6 text-center text-destructive border border-destructive/40">
          Gagal memuat data keuangan. Pastikan Anda memiliki akses yang sesuai.
        </Card>
      )}

      {!transactionsQuery.isLoading && !transactionsQuery.isError && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-card shadow-md">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                <h3 className="text-2xl font-bold text-success">
                  Rp {totals.income.toLocaleString("id-ID")}
                </h3>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-card shadow-md">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <h3 className="text-2xl font-bold text-destructive">
                  Rp {totals.expense.toLocaleString("id-ID")}
                </h3>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-primary shadow-md">
              <div className="space-y-2">
                <p className="text-sm text-primary-foreground/80">Saldo</p>
                <h3 className="text-2xl font-bold text-primary-foreground">
                  Rp {balance.toLocaleString("id-ID")}
                </h3>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-gradient-card">
            <h3 className="font-semibold text-lg mb-4">Riwayat Transaksi</h3>
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Belum ada transaksi. Tambahkan pemasukan atau pengeluaran untuk melihat laporan.
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income" ? "bg-success/20" : "bg-destructive/20"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {transaction.date}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}Rp {transaction.amount.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Finances;
