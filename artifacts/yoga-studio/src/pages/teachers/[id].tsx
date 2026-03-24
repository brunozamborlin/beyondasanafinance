import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { useGetTeacherHours, useUpsertTeacherHours, useListTeachers } from "@workspace/api-client-react";
import { ChevronLeft, Loader2, Check } from "lucide-react";
import { getCurrentMonthStr, formatMonth, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const teacherId = parseInt(id!);
  const currentMonth = getCurrentMonthStr();
  const { toast } = useToast();

  const { data: teachers } = useListTeachers();
  const teacher = teachers?.find(t => t.id === teacherId);

  const { data: hours, refetch } = useGetTeacherHours(teacherId, { month: currentMonth });
  const upsertHours = useUpsertTeacherHours();

  const [formHours, setFormHours] = useState("0");
  const [formCost, setFormCost] = useState("");

  useEffect(() => {
    if (hours) {
      setFormHours(hours.hoursWorked.toString());
      if (hours.manualCost) setFormCost((hours.manualCost / 100).toString());
    }
  }, [hours]);

  const handleSave = () => {
    upsertHours.mutate({
      id: teacherId,
      data: {
        month: currentMonth,
        hoursWorked: parseFloat(formHours) || 0,
        manualCost: teacher?.compensationType === 'manual' && formCost ? Math.round(parseFloat(formCost) * 100) : null
      }
    }, {
      onSuccess: () => {
        toast({ title: "Dati aggiornati con successo" });
        refetch();
      }
    });
  };

  if (!teacher) return <div className="p-6">Caricamento...</div>;

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-serif font-medium">{teacher.name}</h1>
          <p className="text-xs text-muted-foreground capitalize">{formatMonth(currentMonth)}</p>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/40">
          <h2 className="text-lg font-serif mb-4">Inserimento Ore</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground ml-1">Ore Lavorate nel Mese</label>
              <input 
                type="number" step="0.5" value={formHours} onChange={e => setFormHours(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 mt-1 text-foreground font-medium"
              />
            </div>

            {teacher.compensationType === 'manual' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground ml-1">Compenso Concordato (€)</label>
                <input 
                  type="number" step="0.01" value={formCost} onChange={e => setFormCost(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 mt-1 text-foreground font-medium"
                />
              </div>
            )}

            <button 
              onClick={handleSave} disabled={upsertHours.isPending}
              className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3.5 font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              {upsertHours.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Salva Ore</>}
            </button>
          </div>
        </div>

        <div className="bg-primary/5 rounded-3xl p-6 border border-primary/20">
          <h2 className="text-lg font-serif mb-4">Costo Stimato Mese</h2>
          <div className="text-4xl font-serif text-foreground">
            {teacher.compensationType === 'hourly' 
              ? formatCurrency((parseFloat(formHours) || 0) * (teacher.hourlyRate || 0))
              : formatCurrency(Math.round((parseFloat(formCost) || 0) * 100))
            }
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
