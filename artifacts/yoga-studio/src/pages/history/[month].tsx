import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { useGetMonthlySummary, useListPayments } from "@workspace/api-client-react";
import { TrendingUp, ArrowDownRight, ArrowUpRight, Receipt, Landmark, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export default function MonthDetail({ params }: { params: { month: string } }) {
  const [, navigate] = useLocation();
  const month = params.month;
  const { data: summary, isLoading: summaryLoading } = useGetMonthlySummary(month);
  const { data: payments, isLoading: paymentsLoading } = useListPayments({ month });

  const isLoading = summaryLoading;

  const paymentMethodLabels: Record<string, string> = {
    contanti: "Contanti",
    pos: "POS",
    bonifico: "Bonifico",
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate("/history")} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-serif font-medium capitalize">{formatMonth(month)}</h1>
        </div>
      </header>

      <div className="p-6 space-y-4 pb-8">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-24 bg-black/5 rounded-2xl w-full"></div>
            ))}
          </div>
        ) : (
          <>
            <SummaryCard
              title="Incassi Totali"
              amount={summary?.revenue}
              icon={ArrowUpRight}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-500/10"
            />

            <SummaryCard
              title="Costi Insegnanti"
              amount={summary?.teacherCosts}
              icon={ArrowDownRight}
              colorClass="text-red-600"
              bgClass="bg-red-500/10"
            />

            <SummaryCard
              title="Altre Spese"
              amount={summary?.otherCosts}
              icon={Receipt}
              colorClass="text-orange-600"
              bgClass="bg-orange-500/10"
            />

            <SummaryCard
              title="Tasse Stimate"
              amount={summary?.estimatedTaxes}
              icon={Landmark}
              colorClass="text-blue-600"
              bgClass="bg-blue-500/10"
            />

            <div className="mt-8 pt-4 border-t border-border/50">
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 text-primary mb-2 relative z-10">
                  <TrendingUp className="w-6 h-6" />
                  <span className="font-medium text-lg">Utile Netto Stimato</span>
                </div>
                <div className="text-4xl font-serif text-foreground mt-2 relative z-10">
                  {formatCurrency(summary?.netProfit)}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-serif font-medium text-foreground mb-4">Pagamenti del Mese</h2>
              {paymentsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-black/5 rounded-2xl w-full"></div>)}
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground text-sm">{p.customerName}</span>
                        <span className="font-serif font-medium text-foreground">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.productName}</span>
                        <span>{paymentMethodLabels[p.paymentMethod] || p.paymentMethod} · {new Date(p.date).toLocaleDateString("it-IT")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nessun pagamento in questo mese
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}

function SummaryCard({ title, amount, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 flex items-center justify-between transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", bgClass)}>
          <Icon className={cn("w-6 h-6", colorClass)} />
        </div>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <div className="text-xl font-serif font-medium text-foreground">
        {formatCurrency(amount)}
      </div>
    </div>
  );
}
