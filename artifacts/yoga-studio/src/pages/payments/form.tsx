import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PageTransition } from "@/components/PageTransition";
import { 
  useListCustomers, 
  useListProducts, 
  useCreatePayment 
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { cn, toCents } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const paymentSchema = z.object({
  customerId: z.coerce.number().min(1, "Seleziona un cliente"),
  productId: z.coerce.number().min(1, "Seleziona un prodotto"),
  amountEur: z.coerce.number().min(0.01, "Importo richiesto"),
  paymentMethod: z.enum(["contanti", "pos", "bonifico"]),
  date: z.string().min(1, "Data richiesta"),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: customers } = useListCustomers();
  const { data: products } = useListProducts();
  const createPayment = useCreatePayment();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: 0,
      productId: 0,
      amountEur: 0,
      paymentMethod: "contanti",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    }
  });

  const [searchCustomer, setSearchCustomer] = useState("");
  const filteredCustomers = customers?.filter(c => 
    c.fullName.toLowerCase().includes(searchCustomer.toLowerCase())
  ) || [];

  const handleProductChange = (productId: number) => {
    form.setValue("productId", productId);
    const product = products?.find(p => p.id === productId);
    if (product) {
      form.setValue("amountEur", product.defaultPrice / 100);
    }
  };

  const onSubmit = (data: PaymentFormValues) => {
    createPayment.mutate({
      data: {
        customerId: data.customerId,
        productId: data.productId,
        amount: toCents(data.amountEur),
        paymentMethod: data.paymentMethod,
        date: data.date,
        note: data.note || undefined,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Pagamento registrato con successo!" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Errore durante la registrazione", variant: "destructive" });
      }
    });
  };

  return (
    <PageTransition className="min-h-screen bg-white">
      <header className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-serif text-foreground">Nuovo Pagamento</h1>
      </header>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
        
        {/* Customer Selection (Simplified Autocomplete) */}
        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-muted-foreground ml-1">Cliente</label>
          <div className="relative">
            <select 
              className={cn(
                "w-full bg-background border border-border/60 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                form.watch("customerId") === 0 ? "text-muted-foreground" : "text-foreground"
              )}
              {...form.register("customerId")}
            >
              <option value={0} disabled>Seleziona cliente...</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          {form.formState.errors.customerId && (
            <p className="text-xs text-destructive ml-1">{form.formState.errors.customerId.message}</p>
          )}
        </div>

        {/* Product Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Prodotto / Abbonamento</label>
          <select 
            className={cn(
              "w-full bg-background border border-border/60 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
              form.watch("productId") === 0 ? "text-muted-foreground" : "text-foreground"
            )}
            onChange={(e) => handleProductChange(Number(e.target.value))}
            value={form.watch("productId")}
          >
            <option value={0} disabled>Seleziona prodotto...</option>
            {products?.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {form.formState.errors.productId && (
            <p className="text-xs text-destructive ml-1">{form.formState.errors.productId.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Importo (€)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-background border border-border/60 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              placeholder="0.00"
              {...form.register("amountEur")}
            />
          </div>
          {form.formState.errors.amountEur && (
            <p className="text-xs text-destructive ml-1">{form.formState.errors.amountEur.message}</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Metodo di Pagamento</label>
          <div className="flex bg-background border border-border/60 rounded-xl p-1">
            {(["contanti", "pos", "bonifico"] as const).map(method => {
              const isSelected = form.watch("paymentMethod") === method;
              return (
                <button
                  type="button"
                  key={method}
                  onClick={() => form.setValue("paymentMethod", method)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                    isSelected ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {method}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Data</label>
          <input 
            type="date" 
            className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
            {...form.register("date")}
          />
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground ml-1">Note (Opzionale)</label>
          <textarea 
            className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground min-h-[100px] resize-none"
            placeholder="Aggiungi una nota..."
            {...form.register("note")}
          />
        </div>

        <button 
          type="submit" 
          disabled={createPayment.isPending}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 mt-8"
        >
          {createPayment.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Conferma
            </>
          )}
        </button>

      </form>
    </PageTransition>
  );
}
