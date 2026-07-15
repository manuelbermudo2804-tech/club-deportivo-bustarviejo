import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Users, Layers } from "lucide-react";
import { toast } from "sonner";
import EquiposGruposEditor from "./EquiposGruposEditor";

// Gestiona las categorías de un torneo y, dentro de cada una, sus equipos y grupos
export default function CategoriaManager({ torneo, categorias, grupos, equipos }) {
  const queryClient = useQueryClient();
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [expandida, setExpandida] = useState(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

  const addCategoria = useMutation({
    mutationFn: (nombre) =>
      base44.entities.TorneoCategoria.create({
        torneo_id: torneo.id, nombre, orden: categorias.length,
      }),
    onSuccess: () => { setNuevaCategoria(""); invalidate(); toast.success("Categoría añadida"); },
  });

  const delCategoria = useMutation({
    mutationFn: async (cat) => {
      const eqs = equipos.filter((e) => e.categoria_id === cat.id);
      const grs = grupos.filter((g) => g.categoria_id === cat.id);
      await Promise.all([
        ...eqs.map((e) => base44.entities.TorneoEquipo.delete(e.id)),
        ...grs.map((g) => base44.entities.TorneoGrupo.delete(g.id)),
      ]);
      await base44.entities.TorneoCategoria.delete(cat.id);
    },
    onSuccess: () => { invalidate(); toast.success("Categoría eliminada"); },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={nuevaCategoria}
          onChange={(e) => setNuevaCategoria(e.target.value)}
          placeholder="Nueva categoría (ej: Alevín)"
          onKeyDown={(e) => e.key === "Enter" && nuevaCategoria.trim() && addCategoria.mutate(nuevaCategoria.trim())}
        />
        <Button onClick={() => nuevaCategoria.trim() && addCategoria.mutate(nuevaCategoria.trim())} disabled={addCategoria.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Añadir
        </Button>
      </div>

      {categorias.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">Añade la primera categoría para empezar</p>
      ) : (
        categorias.map((cat) => {
          const nEquipos = equipos.filter((e) => e.categoria_id === cat.id).length;
          const nGrupos = grupos.filter((g) => g.categoria_id === cat.id).length;
          const abierta = expandida === cat.id;
          return (
            <Card key={cat.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <button className="flex-1 text-left" onClick={() => setExpandida(abierta ? null : cat.id)}>
                    <span className="font-semibold text-slate-800">{cat.nombre}</span>
                    <span className="text-xs text-slate-400 ml-2 inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{nEquipos}</span>
                      <span className="inline-flex items-center gap-0.5"><Layers className="w-3 h-3" />{nGrupos}</span>
                    </span>
                  </button>
                  <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8"
                    onClick={() => { if (confirm(`¿Eliminar "${cat.nombre}" y todos sus equipos/grupos?`)) delCategoria.mutate(cat); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {abierta && (
                  <div className="mt-3 pt-3 border-t">
                    <EquiposGruposEditor
                      torneo={torneo}
                      categoria={cat}
                      grupos={grupos.filter((g) => g.categoria_id === cat.id)}
                      equipos={equipos.filter((e) => e.categoria_id === cat.id)}
                      onChange={invalidate}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}