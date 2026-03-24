import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, getCurrentMonthStr, formatMonth } from "@/lib/utils";
import { useGetMonthlySummary } from "@workspace/api-client-react";
import { TrendingUp, ArrowDownRight, ArrowUpRight, Receipt, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Accounts() {
  const currentMonth = getCurrentMonthStr();
  const { data: summary, isLoading } = useGetMonthlySummary(currentMonth);

  return (
    <PageTransition className="p-6">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-serif text-foreground">Conti</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(currentMonth)}</p>
      </header>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-24 bg-black/5 rounded-2xl w-full"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          
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

        </div>
      )}
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
