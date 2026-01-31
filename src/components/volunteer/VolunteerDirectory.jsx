import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RELACIONES = ["padre", "madre", "jugador", "familiar", "otro"];
const AREAS = ["dia_a_dia", "eventos", "logistica", "bar", "transporte", "fotografia"];

export default function VolunteerDirectory({ profiles = [] }) {
  const [q, setQ] = React.useState("");
  const [relacion, setRelacion] = React.useState("todas");
  const [area, setArea] = React.useState("todas");
  const [activo, setActivo] = React.useState("todos");

  const normalized = (s) => (s || "").toString().toLowerCase();

  const filtered = profiles.filter((p) => {
    const kw = normalized(q);
    const kwMatch =
      !kw ||
      normalized(p.nombre).includes(kw) ||
      normalized(p.email).includes(kw) ||
      normalized(p.telefono).includes(kw) ||
      normalized(p.disponibilidad).includes(kw) ||
      normalized(p.notas).includes(kw);

    const relacionMatch = relacion === "todas" || p.relacion === relacion;
    const areaMatch =
      area === "todas" || Array.isArray(p.areas) && p.areas.includes(area);
    const activoMatch =
      activo === "todos" || (activo === "si" ? p.activo !== false : p.activo === false);

    return kwMatch && relacionMatch && areaMatch && activoMatch;
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-xl font-bold">Directorio de Voluntariado</h2>
        <div className="text-sm text-slate-500">{filtered.length} resultado(s)</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        <Input
          placeholder="Buscar por nombre, email, teléfono..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2"
        />
        <Select value={relacion} onValueChange={setRelacion}>
          <SelectTrigger>
            <SelectValue placeholder="Relación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las relaciones</SelectItem>
            {RELACIONES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger>
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activo} onValueChange={setActivo}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="si">Activos</SelectItem>
            <SelectItem value="no">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y rounded-xl bg-white">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
              {p.nombre?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate max-w-[200px] md:max-w-[320px]">{p.nombre || p.email}</span>
                <Badge variant="secondary" className="capitalize">{p.relacion || ""}</Badge>
                {Array.isArray(p.areas) && p.areas.slice(0,3).map((a) => (
                  <Badge key={a} className="capitalize bg-green-100 text-green-800 border-green-200">{a.replaceAll('_',' ')}</Badge>
                ))}
                {p.activo === false ? (
                  <Badge className="bg-red-100 text-red-800 border-red-200">Inactivo</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">Activo</Badge>
                )}
              </div>
              <div className="text-xs text-slate-500 truncate mt-1">
                {p.email} {p.telefono ? `· ${p.telefono}` : ""}
              </div>
              {p.disponibilidad && (
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">{p.disponibilidad}</div>
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