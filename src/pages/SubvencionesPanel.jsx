import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Landmark, RefreshCw, Plus, Rss, Loader2, ShieldCheck, AlertTriangle, Pencil, Inbox, Star, ExternalLink, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import GrantSourceForm from "@/components/grants/GrantSourceForm";
import GrantAlertCard from "@/components/grants/GrantAlertCard";
import GrantCasesPanel from "@/components/grants/GrantCasesPanel";
import GrantCommandCenter from "@/components/grants/GrantCommandCenter";

export default function SubvencionesPanel() {
  const [isAdmin, setIsAdmin] = useState(true);
  const [sources, setSources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkingDeadlines, setCheckingDeadlines] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        base44.entities.GrantSource.list("-created_date", 100),
        base44.entities.GrantAlert.list("-created_date", 200),
      ]);
      setSources(s);
      setAlerts(a);
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
    loadAll();
  }, [loadAll]);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await base44.functions.invoke("checkGrantFeeds", {});
      const d = res.data || {};
      if (d.success !== true) throw new Error(d.error || "La revisión no se completó correctamente");
      if (Number(d.errores || 0) > 0) {
        const fallos = (d.detalles || []).filter((x) => x.error).slice(0, 3).map((x) => `${x.busqueda}: ${x.error}`).join(" · ");
        toast.warning(`Revisión parcial: ${d.nuevas || 0} nuevas; ${d.errores} búsquedas con error${fallos ? ` · ${fallos}` : ""}`, { duration: 10000 });
      } else {
        toast.success(`Revisión completada · ${d.nuevas || 0} nuevas · ${d.revisadas || 0} registros revisados`);
      }
      await loadAll();
    } catch (e) {
      toast.error(`No se pudo revisar las fuentes: ${e.message || "error desconocido"}`);
    } finally {
      setChecking(false);
    }
  };

  const runDeadlineCheck = async () => {
    setCheckingDeadlines(true);
    try {
      const res = await base44.functions.invoke("checkGrantDeadlines", {});
      const d = res.data || {};
      if (d.success !== true) throw new Error(d.error || "No se pudo comprobar los plazos");
      const messages = [`${d.seguidas || 0} subvenciones seguidas`, `${d.comprobadas_bdns || 0} fichas BDNS comprobadas`, `${d.abiertas || 0} plazos abiertos detectados`, `${d.cerrando || 0} avisos de cierre emitidos`];
      toast.success(`Comprobación de plazos terminada · ${messages.join(" · ")}`, { duration: 9000 });
      await loadAll();
    } catch (e) {
      toast.error(`No se pudo comprobar los plazos: ${e.message || "error desconocido"}`, { duration: 8000 });
    } finally {
      setCheckingDeadlines(false);
    }
  };

  const toggleSource = async (src) => {
    await base44.entities.GrantSource.update(src.id, { activa: !src.activa });
    loadAll();
  };

  const deleteSource = async (src) => {
    if (!confirm(`¿Eliminar la fuente "${src.nombre}"?`)) return;
    await base44.entities.GrantSource.delete(src.id);
    loadAll();
  };

  const alertsFiltradas = alerts.filter((a) => {
    if (filtroEstado === "todas") return true;
    if (filtroEstado === "no_leidas") return !a.leida;
    return a.estado === filtroEstado;
  });

  const noLeidas = alerts.filter((a) => !a.leida).length;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      {/* Header */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
            <Landmark className="h-6 w-6 text-orange-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Ayudas públicas</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vigilancia de subvenciones</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Detecta nuevas ayudas de la BDNS, controla las fuentes y revisa los plazos de convocatoria.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Button onClick={runCheck} disabled={checking} className="w-full rounded-xl bg-orange-600 font-semibold hover:bg-orange-700 sm:w-auto">
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Revisar ahora
        </Button>
        <Button variant="outline" onClick={runDeadlineCheck} disabled={checkingDeadlines} className="w-full rounded-xl border-slate-200 sm:w-auto">
          {checkingDeadlines ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          Comprobar plazos
        </Button>
        <Button variant="outline" onClick={() => { setEditingSource(null); setFormOpen(true); }} className="w-full rounded-xl border-slate-200 sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Añadir fuente
        </Button>
        {noLeidas > 0 && <Badge className="bg-orange-100 text-orange-700">{noLeidas} sin leer</Badge>}
      </div>

      <Tabs defaultValue="alertas">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4 sm:inline-grid sm:w-auto">
          <TabsTrigger value="alertas" className="min-w-0 rounded-xl px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">Subvenciones ({alerts.length})</TabsTrigger>
          <TabsTrigger value="fuentes" className="min-w-0 rounded-xl px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">Fuentes ({sources.length})</TabsTrigger>
          <TabsTrigger value="expedientes" className="min-w-0 rounded-xl px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">Expedientes</TabsTrigger>
          <TabsTrigger value="centro" className="min-w-0 rounded-xl px-3 py-2.5 text-xs sm:text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white">Decisión y archivo</TabsTrigger>
        </TabsList>

        {/* Alertas */}
        <TabsContent value="alertas" className="space-y-4 mt-4">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full rounded-xl sm:max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="no_leidas">Sin leer</SelectItem>
              <SelectItem value="nueva">Nuevas</SelectItem>
              <SelectItem value="revisando">Revisando</SelectItem>
              <SelectItem value="interesa">Interesa</SelectItem>
              <SelectItem value="solicitada">Solicitadas</SelectItem>
              <SelectItem value="descartada">Descartadas</SelectItem>
            </SelectContent>
          </Select>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
          ) : alertsFiltradas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Inbox className="w-12 h-12 mx-auto mb-3" />
              <p>No hay subvenciones {filtroEstado !== "todas" ? "con este filtro" : "todavía"}.</p>
              {sources.length === 0 && <p className="text-sm mt-1">Empieza añadiendo una fuente RSS.</p>}
            </div>
          ) : (
            <div className="grid gap-3">
              {alertsFiltradas.map((a) => <GrantAlertCard key={a.id} alert={a} onChanged={loadAll} />)}
            </div>
          )}
        </TabsContent>

        {/* Fuentes */}
        <TabsContent value="fuentes" className="space-y-3 mt-4">
          {sources.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Rss className="w-12 h-12 mx-auto mb-3" />
              <p>Aún no has añadido ninguna fuente.</p>
              <Button onClick={() => { setEditingSource(null); setFormOpen(true); }} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Añadir primera fuente
              </Button>
            </div>
          ) : (
            [...sources].sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0)).map((src) => {
              const esManual = src.tipo === "manual" || !(src.rss_url || "").trim();
              return (
              <Card key={src.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardContent className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 truncate">{src.nombre}</h3>
                      <Badge variant="outline" className="text-xs">{src.categoria}</Badge>
                      <Badge className={`text-xs ${esManual ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                        {esManual ? <><Eye className="w-3 h-3 mr-1 inline" />Revisión manual</> : <><Rss className="w-3 h-3 mr-1 inline" />Automática</>}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= (src.prioridad || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      {src.web_oficial && (
                        <a href={src.web_oficial} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
                          <ExternalLink className="w-3 h-3" /> Abrir web oficial
                        </a>
                      )}
                      {!esManual && src.ultima_revision && <span>Revisado {formatDistanceToNow(new Date(src.ultima_revision), { addSuffix: true, locale: es })}</span>}
                      {!esManual && <span>{src.total_encontradas || 0} encontradas</span>}
                      {src.ultimo_error && (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertTriangle className="w-3 h-3" /> {src.ultimo_error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0"><span className="text-xs font-medium text-slate-500 sm:hidden">{src.activa ? "Fuente activa" : "Fuente pausada"}</span><Switch checked={src.activa} onCheckedChange={() => toggleSource(src)} aria-label={`${src.activa ? "Desactivar" : "Activar"} fuente ${src.nombre}`} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditingSource(src); setFormOpen(true); }} className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-700 sm:hidden"><Pencil className="w-4 h-4" /></Button></div>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingSource(src); setFormOpen(true); }} className="hidden h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-700 sm:inline-flex">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="expedientes" className="mt-4 space-y-4">
          <GrantCasesPanel />
        </TabsContent>

        <TabsContent value="centro" className="mt-4 space-y-4">
          <GrantCommandCenter alerts={alerts} onChanged={loadAll} />
        </TabsContent>
      </Tabs>

      <GrantSourceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        source={editingSource}
        onSaved={loadAll}
      />
    </div>
  );
}