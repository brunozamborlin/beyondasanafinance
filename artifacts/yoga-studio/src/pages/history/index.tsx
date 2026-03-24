import { PageTransition } from "@/components/PageTransition";
import { useGetMonthlyHistory } from "@workspace/api-client-react";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { ChevronLeft, Calendar, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function History() {
  const { data: history, isLoading } = useGetMonthlyHistory();
  const [, navigate] = useLocation();

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-serif font-medium">Storico</h1>
      </header>

      <div className="p-6 space-y-4 pb-8">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl w-full"></div>)}
          </div>
        ) : (
          history?.map((month) => (
            <button
              key={month.month}
              onClick={() => navigate(`/history/${month.month}`)}
              className="w-full bg-white rounded-2xl p-5 shadow-sm border border-border/40 hover:shadow-md transition-all flex items-center justify-between text-left active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground capitalize text-lg mb-0.5">{formatMonth(month.month)}</h3>
                  <div className="text-sm text-muted-foreground flex gap-3">
                    <span>Incassi: {formatCurrency(month.revenue)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Utile Netto</div>
                  <div className="font-serif font-medium text-lg text-primary">{formatCurrency(month.netProfit)}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </button>
          ))
        )}
        {history?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nessuno storico disponibile
          </div>
        )}
      </div>
    </PageTransition>
  );
}
