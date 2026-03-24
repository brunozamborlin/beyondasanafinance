import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, getCurrentMonthStr, formatMonth } from "@/lib/utils";
import { useGetMonthlySummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

export default function Home() {
  const currentMonth = getCurrentMonthStr();
  const { data: summary, isLoading } = useGetMonthlySummary(currentMonth);

  return (
    <PageTransition className="p-6">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Namaste 🙏</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(currentMonth)}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-serif font-semibold">YS</span>
        </div>
      </header>

      <Link 
        href="/payments/new" 
        className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 mb-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium text-lg">Registra Pagamento</span>
      </Link>

      <section>
        <h2 className="text-lg font-serif mb-4 text-foreground">Sintesi del Mese</h2>
        
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-black/5 rounded-2xl"></div>
            <div className="flex gap-4">
              <div className="h-24 bg-black/5 rounded-2xl flex-1"></div>
              <div className="h-24 bg-black/5 rounded-2xl flex-1"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-3 text-muted-foreground mb-2 relative z-10">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">Utile Stimato</span>
              </div>
              <div className="text-3xl font-serif text-foreground relative z-10">
                {formatCurrency(summary?.netProfit)}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/50 flex-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="font-medium text-xs">Incassi</span>
                </div>
                <div className="text-xl font-serif text-foreground">
                  {formatCurrency(summary?.revenue)}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/50 flex-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  </div>
                  <span className="font-medium text-xs">Costi</span>
                </div>
                <div className="text-xl font-serif text-foreground">
                  {formatCurrency((summary?.teacherCosts ?? 0) + (summary?.otherCosts ?? 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
