import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, RefreshCw, ShieldCheck, Users, Flag, CalendarDays } from "lucide-react";

export default function Eurocopa2028Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ equipos: 0, partidos: 0, participantes: 0, ligas: 0, config: null });

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== "admin") return;
      const [configs, equipos, partidos, participantes, ligas] = await Promise.all([
        base44.entities.EurocopaConfig.list(),
        base44.entities.EurocopaEquipo.list("grupo", 100),
        base44.entities.EurocopaPartido.list("numero_partido", 200),
        base44.entities.EurocopaParticipante.list("-created_date", 500),
        base44.entities.EurocopaLiga.list("-created_date", 200),
      ]);
      setStats({ equipos: equipos.length, partidos: partidos.length, participantes: participantes.length, ligas: ligas.length, config: configs[0] || null });
    } catch (error) {
      console.error(error);
      toast.error("No se han podido cargar los datos de Eurocopa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-orange-600" /></div>;
  if (user?.role !== "admin") return <div className="p-8 text-center font-bold">Acceso restringido: solo administradores.</div>;

  const items = [
    { label: "Selecciones", value: stats.equipos, icon: Flag },
    { label: "Partidos", value: stats.partidos, icon: CalendarDays },
    { label: "Participantes", value: stats.participantes, icon: Users },
    { label: "Mini-ligas", value: stats.ligas, icon: Trophy },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-400/15"><Trophy className="h-6 w-6 text-orange-300" /></div><h1 className="text-3xl font-black">Eurocopa 2028 · Administración</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Sección independiente del Mundial 2026. Sus selecciones, partidos, participantes y mini-ligas usan entidades propias.</p></div>
            <Button onClick={load} variant="secondary" className="gap-2"><RefreshCw className="h-4 w-4" /> Actualizar</Button>
          </div>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map(({ label, value, icon: Icon }) => <Card key={label} className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-orange-50 p-3"><Icon className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-black text-slate-900">{value}</p></div></CardContent></Card>)}
        </div>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Estado de la competición</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><Badge variant="outline">{stats.config?.estado || "preparacion"}</Badge><span className="text-sm text-slate-600">{stats.config?.nombre_torneo || "Porra Eurocopa 2028 — CD Bustarviejo"}</span></div>
            <p className="text-sm leading-relaxed text-slate-600">La sección está creada, pero aún no se han cargado selecciones ni calendario oficial, ni se ha conectado el flujo completo de inscripción, pronósticos y pagos. Se mantiene cerrada para evitar registros incompletos.</p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Los pagos históricos de Stripe y los datos de la porra del Mundial no se modifican desde este panel.</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
