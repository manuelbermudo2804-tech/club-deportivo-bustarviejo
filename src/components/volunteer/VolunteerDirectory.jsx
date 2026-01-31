import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RELACIONES = ["padre","madre","jugador","familiar","otro"];
const AREAS = ["dia_a_dia","eventos","logistica","bar","transporte","fotografia"];

export default function VolunteerDirectory({ profiles = [] }) {
  const [q, setQ] = useState("");
  const [relacion, setRelacion] = useState("todas");
  const [area, setArea] = useState("todas");
  const [estado, setEstado] = useState("todas");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (profiles || []).filter((p) => {
      const text = `${p.nombre||""} ${p.email||""} ${p.telefono||""}`.toLowerCase();
      const qok = !query || text.includes(query);
      const rok = relacion === "todas" || p.relacion === relacion;
      const aok = area === "todas" || (Array.isArray(p.areas) && p.areas.includes(area));
      const eok = estado === "todas" || (estado === "activos" ? p.activo !== false : p.activo === false);
      return qok && rok && aok && eok;
    });
  }, [profiles, q, relacion, area, estado]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Directorio de Voluntariado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Buscar nombre, email o teléfono" value={q} onChange={(e)=>setQ(e.target.value)} />
          <Select value={relacion} onValueChange={setRelacion}>
            <SelectTrigger><SelectValue placeholder="Relación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {RELACIONES.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {AREAS.map(a => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Teléfono</th>
                <th className="text-left p-2">Relación</th>
                <th className="text-left p-2">Áreas</th>
                <th className="text-left p-2">Disponibilidad</th>
                <th className="text-left p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.nombre}</td>
                  <td className="p-2">{p.email}</td>
                  <td className="p-2">{p.telefono}</td>
                  <td className="p-2 capitalize">{p.relacion}</td>
                  <td className="p-2">{Array.isArray(p.areas) ? p.areas.join(', ') : ''}</td>
                  <td className="p-2">{p.disponibilidad || ''}</td>
                  <td className="p-2">{p.activo === false ? 'Inactivo' : 'Activo'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-slate-500">Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}