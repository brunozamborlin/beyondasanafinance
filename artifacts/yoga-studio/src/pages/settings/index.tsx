import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useGetTaxSettings, useUpdateTaxSettings, useListProducts, useUpdateProduct, useCreateProduct } from "@workspace/api-client-react";
import { ChevronLeft, Percent, Package, Loader2, Plus, X, Check, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

export default function Settings() {
  const [, navigate] = useLocation();
  const { data: taxSettings, refetch: refetchTax } = useGetTaxSettings();
  const updateTax = useUpdateTaxSettings();
  const { data: products, refetch: refetchProducts } = useListProducts();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const { toast } = useToast();
  
  const [taxInput, setTaxInput] = useState("");
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editType, setEditType] = useState("other");
  const [editDuration, setEditDuration] = useState("");
  const [editClassCount, setEditClassCount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newType, setNewType] = useState("other");
  const [newDuration, setNewDuration] = useState("");
  const [newClassCount, setNewClassCount] = useState("");

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

  const startEdit = (product: any) => {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditPrice(String((product.defaultPrice / 100).toFixed(2)));
    setEditActive(product.active);
    setEditType(product.type || "other");
    setEditDuration(product.durationMonths ? String(product.durationMonths) : "");
    setEditClassCount(product.classCount ? String(product.classCount) : "");
  };

  const cancelEdit = () => {
    setEditingProductId(null);
  };

  const handleSaveProduct = () => {
    if (!editingProductId) return;
    const priceInCents = Math.round(parseFloat(editPrice || "0") * 100);
    updateProduct.mutate({
      id: editingProductId,
      data: {
        name: editName,
        defaultPrice: priceInCents,
        active: editActive,
        type: editType,
        durationMonths: editType === "subscription" ? parseInt(editDuration) || null : null,
        classCount: editType === "classpack" ? parseInt(editClassCount) || null : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Prodotto aggiornato" });
        setEditingProductId(null);
        refetchProducts();
      }
    });
  };

  const handleAddProduct = () => {
    if (!newName.trim()) return;
    const priceInCents = Math.round(parseFloat(newPrice || "0") * 100);
    createProduct.mutate({
      data: {
        name: newName.trim(),
        defaultPrice: priceInCents,
        type: newType,
        durationMonths: newType === "subscription" ? parseInt(newDuration) || null : null,
        classCount: newType === "classpack" ? parseInt(newClassCount) || null : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Prodotto creato" });
        setIsAdding(false);
        setNewName("");
        setNewPrice("");
        setNewType("other");
        setNewDuration("");
        setNewClassCount("");
        refetchProducts();
      }
    });
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif flex items-center gap-2"><Package className="w-5 h-5 text-primary"/> Prodotti / Abbonamenti</h2>
            {!isAdding && (
              <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 text-primary text-sm font-medium">
                <Plus className="w-4 h-4" /> Nuovo
              </button>
            )}
          </div>

          {isAdding && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/30 mb-4 space-y-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome prodotto"
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
              >
                <option value="other">Altro</option>
                <option value="subscription">Abbonamento</option>
                <option value="classpack">Pacchetto Ore</option>
              </select>
              {newType === "subscription" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    placeholder="Durata"
                    className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">mesi</span>
                </div>
              )}
              {newType === "classpack" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newClassCount}
                    onChange={e => setNewClassCount(e.target.value)}
                    placeholder="Lezioni"
                    className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">lezioni</span>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setIsAdding(false); setNewName(""); setNewPrice(""); setNewType("other"); setNewDuration(""); setNewClassCount(""); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-black/5">
                  Annulla
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={createProduct.isPending || !newName.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {createProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiungi"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-1 shadow-sm border border-border/40 overflow-hidden">
            {products?.map((product) => (
              <div key={product.id} className="border-b border-border/50 last:border-0">
                {editingProductId === product.id ? (
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">€</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                      />
                    </div>
                    <select
                      value={editType}
                      onChange={e => setEditType(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                    >
                      <option value="other">Altro</option>
                      <option value="subscription">Abbonamento</option>
                      <option value="classpack">Pacchetto Ore</option>
                    </select>
                    {editType === "subscription" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editDuration}
                          onChange={e => setEditDuration(e.target.value)}
                          placeholder="Durata"
                          className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">mesi</span>
                      </div>
                    )}
                    {editType === "classpack" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editClassCount}
                          onChange={e => setEditClassCount(e.target.value)}
                          placeholder="Lezioni"
                          className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">lezioni</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={e => setEditActive(e.target.checked)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        Attivo
                      </label>
                      <div className="flex gap-2">
                        <button onClick={cancelEdit} className="p-2 rounded-full hover:bg-black/5">
                          <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button onClick={handleSaveProduct} disabled={updateProduct.isPending} className="p-2 rounded-full hover:bg-primary/10">
                          {updateProduct.isPending ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Check className="w-5 h-5 text-primary" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className={`text-xs ${product.active ? "text-muted-foreground" : "text-red-500"}`}>
                        {product.active ? "Attivo" : "Inattivo"}
                        {product.type === "subscription" && product.durationMonths && ` · ${product.durationMonths} mesi`}
                        {product.type === "classpack" && product.classCount && ` · ${product.classCount} lezioni`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-serif font-medium">{formatCurrency(product.defaultPrice)}</div>
                      <button onClick={() => startEdit(product)} className="p-2 rounded-full hover:bg-black/5">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
