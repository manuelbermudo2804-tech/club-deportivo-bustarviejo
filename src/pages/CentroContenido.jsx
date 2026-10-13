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

    // Avisar a quien lo envió cuando el club lo publica (crea el hábito de seguir enviando)
    if (nuevo === "publicado" && item.autor_email) {
      try {
        await base44.entities.AppNotification.create({
          usuario_email: item.autor_email,
          titulo: "¡Tu contenido se ha publicado!",
          mensaje: `El club ha publicado ${item.tipo === "video" ? "el vídeo" : "la foto"} que enviaste de ${item.equipo}. ¡Gracias por mandarlo!`,
          tipo: "info",
          icono: "📸",
          enlace: "/SubirContenido",
        });
      } catch (e) {
        console.error("[CentroContenido] no se pudo avisar al autor", e);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["contenidoClub"] });
    toast.success(
      nuevo === "guardado" ? "Guardado para publicar"
      : nuevo === "publicado" ? "Marcado como publicado"
      : "Descartado"
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Inbox className="h-6 w-6 text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Comunicación y redes sociales</p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Centro de Contenido</h1>
              <p className="mt-1 text-sm text-slate-300">Fotos y vídeos enviados por entrenadores, delegados y familias</p>
            </div>
          </div>
          <Link to="/SocialHub" className="shrink-0">
            <Button size="sm" className="w-full gap-2 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto">
              <Share2 className="h-4 w-4" /> Ir a publicar
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5">
        <p className="mb-1 font-semibold text-slate-900">¿Cómo funciona?</p>
        <p><strong>Me sirve</strong> = lo guardas para publicarlo. <strong>Ya publicado</strong> = lo marcas cuando ya ha salido. <strong>Descartar</strong> = no se usa. Con <strong>Descargar</strong> te lo llevas al móvil para subirlo a Instagram.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <EstadoTabs value={estado} onChange={setEstado} counts={counts} />
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm py-10 text-center">Cargando...</p>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
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