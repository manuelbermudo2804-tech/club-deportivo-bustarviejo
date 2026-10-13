import React, { useState, useEffect, useMemo } from "react";
import AutorizacionImagenRow from "@/components/lopivi/AutorizacionImagenRow";
import BuscarJugadorAutorizacion from "@/components/lopivi/BuscarJugadorAutorizacion";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, AlertTriangle, Copy, ShieldOff, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { playerPrimaryCategory } from "@/components/utils/playerCategoryFilter";

export default function PhotoAuthorizations() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [todos, setTodos] = useState([]);

  // Sin autorización = NO AUTORIZO o sin responder
  const { grupos, total } = useMemo(() => {
    const sinAuth = todos.filter(p => p.autorizacion_fotografia !== "SI AUTORIZO");
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
    return { grupos: ordenado, total: sinAuth.length };
  }, [todos]);

  const actualizar = (p) => setTodos((prev) => prev.map((x) => (x.id === p.id ? p : x)));

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
        setTodos(players);
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
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
              <Camera className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Privacidad y protección de jugadores</p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Autorización de Imagen</h1>
              <p className="mt-1 text-sm text-slate-300">Control de autorizaciones de fotos y vídeos por equipo</p>
            </div>
          </div>
          {total > 0 && (
            <Button onClick={copiarTodo} variant="outline" className="w-full gap-2 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto">
              <Copy className="h-4 w-4" /> Copiar todo
            </Button>
          )}
        </div>
      </div>

      <Card className="rounded-2xl border border-orange-200 bg-orange-50 shadow-sm">
        <CardContent className="py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{total}</strong> {total === 1 ? "jugador" : "jugadores"} sin autorización. Avisa a los
            entrenadores/coordinadores de cada equipo para que no aparezcan en publicaciones, galerías ni redes.
          </p>
        </CardContent>
      </Card>

      <BuscarJugadorAutorizacion players={todos} onChanged={actualizar} />

      {total === 0 ? (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Todos los jugadores activos tienen autorización de imagen.</p>
          </CardContent>
        </Card>
      ) : (
        grupos.map((g) => (
          <Card key={g.categoria} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  <AutorizacionImagenRow key={p.id} player={p} onChanged={actualizar} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}

      {/* Texto oficial de la autorización */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4" /> Texto de la autorización (formulario de inscripción)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-900">AUTORIZACIÓN DE IMAGEN — CLUB DEPORTIVO BUSTARVIEJO</p>
          <p>De conformidad con el derecho a la propia imagen recogido en la Ley Orgánica 1/1982, de 5 de mayo, y en el Reglamento (UE) 2016/679 (RGPD), el Club Deportivo Bustarviejo solicita su autorización para la captación, almacenamiento y publicación de fotografías y vídeos del menor inscrito (o del jugador inscrito, si es mayor de edad) durante entrenamientos, partidos, torneos y eventos organizados por el club.</p>
          <p><strong>Finalidad:</strong> Las imágenes podrán ser utilizadas en los canales oficiales del club, incluyendo página web, redes sociales (Instagram, Facebook, Twitter/X), materiales promocionales, prensa local y comunicaciones internas del club.</p>
          <p><strong>Difusión:</strong> Las imágenes se publicarán siempre en el contexto de la actividad deportiva del club, nunca con fines comerciales ajenos al mismo.</p>
          <p><strong>Revocación:</strong> Esta autorización puede ser revocada en cualquier momento comunicándolo por escrito a info@cdbustarviejo.com. La revocación no tendrá carácter retroactivo sobre las publicaciones ya realizadas.</p>
          <p><strong>Conservación:</strong> Las imágenes se conservarán mientras dure la vinculación con el club y durante un periodo razonable posterior para fines de archivo histórico.</p>
        </CardContent>
      </Card>
    </div>
  );
}