import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Send, Phone, Mail } from "lucide-react";
import ConvocarVoluntariosDialog from "./ConvocarVoluntariosDialog";

const RELACIONES = ["padre", "madre", "jugador", "familiar", "otro"];
const AREAS = ["dia_a_dia", "eventos", "logistica", "bar", "transporte", "fotografia"];
const AREA_LABELS = {
  dia_a_dia: "Día a día", eventos: "Eventos", logistica: "Logística",
  bar: "Bar", transporte: "Transporte", fotografia: "Fotografía"
};

export default function VolunteerDirectory({ profiles = [], onEdit, onDelete, senderUser, existingOpportunities = [] }) {
  const [q, setQ] = useState("");
  const [relacion, setRelacion] = useState("todas");
  const [area, setArea] = useState("todas");
  const [showConvocar, setShowConvocar] = useState(false);

  const normalized = (s) => (s || "").toString().toLowerCase();

  const filtered = profiles.filter((p) => {
    if (p.activo === false) return false;
    const kw = normalized(q);
    const kwMatch = !kw ||
      normalized(p.nombre).includes(kw) ||
      normalized(p.email).includes(kw) ||
      normalized(p.telefono).includes(kw);
    const relacionMatch = relacion === "todas" || p.relacion === relacion;
    const areaMatch = area === "todas" || (Array.isArray(p.areas) && p.areas.includes(area));
    return kwMatch && relacionMatch && areaMatch;
  });

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-xl font-bold">📋 Directorio de Voluntarios</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{filtered.length} voluntario(s)</span>
            <Button
              onClick={() => setShowConvocar(true)}
              className="bg-green-600 hover:bg-green-700 gap-2"
              disabled={filtered.length === 0}
            >
              <Send className="w-4 h-4" /> Convocar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <Input placeholder="Buscar nombre, email, teléfono..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={relacion} onValueChange={setRelacion}>
            <SelectTrigger><SelectValue placeholder="Relación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las relaciones</SelectItem>
              {RELACIONES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Filtrar por área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las áreas</SelectItem>
              {AREAS.map((a) => <SelectItem key={a} value={a}>{AREA_LABELS[a] || a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y rounded-xl bg-white">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">
                {p.nombre?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate max-w-[200px] md:max-w-[320px]">{p.nombre}</span>
                  <Badge variant="secondary" className="capitalize text-[10px]">{p.relacion}</Badge>
                  {(p.areas || []).map((a) => (
                    <Badge key={a} className="bg-green-50 text-green-700 border-green-200 text-[10px]">{AREA_LABELS[a] || a}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>
                  {p.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.telefono}</span>}
                  {p.registrado_por_nombre && <span className="text-slate-400">Registrado por: {p.registrado_por_nombre}</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(p)}>
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(p)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <CardContent className="text-center text-slate-500 py-6">Sin resultados</CardContent>
          )}
        </div>
      </Card>

      <ConvocarVoluntariosDialog
        open={showConvocar}
        onOpenChange={setShowConvocar}
        volunteers={filtered}
        senderUser={senderUser}
        existingOpportunities={existingOpportunities}
      />
    </>
  );
}