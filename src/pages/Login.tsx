import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const { login, currentUser, isInitialised } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cred, setCred] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(cred.email, cred.password);
      toast.success("Berhasil masuk.");
      const redirectTo =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal masuk. Periksa kredensial Anda.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialised) return;
    if (currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isInitialised, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border border-border/60 bg-card shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Masuk ke Stayclever</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Gunakan email dan kata sandi yang terdaftar. Owner default: owner@stayclever.local / owner123
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={cred.email}
                onChange={(event) => setCred((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={cred.password}
                onChange={(event) => setCred((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link to="/register" className="text-primary underline-offset-2 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
