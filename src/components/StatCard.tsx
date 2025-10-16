import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-6 text-left shadow-lg shadow-black/10 transition-all duration-300 animate-fade-in hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20",
        "before:absolute before:inset-[-40%] before:bg-gradient-card before:opacity-90 before:blur-[40px]",
        className,
      )}
    >
      <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute right-10 bottom-0 h-24 w-24 rounded-full bg-accent/20 blur-[120px]" />

      <div className="relative flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">{title}</p>
            <h3 className="text-4xl font-semibold text-foreground">{value}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner shadow-primary/20 backdrop-blur-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground/80">
          <span className="inline-flex items-center gap-2 rounded-full border border-muted/40 bg-muted/50 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Insight periode berjalan
          </span>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium",
                trend.isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {trend.isPositive ? "▲" : "▼"} {trend.value}
            </span>
          ) : (
            <span className="rounded-full bg-secondary/70 px-3 py-1 font-medium text-secondary-foreground/80">
              Data real-time
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
