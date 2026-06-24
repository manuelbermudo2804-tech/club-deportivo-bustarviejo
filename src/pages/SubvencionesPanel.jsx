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

export default function SubvencionesPanel() {
  const [isAdmin, setIsAdmin] = useState(true);
  const [sources, setSources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
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
      toast.success(`Revisión completada · ${d.nuevas || 0} nuevas${d.errores ? ` · ${d.errores} con error` : ""}`);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo revisar las fuentes");
    } finally {
      setChecking(false);
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
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <Landmark className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold">Vigilancia de Subvenciones</h1>
            <p className="text-emerald-100 text-sm">Detecta ayudas nuevas desde feeds RSS y Alertas de Google</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runCheck} disabled={checking || sources.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Revisar ahora
        </Button>
        <Button variant="outline" onClick={() => { setEditingSource(null); setFormOpen(true); }} className="rounded-lg">
          <Plus className="w-4 h-4 mr-2" /> Añadir fuente
        </Button>
        {noLeidas > 0 && <Badge className="bg-orange-100 text-orange-700">{noLeidas} sin leer</Badge>}
      </div>

      <Tabs defaultValue="alertas">
        <TabsList>
          <TabsTrigger value="alertas">Subvenciones ({alerts.length})</TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes ({sources.length})</TabsTrigger>
        </TabsList>

        {/* Alertas */}
        <TabsContent value="alertas" className="space-y-4 mt-4">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
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
              <Card key={src.id} className="rounded-2xl border-slate-200">
                <CardContent className="p-4 flex items-center gap-3">
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
                  <Switch checked={src.activa} onCheckedChange={() => toggleSource(src)} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditingSource(src); setFormOpen(true); }} className="h-8 w-8 text-slate-400">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
              );
            })
          )}
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