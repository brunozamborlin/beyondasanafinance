import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, getCurrentMonthStr, formatMonth } from "@/lib/utils";
import { useGetMonthlySummary, useGetMonthlyHistory } from "@workspace/api-client-react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Receipt, Landmark, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Home() {
  const currentMonth = getCurrentMonthStr();

  // Fetch current month summary and history in parallel
  const { data: currentSummary, isLoading: loadingCurrent } = useGetMonthlySummary(currentMonth);
  const { data: history, isLoading: loadingHistory } = useGetMonthlyHistory();

  // If current month has data, use it. Otherwise fall back to latest month from history.
  const currentIsEmpty = !loadingCurrent && (currentSummary?.revenue ?? 0) === 0;
  const latestMonth = currentIsEmpty && history?.length ? history[0].month : null;

  // Derive the summary to display — either current month or latest from history
  const displayMonth = currentIsEmpty && latestMonth ? latestMonth : currentMonth;
  const historySummary = latestMonth ? history?.find((m: any) => m.month === latestMonth) : null;
  const summary = currentIsEmpty && historySummary ? historySummary : currentSummary;
  const isLoading = loadingCurrent && loadingHistory;

  const { data: warnings } = useQuery({
    queryKey: ["warnings-teacher-costs"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${base}api/warnings/missing-teacher-costs`, { headers });
      if (!res.ok) return { months: [], teachers: [] };
      return res.json();
    },
  });

  const missingMonths = (warnings?.months ?? []) as string[];

  return (
    <PageTransition className="p-6">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.avif`} alt="Beyond Asana" className="w-16 h-16 rounded-lg object-contain" />
          <div>
            <h1 className="text-2xl font-serif text-foreground">Beyond Asana</h1>
            <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(displayMonth)}</p>
          </div>
        </div>
      </header>

      {missingMonths.length > 0 && (
        <Link href="/teachers" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <span className="font-medium">Costi insegnanti mancanti</span>
            <span className="text-amber-600"> per: {missingMonths.slice(0, 3).map(m => formatMonth(m)).join(", ")}</span>
          </div>
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-black/5 rounded-2xl"></div>
          <div className="flex gap-4">
            <div className="h-24 bg-black/5 rounded-2xl flex-1"></div>
            <div className="h-24 bg-black/5 rounded-2xl flex-1"></div>
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 bg-black/5 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 text-muted-foreground mb-2 relative z-10">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">Utile Netto Stimato</span>
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
                <span className="font-medium text-xs">Costi Totali</span>
              </div>
              <div className="text-xl font-serif text-foreground">
                {formatCurrency((summary?.teacherCosts ?? 0) + (summary?.otherCosts ?? 0))}
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <SummaryRow
              title="Costi Insegnanti"
              amount={summary?.teacherCosts}
              icon={ArrowDownRight}
              colorClass="text-red-600"
              bgClass="bg-red-500/10"
            />
            <SummaryRow
              title="Altre Spese"
              amount={summary?.otherCosts}
              icon={Receipt}
              colorClass="text-orange-600"
              bgClass="bg-orange-500/10"
            />
            <SummaryRow
              title="Tasse Stimate"
              amount={summary?.estimatedTaxes}
              icon={Landmark}
              colorClass="text-blue-600"
              bgClass="bg-blue-500/10"
            />
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function SummaryRow({ title, amount, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/40 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bgClass)}>
          <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        <span className="font-medium text-sm text-foreground">{title}</span>
      </div>
      <div className="text-lg font-serif font-medium text-foreground">
        {formatCurrency(amount)}
      </div>
    </div>
  );
}
