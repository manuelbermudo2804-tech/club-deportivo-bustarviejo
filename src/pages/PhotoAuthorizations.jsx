import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, AlertTriangle, Copy, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";
import { playerPrimaryCategory } from "@/components/utils/playerCategoryFilter";

export default function PhotoAuthorizations() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.role !== "admin") {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        const players = await base44.entities.Player.filter({ activo: true }, "nombre", 1000);
        // Sin autorización = NO AUTORIZO o sin responder
        const sinAuth = players.filter(p => p.autorizacion_fotografia !== "SI AUTORIZO");

        const porCategoria = {};
        for (const p of sinAuth) {
          const cat = playerPrimaryCategory(p) || "Sin categoría";
          if (!porCategoria[cat]) porCategoria[cat] = [];
          porCategoria[cat].push(p);
        }

        const ordenado = Object.entries(porCategoria)
          .map(([categoria, jugadores]) => ({
            categoria,
            jugadores: jugadores.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
          }))
          .sort((a, b) => a.categoria.localeCompare(b.categoria));

        setGrupos(ordenado);
        setTotal(sinAuth.length);
      } catch (e) {
        toast.error("Error al cargar las autorizaciones");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copiarTodo = () => {
    let texto = `🚫 JUGADORES SIN AUTORIZACIÓN DE FOTOS/VÍDEOS (${total})\n\n`;
    for (const g of grupos) {
      texto += `📋 ${g.categoria} (${g.jugadores.length}):\n`;
      g.jugadores.forEach(p => {
        const estado = p.autorizacion_fotografia === "NO AUTORIZO" ? "NO AUTORIZA" : "Sin responder";
        texto += `   • ${(p.nombre || "").trim()} — ${estado}\n`;
      });
      texto += "\n";
    }
    navigator.clipboard.writeText(texto.trim());
    toast.success("Lista copiada al portapapeles");
  };

  const copiarGrupo = (g) => {
    let texto = `🚫 ${g.categoria} — Sin autorización de fotos/vídeos:\n`;
    g.jugadores.forEach(p => {
      const estado = p.autorizacion_fotografia === "NO AUTORIZO" ? "NO AUTORIZA" : "Sin responder";
      texto += `• ${(p.nombre || "").trim()} — ${estado}\n`;
    });
    navigator.clipboard.writeText(texto.trim());
    toast.success(`Lista de ${g.categoria} copiada`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4 text-center">
        <ShieldOff className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Esta sección solo está disponible para administradores.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Camera className="w-6 h-6 text-orange-600" />
            Autorización de Imagen
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Jugadores que <strong>NO</strong> autorizan el uso de fotos y vídeos, agrupados por equipo.
          </p>
        </div>
        {total > 0 && (
          <Button onClick={copiarTodo} variant="outline" className="gap-2">
            <Copy className="w-4 h-4" /> Copiar todo
          </Button>
        )}
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{total}</strong> {total === 1 ? "jugador" : "jugadores"} sin autorización. Avisa a los
            entrenadores/coordinadores de cada equipo para que no aparezcan en publicaciones, galerías ni redes.
          </p>
        </CardContent>
      </Card>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Todos los jugadores activos tienen autorización de imagen.</p>
          </CardContent>
        </Card>
      ) : (
        grupos.map((g) => (
          <Card key={g.categoria} className="overflow-hidden">
            <CardHeader className="bg-slate-50 py-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                {g.categoria}
                <Badge variant="secondary">{g.jugadores.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => copiarGrupo(g)} className="gap-1.5 text-xs">
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {g.jugadores.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-800">{(p.nombre || "").trim()}</span>
                    {p.autorizacion_fotografia === "NO AUTORIZO" ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">NO AUTORIZA</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Sin responder</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}