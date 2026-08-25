import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Inbox, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EstadoTabs from "@/components/contenido/EstadoTabs";
import ContenidoCard from "@/components/contenido/ContenidoCard";

export default function CentroContenido() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState("pendiente");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["contenidoClub"],
    queryFn: async () => (await base44.entities.ContenidoClub.list("-created_date", 200)) || [],
  });

  const counts = items.reduce((acc, it) => {
    acc[it.estado] = (acc[it.estado] || 0) + 1;
    return acc;
  }, {});
  const visibles = items.filter((it) => it.estado === estado);

  const cambiarEstado = async (item, nuevo) => {
    await base44.entities.ContenidoClub.update(item.id, { estado: nuevo });
    queryClient.invalidateQueries({ queryKey: ["contenidoClub"] });
    toast.success(
      nuevo === "guardado" ? "Guardado para publicar"
      : nuevo === "publicado" ? "Marcado como publicado"
      : "Descartado"
    );
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center">
            <Inbox className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Centro de Contenido</h1>
        </div>
        <p className="text-slate-600 text-sm">
          Todo lo que entrenadores, delegados y familias envían al club. Tú decides qué vale.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">¿Cómo funciona?</p>
        <p><strong>Me sirve</strong> = lo guardas para publicarlo. <strong>Ya publicado</strong> = lo marcas cuando ya ha salido. <strong>Descartar</strong> = no se usa. Con <strong>Descargar</strong> te lo llevas al móvil para subirlo a Instagram.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <EstadoTabs value={estado} onChange={setEstado} counts={counts} />
        <Link to="/SocialHub">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-1.5" /> Ir a publicar
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm py-10 text-center">Cargando...</p>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500">Aquí no hay nada todavía.</p>
          <p className="text-slate-400 text-sm mt-1">
            Pide a los entrenadores que envíen fotos y vídeos desde "Enviar fotos y vídeos".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibles.map((it) => (
            <ContenidoCard key={it.id} item={it} onEstado={cambiarEstado} />
          ))}
        </div>
      )}
    </div>
  );
}