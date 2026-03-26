import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useListCustomerStatuses } from "@workspace/api-client-react";
import { Search, UserPlus, Phone, Loader2, Pencil, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading, refetch } = useListCustomers({ search: search || undefined });
  const { data: statuses } = useListCustomerStatuses();
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [, navigate] = useLocation();

  const statusMap = new Map(statuses?.map(s => [s.customerId, s]));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate("/manage")} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-serif font-medium">Clienti</h1>
      </header>

      <div className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-border/50 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">{customers?.length || 0} risultati</span>
        <button
          onClick={() => setShowAdd(true)}
          className="text-primary font-medium text-sm flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nuovo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {customers?.map(customer => (
            <button
              key={customer.id}
              onClick={() => setEditCustomer(customer)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-border/40 hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-foreground text-lg mb-1">{customer.fullName}</h3>
                {(() => {
                  const s = statusMap.get(customer.id);
                  if (!s || s.status === "none") return null;
                  if (s.status === "active" && s.lastProduct && s.expiresAt) {
                    return <div className="text-xs text-emerald-600 font-medium mb-1">{s.lastProduct} · scade {formatDate(s.expiresAt)}</div>;
                  }
                  if (s.status === "expired" && s.lastProduct && s.expiresAt) {
                    return <div className="text-xs text-red-500 font-medium mb-1">{s.lastProduct} · scaduto {formatDate(s.expiresAt)}</div>;
                  }
                  if (s.status === "classpack" && s.lastProduct && s.purchaseDate) {
                    return <div className="text-xs text-muted-foreground font-medium mb-1">{s.lastProduct} · acquistato {formatDate(s.purchaseDate)}</div>;
                  }
                  return null;
                })()}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>
              <Pencil className="w-4 h-4 text-muted-foreground/50" />
            </button>
          ))}
          {customers?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-border text-muted-foreground">
              Nessun cliente trovato
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddCustomerModal onClose={() => setShowAdd(false)} onSuccess={() => refetch()} />
      )}

      {editCustomer && (
        <EditCustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} onSuccess={() => { setEditCustomer(null); refetch(); }} />
      )}
      </div>
    </PageTransition>
  );
}

function EditCustomerModal({ customer, onClose, onSuccess }: { customer: any, onClose: () => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const { data: allCustomers } = useListCustomers();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: customer.fullName,
    phone: customer.phone || "",
    notes: customer.notes || "",
  });
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [merging, setMerging] = useState(false);

  const handleSave = () => {
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) return;

    // Check for duplicate name (different customer, case-insensitive)
    const duplicate = allCustomers?.find(
      (c: any) => c.id !== customer.id && c.fullName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      setMergeTarget(duplicate);
      return;
    }

    updateCustomer.mutate({
      id: customer.id,
      data: { fullName: trimmedName, phone: formData.phone || undefined, notes: formData.notes || undefined },
    }, {
      onSuccess: () => {
        toast({ title: "Cliente aggiornato" });
        onSuccess();
      },
    });
  };

  const handleMerge = async () => {
    if (!mergeTarget) return;
    setMerging(true);
    try {
      const base = import.meta.env.BASE_URL || "/";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${base}api/customers/merge`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sourceId: customer.id, targetId: mergeTarget.id }),
      });

      if (res.ok) {
        toast({ title: `"${customer.fullName}" unito con "${mergeTarget.fullName}"` });
        queryClient.invalidateQueries();
        onSuccess();
      } else {
        toast({ title: "Errore durante l'unione", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore di connessione", variant: "destructive" });
    }
    setMerging(false);
  };

  if (mergeTarget) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
        <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe animation-slide-up">
          <h2 className="text-xl font-serif mb-4">Cliente Duplicato</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Esiste già un cliente con nome <strong>"{mergeTarget.fullName}"</strong>. Vuoi unire <strong>"{customer.fullName}"</strong> a questo cliente? Tutti i pagamenti verranno trasferiti.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setMergeTarget(null)} className="flex-1 py-3.5 rounded-xl font-medium bg-black/5">Annulla</button>
            <button onClick={handleMerge} disabled={merging} className="flex-1 py-3.5 rounded-xl font-medium bg-amber-500 text-white flex justify-center">
              {merging ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unisci"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe animation-slide-up">
        <h2 className="text-xl font-serif mb-6">Modifica Cliente</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Nome e Cognome *</label>
            <input
              autoFocus
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Telefono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground resize-none h-24"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-medium text-foreground bg-black/5 hover:bg-black/10 transition-colors">Annulla</button>
            <button
              onClick={handleSave}
              disabled={updateCustomer.isPending || !formData.fullName.trim()}
              className="flex-1 py-3.5 rounded-xl font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {updateCustomer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const [formData, setFormData] = useState({ fullName: "", phone: "", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    createCustomer.mutate({
      data: formData
    }, {
      onSuccess: () => {
        toast({ title: "Cliente aggiunto!" });
        onSuccess();
        onClose();
      },
      onError: () => {
        toast({ title: "Errore", variant: "destructive" });
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe animation-slide-up">
        <h2 className="text-xl font-serif mb-6">Nuovo Cliente</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Nome e Cognome *</label>
            <input
              required
              autoFocus
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Telefono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground resize-none h-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl font-medium text-foreground bg-black/5 hover:bg-black/10 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || !formData.fullName.trim()}
              className="flex-1 py-3.5 rounded-xl font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {createCustomer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
