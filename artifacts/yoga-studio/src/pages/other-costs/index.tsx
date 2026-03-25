import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useListOtherCosts, useCreateOtherCost, useDeleteOtherCost } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";
import { getCurrentMonthStr, formatMonth, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function OtherCosts() {
  const [month, setMonth] = useState(getCurrentMonthStr);
  const { data: costs, isLoading, refetch } = useListOtherCosts({ month });
  const deleteCost = useDeleteOtherCost();
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if(confirm("Eliminare questa spesa?")) {
      deleteCost.mutate({ id }, {
        onSuccess: () => { toast({ title: "Spesa eliminata" }); refetch(); }
      });
    }
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-serif font-medium">Altre Spese</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="text-primary p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="p-6 space-y-3 pb-8">
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-border/40 mb-4">
          <button
            onClick={() => setMonth(m => addMonths(m, -1))}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground capitalize">{formatMonth(month)}</span>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={month >= getCurrentMonthStr()}
            className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          costs?.map((cost) => (
            <div key={cost.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-foreground text-lg mb-0.5 capitalize">{cost.category}</h3>
                {cost.note && <div className="text-sm text-muted-foreground">{cost.note}</div>}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-serif font-medium text-lg">{formatCurrency(cost.amount)}</span>
                <button onClick={() => handleDelete(cost.id)} className="text-red-400 hover:text-red-600 p-2 -mr-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
        {!isLoading && costs?.length === 0 && <div className="text-center py-12 text-muted-foreground">Nessuna spesa aggiuntiva per questo mese</div>}
      </div>

      {showAdd && <AddCostModal month={month} onClose={() => setShowAdd(false)} onSuccess={() => refetch()} />}
    </PageTransition>
  );
}

function AddCostModal({ month, onClose, onSuccess }: { month: string, onClose: () => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const createCost = useCreateOtherCost();
  const [formData, setFormData] = useState({ category: "affitto", amount: "", note: "" });

  const categories = ["affitto", "bollette", "contabile", "studio", "software", "altre spese"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCost.mutate({
      data: {
        month,
        category: formData.category,
        amount: Math.round(parseFloat(formData.amount) * 100),
        note: formData.note || undefined
      }
    }, {
      onSuccess: () => { toast({ title: "Spesa aggiunta!" }); onSuccess(); onClose(); }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe animation-slide-up">
        <h2 className="text-xl font-serif mb-6">Nuova Spesa</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Categoria</label>
            <select
              value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 capitalize text-foreground"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Importo (€) *</label>
            <input
              required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Note</label>
            <input
              type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-foreground"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-medium bg-black/5">Annulla</button>
            <button type="submit" disabled={createCost.isPending || !formData.amount} className="flex-1 py-3.5 rounded-xl font-medium bg-primary text-primary-foreground flex justify-center">{createCost.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
