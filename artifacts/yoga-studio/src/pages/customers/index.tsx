import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useListCustomers, useCreateCustomer } from "@workspace/api-client-react";
import { Search, UserPlus, Phone, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading, refetch } = useListCustomers({ search: search || undefined });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <PageTransition className="p-6">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-serif text-foreground mb-4">Clienti</h1>
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
      </header>

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
            <div key={customer.id} className="bg-white rounded-2xl p-4 shadow-sm border border-border/40 hover:shadow-md transition-all">
              <h3 className="font-medium text-foreground text-lg mb-1">{customer.fullName}</h3>
              {customer.phone && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
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
    </PageTransition>
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
