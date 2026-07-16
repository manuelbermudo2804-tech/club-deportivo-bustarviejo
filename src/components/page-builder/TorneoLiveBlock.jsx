import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import GrupoClasificacion from "@/components/torneos/GrupoClasificacion";
import BracketView from "@/components/torneos/BracketView";

// Bloque del constructor que muestra un torneo EN VIVO (clasificación de grupos + cuadros Oro/Plata).
// Carga los datos públicos por slug a través de la función torneoPublic.
export default function TorneoLiveBlock({ slug, titulo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catSel, setCatSel] = useState("");

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("torneoPublic", { slug });
        if (!cancelled) setData(res?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!slug) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-center text-slate-400 text-sm">
        Selecciona un torneo en el editor de este bloque.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const torneo = data?.torneo;
  if (!torneo) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-center text-slate-400 text-sm">
        Este torneo aún no está publicado.
      </div>
    );
  }

  const { categorias = [], grupos = [], equipos = [], partidos = [] } = data;
  const cats = [...categorias].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const catActiva = cats.find((c) => c.id === catSel) || cats[0];
  const gruposCat = catActiva ? grupos.filter((g) => g.categoria_id === catActiva.id).sort((a, b) => (a.orden || 0) - (b.orden || 0)) : [];
  const partidosCat = catActiva ? partidos.filter((p) => p.categoria_id === catActiva.id) : [];
  const hayCuadros = partidosCat.some((p) => p.fase === "oro" || p.fase === "plata");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 lg:py-14">
      <h2 className="text-3xl lg:text-4xl font-black text-center mb-8 text-slate-900">
        {titulo || torneo.nombre}
      </h2>

      {cats.length === 0 ? (
        <p className="text-center text-slate-400 py-8">El torneo aún no tiene categorías publicadas.</p>
      ) : (
        <div className="space-y-5">
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
              <BracketView partidos={partidosCat} equipos={equipos} torneo={torneo} fase="oro" titulo="🥇 Copa Oro" color="#d97706" />
              <BracketView partidos={partidosCat} equipos={equipos} torneo={torneo} fase="plata" titulo="🥈 Copa Plata" color="#64748b" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}