import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { formatCurrency, formatMonth, toCents } from "@/lib/utils";
import { useGetMonthlySummary, useListPayments, useUpdatePayment, useDeletePayment, useListCustomers, useListProducts } from "@workspace/api-client-react";
import { TrendingUp, ArrowDownRight, ArrowUpRight, Receipt, Landmark, ChevronLeft, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const METHOD_LABELS: Record<string, string> = {
  contanti: "Contanti",
  pos: "POS",
  bonifico: "Bonifico",
};

export default function MonthDetail({ params }: { params: { month: string } }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const month = params.month;
  const { data: summary, isLoading: summaryLoading } = useGetMonthlySummary(month);
  const { data: payments, isLoading: paymentsLoading } = useListPayments({ month });
  const { data: customers } = useListCustomers();
  const { data: products } = useListProducts();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    customerId: 0,
    productId: 0,
    amountEur: "",
    paymentMethod: "contanti",
    date: "",
    note: "",
  });

  const isLoading = summaryLoading;

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({
      customerId: p.customerId,
      productId: p.productId,
      amountEur: (p.amount / 100).toFixed(2),
      paymentMethod: p.paymentMethod,
      date: p.date,
      note: p.note || "",
    });
  };

  const cancelEdit = () => setEditingId(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleSave = () => {
    if (!editingId) return;
    updatePayment.mutate({
      id: editingId,
      data: {
        customerId: editForm.customerId,
        productId: editForm.productId,
        amount: toCents(parseFloat(editForm.amountEur) || 0),
        paymentMethod: editForm.paymentMethod as any,
        date: editForm.date,
        note: editForm.note || undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Pagamento aggiornato" });
        setEditingId(null);
        invalidateAll();
      },
      onError: () => {
        toast({ title: "Errore durante l'aggiornamento", variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Eliminare questo pagamento?")) return;
    deletePayment.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Pagamento eliminato" });
        invalidateAll();
      },
      onError: () => {
        toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
      },
    });
  };

  const handleProductChange = (productId: number) => {
    setEditForm(prev => {
      const product = products?.find(p => p.id === productId);
      return {
        ...prev,
        productId,
        amountEur: product ? (product.defaultPrice / 100).toFixed(2) : prev.amountEur,
      };
    });
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
            <SummaryCard title="Incassi Totali" amount={summary?.revenue} icon={ArrowUpRight} colorClass="text-emerald-600" bgClass="bg-emerald-500/10" />
            <SummaryCard title="Costi Insegnanti" amount={summary?.teacherCosts} icon={ArrowDownRight} colorClass="text-red-600" bgClass="bg-red-500/10" />
            <SummaryCard title="Altre Spese" amount={summary?.otherCosts} icon={Receipt} colorClass="text-orange-600" bgClass="bg-orange-500/10" />
            <SummaryCard title="Tasse Stimate" amount={summary?.estimatedTaxes} icon={Landmark} colorClass="text-blue-600" bgClass="bg-blue-500/10" />

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
                  {payments.map((p) =>
                    editingId === p.id ? (
                      <div key={p.id} className="bg-white rounded-2xl p-4 shadow-md border border-primary/30 space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                          <select
                            value={editForm.customerId}
                            onChange={e => setEditForm(prev => ({ ...prev, customerId: Number(e.target.value) }))}
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm"
                          >
                            {customers?.map(c => (
                              <option key={c.id} value={c.id}>{c.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Prodotto</label>
                          <select
                            value={editForm.productId}
                            onChange={e => handleProductChange(Number(e.target.value))}
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm"
                          >
                            {products?.map(pr => (
                              <option key={pr.id} value={pr.id}>{pr.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Importo (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.amountEur}
                              onChange={e => setEditForm(prev => ({ ...prev, amountEur: e.target.value }))}
                              className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Data</label>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Metodo</label>
                          <div className="flex bg-background border border-border/60 rounded-xl p-1">
                            {(["contanti", "pos", "bonifico"] as const).map(m => (
                              <button
                                type="button"
                                key={m}
                                onClick={() => setEditForm(prev => ({ ...prev, paymentMethod: m }))}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                                  editForm.paymentMethod === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {METHOD_LABELS[m]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Note</label>
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Nota opzionale..."
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={cancelEdit} className="p-2 rounded-full hover:bg-black/5">
                            <X className="w-5 h-5 text-muted-foreground" />
                          </button>
                          <button onClick={handleSave} disabled={updatePayment.isPending} className="p-2 rounded-full hover:bg-primary/10">
                            {updatePayment.isPending ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Check className="w-5 h-5 text-primary" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-border/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm">{p.customerName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-medium text-foreground">{formatCurrency(p.amount)}</span>
                            <button onClick={() => startEdit(p)} className="p-1.5 rounded-full hover:bg-black/5">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-full hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{p.productName}</span>
                          <span>{METHOD_LABELS[p.paymentMethod] || p.paymentMethod} · {new Date(p.date).toLocaleDateString("it-IT")}</span>
                        </div>
                        {p.note && <div className="text-xs text-muted-foreground mt-1 italic">{p.note}</div>}
                      </div>
                    )
                  )}
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
