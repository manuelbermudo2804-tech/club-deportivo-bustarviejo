import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, AlertTriangle, Bug, User, Smartphone, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function ErrorRow({ evt }) {
  const [expanded, setExpanded] = useState(false);
  const isJs = evt.event_type === "js_error";
  const Icon = isJs ? Bug : AlertTriangle;

  return (
    <div className={`border rounded-xl p-3 ${isJs ? "border-purple-200 bg-purple-50/40" : "border-red-200 bg-red-50/40"}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`p-2 rounded-lg flex-shrink-0 ${isJs ? "bg-purple-100" : "bg-red-100"}`}>
          <Icon className={`w-4 h-4 ${isJs ? "text-purple-600" : "text-red-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{isJs ? "Error JS" : "Error App"}</Badge>
            <span className="text-xs font-mono text-slate-600 truncate">{evt.context}</span>
          </div>
          <div className="text-sm text-slate-900 mt-1 font-medium break-words">{evt.error_message || "(sin mensaje)"}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{evt.user_email}</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{evt.device || "?"}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{evt.created_date ? format(new Date(evt.created_date), "dd/MM HH:mm:ss", { locale: es }) : "?"}</span>
            {evt.page_path && <span className="text-slate-400">📍 {evt.page_path}</span>}
          </div>
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
          {evt.user_agent && <div className="break-all"><strong>Navegador:</strong> {evt.user_agent}</div>}
          {evt.extra_data?.stack && (
            <details className="mt-1">
              <summary className="cursor-pointer text-blue-600">Ver stack trace</summary>
              <pre className="mt-1 bg-slate-100 p-2 rounded text-[10px] overflow-auto max-h-48 whitespace-pre-wrap">
                {evt.extra_data.stack}
              </pre>
            </details>
          )}
          {evt.extra_data && (
            <details className="mt-1">
              <summary className="cursor-pointer text-blue-600">Datos extra</summary>
              <pre className="mt-1 bg-slate-100 p-2 rounded text-[10px] overflow-auto max-h-40">
                {JSON.stringify(evt.extra_data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function ErrorsTab() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["app-errors"],
    queryFn: async () => {
      const [appErrors, jsErrors] = await Promise.all([
        base44.entities.UploadDiagnostic.filter({ event_type: "app_error" }, "-created_date", 100),
        base44.entities.UploadDiagnostic.filter({ event_type: "js_error" }, "-created_date", 100),
      ]);
      return [...appErrors, ...jsErrors].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    refetchInterval: 20000,
    staleTime: 0,
  });

  const handleRefresh = async () => {
    const before = events.length;
    await queryClient.invalidateQueries({ queryKey: ["app-errors"] });
    const result = await refetch();
    const after = (result.data || []).length;
    const diff = after - before;
    if (diff > 0) toast.success(`Actualizado · ${diff} nuevo${diff === 1 ? "" : "s"}`);
    else toast.success("Actualizado · sin novedades");
  };

  const filtered = useMemo(() => {
    let result = events;
    if (filterType !== "all") result = result.filter((e) => e.event_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        (e.user_email || "").toLowerCase().includes(q) ||
        (e.error_message || "").toLowerCase().includes(q) ||
        (e.context || "").toLowerCase().includes(q) ||
        (e.page_path || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, filterType, search]);

  const stats = useMemo(() => {
    const appErrors = events.filter((e) => e.event_type === "app_error").length;
    const jsErrors = events.filter((e) => e.event_type === "js_error").length;
    const uniqueUsers = new Set(events.map((e) => e.user_email)).size;
    const last24h = events.filter((e) => {
      const d = new Date(e.created_date);
      return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
    }).length;
    return { appErrors, jsErrors, uniqueUsers, last24h };
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Errores capturados de la app (try/catch) y errores JavaScript del navegador.
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> {isFetching ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-red-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.appErrors}</div>
          <div className="text-xs text-red-600">Errores App</div>
        </CardContent></Card>
        <Card className="border-purple-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.jsErrors}</div>
          <div className="text-xs text-purple-600">Errores JS</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          <div className="text-xs text-slate-500">Usuarios afectados</div>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.last24h}</div>
          <div className="text-xs text-amber-600">Últimas 24h</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar email, mensaje, contexto, página..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los errores</SelectItem>
            <SelectItem value="app_error">Errores App (try/catch)</SelectItem>
            <SelectItem value="js_error">Errores JS (navegador)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando errores...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">✅ No hay errores registrados</p>
          <p className="text-sm mt-1">Cuando algo falle en la app, aparecerá aquí automáticamente.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((evt) => <ErrorRow key={evt.id} evt={evt} />)}
        </div>
      )}
    </div>
  );
}