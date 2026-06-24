import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PartyPopper, Plus, Trash2 } from "lucide-react";

export default function ActividadesEditor({ actividades, onChange }) {
  const update = (i, field, val) => onChange(actividades.map((a, idx) => (idx === i ? { ...a, [field]: val } : a)));
  const remove = (i) => onChange(actividades.filter((_, idx) => idx !== i));
  const add = () => onChange([...actividades, { titulo: "Nueva actividad", texto: "" }]);

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-800">Otras actividades</h3>
          </div>
          <Button variant="outline" size="sm" onClick={add} className="rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> Añadir
          </Button>
        </div>
        <p className="text-xs text-slate-400">Cabalgata, jornadas, San Isidro, fiesta fin de temporada, actividades de verano…</p>

        {actividades.map((a, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Input value={a.titulo || ""} onChange={(e) => update(i, "titulo", e.target.value)} className="font-semibold" placeholder="Título de la actividad" />
              <Button variant="ghost" size="icon" onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Textarea value={a.texto || ""} onChange={(e) => update(i, "texto", e.target.value)} rows={3} placeholder="Descripción de la actividad" className="text-sm resize-y" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}