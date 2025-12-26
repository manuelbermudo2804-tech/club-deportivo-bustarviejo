import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ClipboardCheck, RefreshCw, Plus, Filter, CheckCircle2, AlertTriangle, Image as ImageIcon } from "lucide-react";

function weekKey(date = new Date()) {
  // ISO week key: RRRR-WII
  try { return format(date, "RRRR-'W'II"); } catch { return new Date().toISOString().slice(0,10); }
}

export default function CompetitionChecklist() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ categoria: "", tipo: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [paste, setPaste] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("otro");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === 'admin';

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["competition-assets"],
    queryFn: () => base44.entities.CompetitionAsset.list('-updated_date', 1000),
    initialData: [],
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => assets.filter(a =>
    (!filters.categoria || (a.categoria||"") === filters.categoria) &&
    (!filters.tipo || (a.tipo||"") === filters.tipo)
  ), [assets, filters]);

  const checkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('checkCompetitionAssets', { onlyActive: true, categoria: filters.categoria || undefined, tipo: filters.tipo || undefined });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competition-assets"] })
  });

  const upsertMutation = useMutation({
    mutationFn: async (rows) => {
      const existing = await base44.entities.CompetitionAsset.list('-updated_date', 1000);
      const existingSet = new Set(existing.map(x => (x.url||'').trim()));
      const toCreate = rows.filter(u => u && u.url && !existingSet.has(u.url.trim()));
      const created = toCreate.length ? await base44.entities.CompetitionAsset.bulkCreate(toCreate) : [];
      return { created: created?.length || 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-assets"] });
      setShowAdd(false); setPaste("");
    }
  });

  const markAllReviewed = async () => {
    const wk = weekKey();
    await Promise.all(filtered.map(a => {
      const reviewed = Array.isArray(a.reviewed_weeks) ? a.reviewed_weeks : [];
      if (reviewed.includes(wk)) return Promise.resolve();
      return base44.entities.CompetitionAsset.update(a.id, { reviewed_weeks: [...reviewed, wk] });
    }));
    qc.invalidateQueries({ queryKey: ["competition-assets"] });
  };

  const statuses = useMemo(() => ({
    cambiado: { color: 'bg-red-100 text-red-700', label: 'Cambiado' },
    igual: { color: 'bg-green-100 text-green-700', label: 'Igual' },
    error: { color: 'bg-yellow-100 text-yellow-700', label: 'Error' },
    nuevo: { color: 'bg-slate-100 text-slate-700', label: 'Nuevo' }
  }), []);

  const onAdd = () => {
    const lines = paste.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const payload = lines.map(url => ({ url, categoria: categoria || undefined, tipo }));
    upsertMutation.mutate(payload);
  };

  if (!isAdmin) return (
    <div className="max-w-4xl mx-auto p-6">
      <Card><CardContent className="p-8 text-center text-slate-600">Solo administradores</CardContent></Card>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6"/> Checklist de Lunes (Competición)</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4"/> Añadir URLs</Button>
          <Button onClick={() => checkMutation.mutate()} className="gap-2 bg-orange-600 hover:bg-orange-700" disabled={checkMutation.isPending}><RefreshCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''}`}/> {checkMutation.isPending ? 'Comprobando…' : 'Comprobar ahora'}</Button>
          <Button variant="outline" onClick={markAllReviewed} className="gap-2"><CheckCircle2 className="w-4 h-4"/> Marcar todo revisado ({weekKey()})</Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500"/>
            <Input placeholder="Filtrar categoría (texto exacto)" value={filters.categoria} onChange={e => setFilters(f => ({...f, categoria: e.target.value}))} className="w-56"/>
          </div>
          <select value={filters.tipo} onChange={e => setFilters(f => ({...f, tipo: e.target.value}))} className="border rounded-md px-3 py-2">
            <option value="">Todos los tipos</option>
            <option value="clasificacion">Clasificación</option>
            <option value="resultados">Resultados</option>
            <option value="goleadores">Goleadores</option>
            <option value="otro">Otro</option>
          </select>
          <div className="text-sm text-slate-600 ml-auto">Total: {filtered.length} {isLoading && '(cargando...)'}</div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filtered.map(a => (
          <Card key={a.id} className="hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4"/>
                <span className="truncate max-w-[56ch]" title={a.url}>{a.url}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {a.categoria && <Badge variant="outline">{a.categoria}</Badge>}
                <Badge className="bg-slate-100 text-slate-700 capitalize">{a.tipo || 'otro'}</Badge>
                <Badge className={`${statuses[a.status||'nuevo']?.color || 'bg-slate-100'} capitalize`}>{statuses[a.status||'nuevo']?.label || a.status || 'Nuevo'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span>Última comprobación: {a.last_checked_at ? new Date(a.last_checked_at).toLocaleString() : '—'}</span>
                {a.http_status && <span>HTTP: {a.http_status}</span>}
                {a.bytes != null && <span>Tamaño: {a.bytes} bytes</span>}
                {a.last_etag && <span className="truncate">ETag: <code>{a.last_etag}</code></span>}
                {a.last_modified && <span>Modificado: {a.last_modified}</span>}
                <Button variant="outline" size="sm" onClick={async () => {
                  const wk = weekKey();
                  const reviewed = Array.isArray(a.reviewed_weeks) ? a.reviewed_weeks : [];
                  if (!reviewed.includes(wk)) {
                    await base44.entities.CompetitionAsset.update(a.id, { reviewed_weeks: [...reviewed, wk] });
                    qc.invalidateQueries({ queryKey: ["competition-assets"] });
                  }
                }}>Marcar revisado ({weekKey()})</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="p-10 text-center text-slate-500">Sin assets todavía. Usa “Añadir URLs”.</CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Añadir URLs (una por línea)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={8} className="w-full border rounded-md p-3" placeholder="https://.../clasificacion.png\nhttps://.../resultados.png"/>
            <div className="flex items-center gap-3">
              <Input placeholder="Categoría común (opcional)" value={categoria} onChange={e => setCategoria(e.target.value)} className="flex-1"/>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="border rounded-md px-3 py-2">
                <option value="clasificacion">Clasificación</option>
                <option value="resultados">Resultados</option>
                <option value="goleadores">Goleadores</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={onAdd} disabled={!paste.trim() || upsertMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
                {upsertMutation.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}