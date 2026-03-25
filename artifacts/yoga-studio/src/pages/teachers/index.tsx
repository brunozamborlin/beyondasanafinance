import { useState } from "react";
import { Link } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { useListTeachers, useCreateTeacher } from "@workspace/api-client-react";
import { ChevronLeft, UserPlus, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function Teachers() {
  const { data: teachers, isLoading, refetch } = useListTeachers();
  const [showAdd, setShowAdd] = useState(false);

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

  const missingByTeacher = new Map<number, number>(
    ((warnings?.teachers ?? []) as any[]).map((t: any) => [t.id, t.missingMonths.length])
  );

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-serif font-medium">Insegnanti</h1>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="text-primary p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      </header>

      <div className="p-6 space-y-3 pb-8">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          teachers?.map((teacher) => (
            <Link key={teacher.id} href={`/teachers/${teacher.id}`}>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 hover:shadow-md transition-all flex items-center justify-between mb-3 cursor-pointer">
                <div>
                  <h3 className="font-medium text-foreground text-lg mb-1">{teacher.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{teacher.compensationType === 'hourly'
                      ? `Orario (${formatCurrency(teacher.hourlyRate)}/h)`
                      : 'Compenso Manuale'}</span>
                    {(missingByTeacher.get(teacher.id) ?? 0) > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {missingByTeacher.get(teacher.id)} mesi mancanti
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </div>

      {showAdd && <AddTeacherModal onClose={() => setShowAdd(false)} onSuccess={() => refetch()} />}
    </PageTransition>
  );
}

function AddTeacherModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { toast } = useToast();
  const createTeacher = useCreateTeacher();
  const [formData, setFormData] = useState<{name: string; type: "hourly" | "manual"; rate: string}>({ 
    name: "", type: "hourly", rate: "" 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTeacher.mutate({
      data: {
        name: formData.name,
        compensationType: formData.type,
        hourlyRate: formData.type === 'hourly' && formData.rate ? Math.round(parseFloat(formData.rate) * 100) : null,
        active: true
      }
    }, {
      onSuccess: () => {
        toast({ title: "Insegnante aggiunto!" });
        onSuccess();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-6 pb-safe animation-slide-up">
        <h2 className="text-xl font-serif mb-6">Nuovo Insegnante</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Nome *</label>
            <input 
              required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground ml-1 mb-1 block">Tipo Compenso</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData({...formData, type: "hourly"})} className={`flex-1 py-3 rounded-xl text-sm font-medium ${formData.type === 'hourly' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border/60 text-foreground'}`}>Orario</button>
              <button type="button" onClick={() => setFormData({...formData, type: "manual"})} className={`flex-1 py-3 rounded-xl text-sm font-medium ${formData.type === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-background border border-border/60 text-foreground'}`}>Manuale</button>
            </div>
          </div>
          {formData.type === 'hourly' && (
            <div>
              <label className="text-sm text-muted-foreground ml-1 mb-1 block">Tariffa Oraria (€)</label>
              <input 
                required type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})}
                className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-foreground"
              />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-medium bg-black/5">Annulla</button>
            <button type="submit" disabled={createTeacher.isPending || !formData.name} className="flex-1 py-3.5 rounded-xl font-medium bg-primary text-primary-foreground flex justify-center">{createTeacher.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
