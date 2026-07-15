import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Editor de equipos y grupos dentro de una categoría
export default function EquiposGruposEditor({ torneo, categoria, grupos, equipos, onChange }) {
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [nGrupos, setNGrupos] = useState(grupos.length || 2);

  const addEquipo = useMutation({
    mutationFn: (nombre) =>
      base44.entities.TorneoEquipo.create({
        torneo_id: torneo.id, categoria_id: categoria.id, nombre,
      }),
    onSuccess: () => { setNuevoEquipo(""); onChange(); },
  });

  const delEquipo = useMutation({
    mutationFn: (id) => base44.entities.TorneoEquipo.delete(id),
    onSuccess: onChange,
  });

  const asignarGrupo = useMutation({
    mutationFn: ({ equipoId, grupoId }) =>
      base44.entities.TorneoEquipo.update(equipoId, { grupo_id: grupoId || "" }),
    onSuccess: onChange,
  });

  // Crea N grupos (A, B, C...) borrando los anteriores vacíos de nombre
  const crearGrupos = useMutation({
    mutationFn: async (n) => {
      // borrar grupos actuales
      await Promise.all(grupos.map((g) => base44.entities.TorneoGrupo.delete(g.id)));
      const letras = "ABCDEFGHIJKL".split("");
      await base44.entities.TorneoGrupo.bulkCreate(
        Array.from({ length: n }, (_, i) => ({
          torneo_id: torneo.id, categoria_id: categoria.id,
          nombre: `Grupo ${letras[i]}`, orden: i,
        }))
      );
      // limpiar asignaciones previas
      await Promise.all(equipos.filter((e) => e.grupo_id).map((e) =>
        base44.entities.TorneoEquipo.update(e.id, { grupo_id: "" })));
    },
    onSuccess: () => { onChange(); toast.success("Grupos creados"); },
  });

  // Reparte equipos entre grupos en serpiente
  const repartirAuto = useMutation({
    mutationFn: async () => {
      if (grupos.length === 0) throw new Error("Crea grupos primero");
      const ordenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre));
      const updates = ordenados.map((e, i) => ({
        id: e.id, grupo_id: grupos[i % grupos.length].id,
      }));
      await base44.entities.TorneoEquipo.bulkUpdate(updates);
    },
    onSuccess: () => { onChange(); toast.success("Equipos repartidos"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Grupos */}
      <div className="flex items-end gap-2">
        <div>
          <label className="text-xs text-slate-500">Nº de grupos</label>
          <Input type="number" min={1} max={12} value={nGrupos}
            onChange={(e) => setNGrupos(Number(e.target.value))} className="w-20" />
        </div>
        <Button variant="outline" size="sm" onClick={() => crearGrupos.mutate(nGrupos)} disabled={crearGrupos.isPending}>
          Crear grupos
        </Button>
        <Button variant="outline" size="sm" onClick={() => repartirAuto.mutate()} disabled={repartirAuto.isPending || grupos.length === 0}>
          <Shuffle className="w-4 h-4 mr-1" /> Repartir
        </Button>
      </div>

      {/* Añadir equipo */}
      <div className="flex gap-2">
        <Input value={nuevoEquipo} onChange={(e) => setNuevoEquipo(e.target.value)}
          placeholder="Nombre del equipo"
          onKeyDown={(e) => e.key === "Enter" && nuevoEquipo.trim() && addEquipo.mutate(nuevoEquipo.trim())} />
        <Button size="sm" onClick={() => nuevoEquipo.trim() && addEquipo.mutate(nuevoEquipo.trim())} disabled={addEquipo.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Lista de equipos con selector de grupo */}
      <div className="space-y-1.5">
        {equipos.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-3">Sin equipos todavía</p>
        ) : (
          equipos.map((e) => (
            <div key={e.id} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5">
              <span className="flex-1 text-sm truncate">{e.nombre}</span>
              {grupos.length > 0 && (
                <Select value={e.grupo_id || "none"} onValueChange={(v) => asignarGrupo.mutate({ equipoId: e.id, grupoId: v === "none" ? "" : v })}>
                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400"
                onClick={() => delEquipo.mutate(e.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}