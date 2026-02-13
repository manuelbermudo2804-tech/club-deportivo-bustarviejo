import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import VolunteerContactActions from "./VolunteerContactActions";

const RELACIONES = ["padre", "madre", "jugador", "familiar", "otro"];
const AREAS = ["dia_a_dia", "eventos", "logistica", "bar", "transporte", "fotografia"];
const AREA_LABELS = {
  dia_a_dia: "Día a día", eventos: "Eventos", logistica: "Logística",
  bar: "Bar", transporte: "Transporte", fotografia: "Fotografía"
};

export default function VolunteerDirectory({ profiles = [], onEdit, onDelete }) {
  const [q, setQ] = React.useState("");
  const [relacion, setRelacion] = React.useState("todas");
  const [area, setArea] = React.useState("todas");
  const [activo, setActivo] = React.useState("si");

  const normalized = (s) => (s || "").toString().toLowerCase();

  const filtered = profiles.filter((p) => {
    const kw = normalized(q);
    const kwMatch = !kw ||
      normalized(p.nombre).includes(kw) ||
      normalized(p.email).includes(kw) ||
      normalized(p.telefono).includes(kw) ||
      normalized(p.disponibilidad).includes(kw);
    const relacionMatch = relacion === "todas" || p.relacion === relacion;
    const areaMatch = area === "todas" || (Array.isArray(p.areas) && p.areas.includes(area));
    const activoMatch = activo === "todos" || (activo === "si" ? p.activo !== false : p.activo === false);
    return kwMatch && relacionMatch && areaMatch && activoMatch;
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-xl font-bold">📋 Directorio de Voluntarios</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{filtered.length} voluntario(s)</span>
          <VolunteerContactActions profiles={profiles} filteredProfiles={filtered} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Input placeholder="Buscar nombre, email, teléfono..." value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-2" />
        <Select value={relacion} onValueChange={setRelacion}>
          <SelectTrigger><SelectValue placeholder="Relación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las relaciones</SelectItem>
            {RELACIONES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {AREAS.map((a) => <SelectItem key={a} value={a}>{AREA_LABELS[a] || a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y rounded-xl bg-white">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">
              {p.nombre?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate max-w-[200px] md:max-w-[320px]">{p.nombre || p.email}</span>
                <Badge variant="secondary" className="capitalize">{p.relacion || ""}</Badge>
                {Array.isArray(p.areas) && p.areas.slice(0, 3).map((a) => (
                  <Badge key={a} className="capitalize bg-green-100 text-green-800 border-green-200 text-[10px]">{AREA_LABELS[a] || a}</Badge>
                ))}
                {p.activo === false ? (
                  <Badge className="bg-red-100 text-red-800">Inactivo</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800">Activo</Badge>
                )}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                📧 {p.email} · 📱 {p.telefono || "—"}
                {p.registrado_por_nombre && <span className="ml-2 text-slate-400">• Registrado por: {p.registrado_por_nombre}</span>}
              </div>
              {p.disponibilidad && (
                <div className="text-xs text-slate-600 mt-1 line-clamp-1">🕐 {p.disponibilidad}</div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(p)} title="Editar">
                  <Pencil className="w-4 h-4 text-slate-500" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(p)} title="Eliminar">
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
  );
}