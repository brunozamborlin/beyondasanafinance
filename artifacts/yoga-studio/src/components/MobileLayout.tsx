import { Link, useLocation } from "wouter";
import { Home, CirclePlus, BarChart3, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/payments/new", icon: CirclePlus, label: "Pagamento" },
    { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { href: "/history", icon: History, label: "Storico" },
    { href: "/manage", icon: Settings, label: "Gestione" },
  ];

  return (
    <div className="mx-auto w-full max-w-[430px] h-dvh bg-background relative shadow-2xl flex flex-col">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="pb-4">
          {children}
        </div>
      </main>

      <nav className="shrink-0 bg-white/80 backdrop-blur-xl border-t border-border/50 pb-safe z-50">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[56px] px-1 py-1 rounded-xl transition-all duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                )}
              >
                <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} />
                <span className={cn("text-[10px] font-medium transition-all duration-300", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
