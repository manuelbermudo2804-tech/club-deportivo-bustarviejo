import React, { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fechaISO } from "@/lib/sinEntrenamiento";
import useAgendaItems from "@/hooks/useAgendaItems";

const RANGOS = [1, 3, 6];

// Propone fines de semana sin nada en ningún calendario del club
export default function FechasLibresDialog({ open, onOpenChange, temporada, user }) {
  const [meses, setMeses] = useState(3);
  const start = useMemo(() => addDays(new Date(), 1), []);
  const end = useMemo(() => addDays(start, meses * 30), [start, meses]);
  const { items, isLoading } = useAgendaItems({ start, end, temporada, verTodo: true, user });

  const findes = useMemo(() => {
    const ocupados = new Set(items.map((i) => i.date));
    const lista = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (d.getDay() !== 6) continue;
      const sab = fechaISO(d), dom = fechaISO(addDays(d, 1));
      const libres = [sab, dom].filter((f) => !ocupados.has(f));
      if (libres.length) lista.push({ sab, libres, completo: libres.length === 2 });
    }
    return lista;
  }, [items, start, end]);

  const fmt = (f) => format(parseISO(f), "EEEE d 'de' MMMM", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fines de semana libres</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">Días sin entrenamientos, partidos ni eventos de ningún equipo. Ideal para fiestas, juntas de socios…</p>
        <div className="flex gap-1.5">
          {RANGOS.map((m) => (
            <Button key={m} size="sm" variant={meses === m ? "default" : "outline"} onClick={() => setMeses(m)}
              className={meses === m ? "bg-orange-600 hover:bg-orange-700 h-8 text-xs" : "h-8 text-xs"}>
              {m === 1 ? "Próximo mes" : `${m} meses`}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <div className="text-center py-8"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-r-transparent" /></div>
        ) : findes.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No hay ningún día de fin de semana libre en este periodo.</p>
        ) : (
          <div className="space-y-2">
            {findes.map((f) => (
              <div key={f.sab} className={`p-3 rounded-lg border ${f.completo ? "bg-green-50 border-green-300" : "bg-white border-slate-200"}`}>
                {f.completo && <p className="text-xs font-bold text-green-700 mb-1">Fin de semana entero libre</p>}
                {f.libres.map((d) => <p key={d} className="text-sm font-medium text-slate-800 capitalize">{fmt(d)}</p>)}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}