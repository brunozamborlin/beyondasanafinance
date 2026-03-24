import { PageTransition } from "@/components/PageTransition";
import { Link } from "wouter";
import { History, Users, Settings, ChevronRight, Calculator } from "lucide-react";

export default function More() {
  const menuItems = [
    { href: "/history", icon: History, label: "Storico Mesi" },
    { href: "/teachers", icon: Users, label: "Insegnanti" },
    { href: "/other-costs", icon: Calculator, label: "Altre Spese" },
    { href: "/settings", icon: Settings, label: "Impostazioni" },
  ];

  return (
    <PageTransition className="p-6">
      <header className="mb-8 mt-2">
        <h1 className="text-2xl font-serif text-foreground">Altro</h1>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-border/40 overflow-hidden">
        {menuItems.map((item, index) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex items-center justify-between p-5 border-b border-border/50 last:border-0 hover:bg-black/5 transition-colors active:bg-black/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-foreground text-lg">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </PageTransition>
  );
}
