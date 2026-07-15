import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trophy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import CategoriaManager from "@/components/torneos/CategoriaManager";
import LiguillaResultados from "@/components/torneos/LiguillaResultados";
import EliminatoriasManager from "@/components/torneos/EliminatoriasManager";

const ESTADOS = ["borrador", "publicado", "en_curso", "finalizado", "archivado"];

export default function TorneoManager() {
  const queryClient = useQueryClient();
  const torneoId = new URLSearchParams(window.location.search).get("id");
  const [catSel, setCatSel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["torneo-full", torneoId],
    queryFn: async () => {
      const [torneo, categorias, grupos, equipos, partidos] = await Promise.all([
        base44.entities.Torneo.filter({ id: torneoId }).then((r) => r[0]),
        base44.entities.TorneoCategoria.filter({ torneo_id: torneoId }),
        base44.entities.TorneoGrupo.filter({ torneo_id: torneoId }),
        base44.entities.TorneoEquipo.filter({ torneo_id: torneoId }),
        base44.entities.TorneoPartido.filter({ torneo_id: torneoId }),
      ]);
      return { torneo, categorias, grupos, equipos, partidos };
    },
    enabled: !!torneoId,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado) => base44.entities.Torneo.update(torneoId, { estado }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["torneo-full", torneoId] }); toast.success("Estado actualizado"); },
  });

  if (isLoading) return <p className="text-center text-slate-400 py-10">Cargando...</p>;
  if (!data?.torneo) return <p className="text-center text-slate-400 py-10">Torneo no encontrado.</p>;

  const { torneo, categorias, grupos, equipos, partidos } = data;
  const categoriasOrdenadas = [...categorias].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const catActiva = categoriasOrdenadas.find((c) => c.id === catSel) || categoriasOrdenadas[0];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to={createPageUrl("TorneosAdmin")}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 truncate">
            <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" /> {torneo.nombre}
          </h1>
          <p className="text-xs text-slate-400">{torneo.deporte} · {torneo.tipo_puntuacion === "sets" ? "por sets" : "por goles"}</p>
        </div>
        <Select value={torneo.estado} onValueChange={(v) => cambiarEstado.mutate(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {torneo.slug && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-xs text-blue-700 flex-1 truncate">
            Página pública: <code>/torneo/{torneo.slug}</code>
          </span>
          <a href={`/torneo/${torneo.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-7">Abrir</Button>
          </a>
          <Button variant="outline" size="sm" className="h-7"
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/torneo/${torneo.slug}`); toast.success("Enlace copiado"); }}>
            Copiar enlace
          </Button>
        </div>
      )}

      <Tabs defaultValue="equipos">
        <TabsList className="w-full">
          <TabsTrigger value="equipos" className="flex-1">Equipos</TabsTrigger>
          <TabsTrigger value="liguilla" className="flex-1">Liguilla</TabsTrigger>
          <TabsTrigger value="eliminatorias" className="flex-1">Cuadros</TabsTrigger>
        </TabsList>

        <TabsContent value="equipos" className="mt-4">
          <CategoriaManager
            torneo={torneo}
            categorias={categoriasOrdenadas}
            grupos={grupos}
            equipos={equipos}
          />
        </TabsContent>

        {categoriasOrdenadas.length > 1 && (
          <div className="mt-3">
            <Select value={catActiva?.id} onValueChange={setCatSel}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoriasOrdenadas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <TabsContent value="liguilla" className="mt-4 space-y-3">
          {!catActiva ? (
            <p className="text-center text-slate-400 text-sm py-6">Crea categorías y equipos primero.</p>
          ) : (
            <LiguillaResultados
              torneo={torneo}
              categoria={catActiva}
              grupos={grupos.filter((g) => g.categoria_id === catActiva.id).sort((a, b) => (a.orden || 0) - (b.orden || 0))}
              equipos={equipos}
              partidos={partidos}
            />
          )}
        </TabsContent>

        <TabsContent value="eliminatorias" className="mt-4 space-y-3">
          {!catActiva ? (
            <p className="text-center text-slate-400 text-sm py-6">Crea categorías y equipos primero.</p>
          ) : (
            <EliminatoriasManager
              torneo={torneo}
              categoria={catActiva}
              grupos={grupos.filter((g) => g.categoria_id === catActiva.id).sort((a, b) => (a.orden || 0) - (b.orden || 0))}
              equipos={equipos}
              partidos={partidos}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}