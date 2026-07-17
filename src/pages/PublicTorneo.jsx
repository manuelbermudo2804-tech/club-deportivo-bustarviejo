import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import GrupoClasificacion from "@/components/torneos/GrupoClasificacion";
import BracketView from "@/components/torneos/BracketView";
import TorneoHeroNight from "@/components/torneos/TorneoHeroNight";
import MiEquipoBuscador from "@/components/torneos/MiEquipoBuscador";
import OrdenDeJuego from "@/components/torneos/OrdenDeJuego";
import BotaDeOro from "@/components/torneos/BotaDeOro";
import Palmares from "@/components/torneos/Palmares";

// Página pública propia de un torneo. Ruta: /torneo/:slug
export default function PublicTorneo() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catSel, setCatSel] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("torneoPublic", { slug });
        if (!cancelled) {
          setData(res?.data || null);
          const t = res?.data?.torneo;
          if (t) document.title = `${t.nombre} · CD Bustarviejo`;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  const torneo = data?.torneo;
  if (!torneo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-6">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-white mb-2">Torneo no encontrado</h1>
          <p className="text-slate-400">No existe ningún torneo público con esta dirección.</p>
        </div>
      </div>
    );
  }

  const { categorias, grupos, equipos, partidos, goles = [] } = data;
  const cats = [...categorias].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const catActiva = cats.find((c) => c.id === catSel) || cats[0];
  const gruposCat = catActiva ? grupos.filter((g) => g.categoria_id === catActiva.id).sort((a, b) => (a.orden || 0) - (b.orden || 0)) : [];
  const partidosCat = catActiva ? partidos.filter((p) => p.categoria_id === catActiva.id) : [];
  const equiposCat = catActiva ? equipos.filter((e) => e.categoria_id === catActiva.id) : [];
  const golesCat = catActiva ? goles.filter((g) => g.categoria_id === catActiva.id) : [];
  const hayCuadros = partidosCat.some((p) => p.fase === "oro" || p.fase === "plata");
  const hayGoleadores = golesCat.length > 0;
  const hayPalmares = partidosCat.some((p) => p.ronda === "Final" && p.finalizado && p.ganador_id);

  return (
    <div className="torneo-night min-h-screen">
      <TorneoHeroNight torneo={torneo} />

      <div className="max-w-4xl mx-auto px-4 pb-10 -mt-6 relative space-y-5">
        {torneo.descripcion && (
          <p className="text-slate-300 text-center text-sm bg-white rounded-xl p-4 border">{torneo.descripcion}</p>
        )}

        {cats.length === 0 ? (
          <p className="text-center text-slate-400 py-10">El torneo aún no tiene categorías publicadas.</p>
        ) : (
          <>
            {cats.length > 1 && (
              <Select value={catActiva?.id} onValueChange={setCatSel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Tabs defaultValue="clasificacion">
              <TabsList className="w-full">
                <TabsTrigger value="clasificacion" className="flex-1">Clasificación</TabsTrigger>
                <TabsTrigger value="miequipo" className="flex-1">Mi equipo</TabsTrigger>
                <TabsTrigger value="orden" className="flex-1">Orden de juego</TabsTrigger>
                <TabsTrigger value="bota" className="flex-1" disabled={!hayGoleadores}>👟 Bota</TabsTrigger>
                <TabsTrigger value="cuadros" className="flex-1" disabled={!hayCuadros}>Cuadros</TabsTrigger>
                <TabsTrigger value="palmares" className="flex-1" disabled={!hayPalmares}>🏆 Palmarés</TabsTrigger>
              </TabsList>

              <TabsContent value="palmares" className="mt-4">
                <Palmares partidos={partidosCat} equipos={equipos} goles={golesCat} />
              </TabsContent>

              <TabsContent value="bota" className="mt-4">
                <BotaDeOro goles={golesCat} equipos={equiposCat} />
              </TabsContent>

              <TabsContent value="miequipo" className="mt-4">
                <MiEquipoBuscador equipos={equiposCat} partidos={partidosCat} grupos={gruposCat} />
              </TabsContent>

              <TabsContent value="orden" className="mt-4">
                <OrdenDeJuego equipos={equiposCat} partidos={partidosCat} grupos={gruposCat} />
              </TabsContent>

              <TabsContent value="clasificacion" className="mt-4 space-y-3">
                {gruposCat.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Grupos aún no disponibles.</p>
                ) : (
                  gruposCat.map((g) => (
                    <GrupoClasificacion key={g.id} grupo={g} equipos={equipos} partidos={partidosCat} torneo={torneo} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="cuadros" className="mt-4 space-y-6">
                <BracketView partidos={partidosCat} equipos={equipos} torneo={torneo} fase="oro" titulo="🥇 Copa Oro" color="#fbbf24" />
                <BracketView partidos={partidosCat} equipos={equipos} torneo={torneo} fase="plata" titulo="🥈 Copa Plata" color="#cbd5e1" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <footer className="py-8 text-center border-t border-white/10">
        <p className="text-sm text-slate-500">
          <MapPin className="w-4 h-4 inline mb-0.5 mr-1" />
          Organizado por <strong className="text-slate-300">CD Bustarviejo</strong>
        </p>
      </footer>
    </div>
  );
}