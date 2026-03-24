import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useGetTaxSettings, useUpdateTaxSettings, useListProducts } from "@workspace/api-client-react";
import { ChevronLeft, Percent, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function Settings() {
  const { data: taxSettings, refetch: refetchTax } = useGetTaxSettings();
  const updateTax = useUpdateTaxSettings();
  const { data: products } = useListProducts();
  const { toast } = useToast();
  
  const [taxInput, setTaxInput] = useState("");
  const [isEditingTax, setIsEditingTax] = useState(false);

  const handleSaveTax = () => {
    updateTax.mutate({
      data: { taxRate: parseFloat(taxInput) || 0 }
    }, {
      onSuccess: () => {
        toast({ title: "Tasse aggiornate" });
        setIsEditingTax(false);
        refetchTax();
      }
    });
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-serif font-medium">Impostazioni</h1>
      </header>

      <div className="p-6 space-y-8 pb-8">
        
        <section>
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-primary"/> Configurazione Tasse</h2>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40">
            {isEditingTax ? (
              <div className="flex gap-3">
                <input 
                  type="number" step="0.1" value={taxInput} onChange={e => setTaxInput(e.target.value)}
                  className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2" placeholder="Es: 22"
                />
                <button onClick={handleSaveTax} disabled={updateTax.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium">
                  {updateTax.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium text-lg">{taxSettings?.taxRate || 0}%</span>
                <button onClick={() => { setTaxInput(String(taxSettings?.taxRate || 0)); setIsEditingTax(true); }} className="text-primary text-sm font-medium">Modifica</button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Aliquota stimata applicata al calcolo dell'utile netto.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-serif mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary"/> Prodotti / Abbonamenti</h2>
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-border/40 overflow-hidden">
            {products?.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0">
                <div>
                  <div className="font-medium text-foreground">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.active ? "Attivo" : "Inattivo"}</div>
                </div>
                <div className="font-serif font-medium">{formatCurrency(product.defaultPrice)}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
