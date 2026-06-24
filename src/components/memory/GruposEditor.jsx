import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, Trash2 } from "lucide-react";

export default function GruposEditor({ grupos, onChange }) {
  const update = (i, field, val) => {
    const next = grupos.map((g, idx) => (idx === i ? { ...g, [field]: val } : g));
    onChange(next);
  };
  const remove = (i) => onChange(grupos.filter((_, idx) => idx !== i));
  const add = () => onChange([...grupos, { nombre: "Nuevo grupo", responsables: "", competicion: "", posicion: "", integrantes: 0, texto: "" }]);

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-800">Disciplinas y grupos</h3>
          </div>
          <Button variant="outline" size="sm" onClick={add} className="rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> Añadir grupo
          </Button>
        </div>
        <p className="text-xs text-slate-400">Nº de integrantes y responsables se autorrellenan. Completa competición, posición y descripción.</p>

        {grupos.map((g, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Input value={g.nombre || ""} onChange={(e) => update(i, "nombre", e.target.value)} className="font-semibold" placeholder="Nombre del grupo" />
              <Button variant="ghost" size="icon" onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={g.responsables || ""} onChange={(e) => update(i, "responsables", e.target.value)} placeholder="Responsables" className="text-sm" />
              <Input value={g.colaboradores || ""} onChange={(e) => update(i, "colaboradores", e.target.value)} placeholder="Colaboradores (opcional)" className="text-sm" />
              <Input value={g.competicion || ""} onChange={(e) => update(i, "competicion", e.target.value)} placeholder="Competición (ej: RFFM 2ª Cadete, grupo 4)" className="text-sm" />
              <div className="flex gap-2">
                <Input value={g.posicion || ""} onChange={(e) => update(i, "posicion", e.target.value)} placeholder="Posición (ej: 5º de 14)" className="text-sm" />
                <Input type="number" value={g.integrantes ?? ""} onChange={(e) => update(i, "integrantes", parseInt(e.target.value, 10) || 0)} placeholder="Nº" className="text-sm w-20" />
              </div>
            </div>
            <Textarea value={g.texto || ""} onChange={(e) => update(i, "texto", e.target.value)} rows={2} placeholder="Descripción de la temporada del grupo (opcional)" className="text-sm resize-y" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}