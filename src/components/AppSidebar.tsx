import { LayoutDashboard, Users, Bed, UtensilsCrossed, Sparkles, Receipt, BarChart3, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";

const baseMenu = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tamu", url: "/guests", icon: Users },
  { title: "Kamar", url: "/rooms", icon: Bed },
  { title: "Restoran", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Fasilitas", url: "/facilities", icon: Sparkles },
  { title: "Keuangan", url: "/finances", icon: Receipt },
  { title: "Laporan", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { currentUser } = useAuth();
  const menuItems = [...baseMenu];
  if (currentUser?.role === "owner") {
    menuItems.push({ title: "Pengguna", url: "/users", icon: ShieldCheck });
  }

  return (
    <Sidebar variant="floating" className="border-none">
      <SidebarHeader className="relative overflow-hidden rounded-3xl px-6 py-8 text-sidebar-primary-foreground shadow-lg shadow-black/20">
        <div className="absolute inset-0 bg-gradient-primary" />
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-2 right-8 h-16 w-16 rounded-full bg-accent/40 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Stayclever</p>
            <h2 className="text-2xl font-semibold text-white">Hotel Pro</h2>
            <p className="text-xs text-white/70">UI siap pakai untuk tim hospitality</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="space-y-6 px-4 pb-6 pt-4">
        <SidebarGroup className="space-y-4 rounded-3xl border border-white/10 bg-sidebar/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <SidebarGroupLabel className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sidebar-foreground/60">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        [
                          "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                          "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white",
                          isActive ? "bg-white/15 text-white shadow-glow" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")
                      }
                    >
                      <span className="absolute -left-3 top-1/2 hidden h-8 w-[3px] -translate-y-1/2 rounded-full bg-accent/90 opacity-0 transition-all duration-200 group-hover:left-0 group-hover:opacity-80 md:block" />
                      <item.icon className="h-5 w-5 text-sidebar-foreground/70 transition-colors duration-200 group-hover:text-white" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
