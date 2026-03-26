import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, TrendingUp, ShoppingBag, CreditCard, Users, Trophy, Settings } from "lucide-react";
import { useLocation } from "wouter";

const COLORS = ["#7c8c6e", "#a3b18a", "#dda15e", "#bc6c25", "#606c38", "#283618", "#588157", "#dad7cd"];
const METHOD_LABELS: Record<string, string> = { contanti: "Contanti", pos: "POS", bonifico: "Bonifico" };

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${base}api/summary/dashboard`, { headers });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
  });
}

function shortMonth(monthStr: string) {
  try {
    const d = new Date(`${monthStr}-01`);
    return d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
  } catch {
    return monthStr;
  }
}

function eurTooltipFormatter(value: number) {
  return formatCurrency(value);
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="text-base font-serif font-medium text-foreground">{title}</h2>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <PageTransition className="p-6">
        <header className="mb-6 mt-2">
          <h1 className="text-2xl font-serif text-foreground">Dashboard</h1>
        </header>
        <div className="space-y-6 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-56 bg-black/5 rounded-2xl"></div>)}
        </div>
      </PageTransition>
    );
  }

  const monthlyData = (data?.monthlyData || []).map((m: any) => ({
    ...m,
    label: shortMonth(m.month),
    revenueEur: m.revenue / 100,
    profitEur: m.netProfit / 100,
    otherCostsEur: m.otherCosts / 100,
    taxesEur: m.estimatedTaxes / 100,
    teacherCostsEur: m.teacherCosts / 100,
  }));

  const productData = (data?.productStats || [])
    .map((p: any) => ({
      name: p.productName,
      value: p.totalRevenue / 100,
      count: p.count,
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6);

  const methodData = (data?.paymentMethodStats || []).map((m: any) => ({
    name: METHOD_LABELS[m.method] || m.method,
    value: m.count,
    amount: m.totalAmount,
  }));

  const topCustomers = (data?.topCustomers || []).slice(0, 5);

  const totalRevenue = monthlyData.reduce((s: number, m: any) => s + m.revenue, 0);
  const totalProfit = monthlyData.reduce((s: number, m: any) => s + m.netProfit, 0);
  const totalPayments = (data?.paymentMethodStats || []).reduce((s: number, m: any) => s + m.count, 0);

  return (
    <PageTransition className="p-6">
      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {monthlyData.length > 0
              ? `${formatMonth(monthlyData[0].month)} — ${formatMonth(monthlyData[monthlyData.length - 1].month)}`
              : "Nessun dato"}
          </p>
        </div>
        <button onClick={() => navigate("/settings")} className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-border/40 border-l-4 border-l-[#dda15e] text-left">
          <div className="text-xs text-muted-foreground mb-1">Incassi</div>
          <div className="text-sm font-serif font-medium">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-border/40 border-l-4 border-l-primary text-left">
          <div className="text-xs text-muted-foreground mb-1">Utile</div>
          <div className="text-sm font-serif font-medium">{formatCurrency(totalProfit)}</div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-border/40 border-l-4 border-l-[#90a4ae] text-left">
          <div className="text-xs text-muted-foreground mb-1">Pagamenti</div>
          <div className="text-sm font-serif font-medium">{totalPayments}</div>
        </div>
      </div>

      <div className="space-y-6 pb-8">

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
          <SectionHeader icon={TrendingUp} title="Entrate" />
          <div className="h-52 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={35} />
                <Tooltip formatter={(v: number) => `€ ${v.toFixed(2)}`} labelFormatter={(l) => l} />
                <Bar dataKey="otherCostsEur" name="Costi Fissi" stackId="revenue" fill="#e57373" radius={[0, 0, 0, 0]} />
                <Bar dataKey="teacherCostsEur" name="Insegnanti" stackId="revenue" fill="#dda15e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="taxesEur" name="Tasse" stackId="revenue" fill="#90a4ae" radius={[0, 0, 0, 0]} />
                <Bar dataKey="profitEur" name="Utile" stackId="revenue" fill="#7c8c6e" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {[
              { label: "Utile", color: "#7c8c6e" },
              { label: "Tasse", color: "#90a4ae" },
              { label: "Insegnanti", color: "#dda15e" },
              { label: "Costi Fissi", color: "#e57373" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
          <SectionHeader icon={ShoppingBag} title="Prodotti Più Redditizi" />
          <div className="h-48 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                <Tooltip formatter={(v: number) => `€ ${v.toFixed(2)}`} />
                <Bar dataKey="value" name="Ricavi" fill="#7c8c6e" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
          <SectionHeader icon={CreditCard} title="Metodi di Pagamento" />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {methodData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} pagamenti`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {methodData.map((m: any, idx: number) => (
              <div key={m.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{m.name}: {formatCurrency(m.amount)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
          <SectionHeader icon={Trophy} title="Clienti Top 5" />
          <div className="space-y-3">
            {topCustomers.map((c: any, idx: number) => (
              <div key={c.customerId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.customerName}</div>
                    <div className="text-xs text-muted-foreground">{c.count} pagamenti</div>
                  </div>
                </div>
                <div className="font-serif text-sm font-medium">{formatCurrency(c.totalSpent)}</div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun dato disponibile</p>
            )}
          </div>
        </section>

        {(data?.teacherStats || []).length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
            <SectionHeader icon={Users} title="Insegnanti" />
            <div className="space-y-3">
              {data.teacherStats.map((t: any) => (
                <div key={t.teacherId}>
                  <div className="text-sm font-medium text-foreground">{t.teacherName}</div>
                  <div className="text-xs text-muted-foreground">
                    Costo: {formatCurrency(t.totalCost)}{Number(t.totalHours) > 0 ? ` · ${Number(t.totalHours).toFixed(0)} ore` : ""} · {t.monthsActive} {t.monthsActive === 1 ? "mese" : "mesi"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </PageTransition>
  );
}
