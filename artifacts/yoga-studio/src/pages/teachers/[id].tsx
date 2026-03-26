import { useParams } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { useListTeachers } from "@workspace/api-client-react";
import { ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const teacherId = parseInt(id!);
  const [, navigate] = useLocation();

  const { data: teachers } = useListTeachers();
  const teacher = teachers?.find(t => t.id === teacherId);

  if (!teacher) return <div className="p-6">Caricamento...</div>;

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-border/50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate("/teachers")} className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-serif font-medium">{teacher.name}</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/40">
          <h2 className="text-lg font-serif mb-4">Dettagli</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tipo Compenso</span>
              <span className="text-sm font-medium">
                {teacher.compensationType === 'hourly'
                  ? `Orario (${formatCurrency(teacher.hourlyRate)}/h)`
                  : 'Manuale'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Stato</span>
              <span className="text-sm font-medium">{teacher.active ? 'Attivo' : 'Inattivo'}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Per modificare i costi mensili, vai su Storico → seleziona un mese → espandi "Costi Insegnanti"
        </p>
      </div>
    </PageTransition>
  );
}
