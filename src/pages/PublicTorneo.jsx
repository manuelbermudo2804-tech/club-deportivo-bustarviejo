import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trophy, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import GrupoClasificacion from "@/components/torneos/GrupoClasificacion";
import BracketView from "@/components/torneos/BracketView";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const torneo = data?.torneo;
  if (!torneo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🏆</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Torneo no encontrado</h1>
          <p className="text-slate-600">No existe ningún torneo público con esta dirección.</p>
        </div>
      </div>
    );
  }

  const { categorias, grupos, equipos, partidos } = data;
  const cats = [...categorias].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const catActiva = cats.find((c) => c.id === catSel) || cats[0];
  const gruposCat = catActiva ? grupos.filter((g) => g.categoria_id === catActiva.id).sort((a, b) => (a.orden || 0) - (b.orden || 0)) : [];
  const partidosCat = catActiva ? partidos.filter((p) => p.categoria_id === catActiva.id) : [];
  const hayCuadros = partidosCat.some((p) => p.fase === "oro" || p.fase === "plata");

  const cPrim = torneo.color_primario || "#1e40af";
  const cSec = torneo.color_secundario || "#f59e0b";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="relative text-white px-6 py-12 text-center"
        style={{ background: `linear-gradient(135deg, ${cPrim}, ${cSec})` }}>
        {torneo.imagen_hero_url && (
          <img src={torneo.imagen_hero_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative">
          {torneo.logo_url && <img src={torneo.logo_url} alt="" className="h-20 mx-auto mb-4 object-contain" />}
          <h1 className="text-3xl md:text-5xl font-black">{torneo.nombre}</h1>
          {torneo.organizadores && <p className="mt-2 text-white/80 text-sm">{torneo.organizadores}</p>}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" /> {torneo.deporte}</span>
            {torneo.fecha_inicio && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(torneo.fecha_inicio), "dd/MM/yyyy")}
                {torneo.fecha_fin && ` – ${format(new Date(torneo.fecha_fin), "dd/MM/yyyy")}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {torneo.descripcion && (
          <p className="text-slate-600 text-center text-sm bg-white rounded-xl p-4 border">{torneo.descripcion}</p>
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
                <TabsTrigger value="cuadros" className="flex-1" disabled={!hayCuadros}>Cuadros</TabsTrigger>
              </TabsList>

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
                <BracketView partidos={partidosCat} equipos={equipos} fase="oro" titulo="🥇 Copa Oro" color="#d97706" />
                <BracketView partidos={partidosCat} equipos={equipos} fase="plata" titulo="🥈 Copa Plata" color="#64748b" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <footer className="py-8 text-center border-t bg-white">
        <p className="text-sm text-slate-400">
          <MapPin className="w-4 h-4 inline mb-0.5 mr-1" />
          Organizado por <strong className="text-slate-600">CD Bustarviejo</strong>
        </p>
      </footer>
    </div>
  );
}