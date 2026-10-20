import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderKanban, Plus, RefreshCw, CalendarClock, ExternalLink, FileCheck2, Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ESTADOS = [
  ["detectada", "Detectada"],
  ["analisis", "En análisis"],
  ["preparando", "Preparando documentación"],
  ["revision", "Pendiente de revisión"],
  ["firma_pendiente", "Pendiente de firma"],
  ["firmada", "Firmada"],
  ["presentada", "Presentada"],
  ["resolucion", "En resolución"],
  ["concedida", "Concedida"],
  ["denegada", "Denegada"],
  ["justificacion", "En justificación"],
  ["cerrada", "Cerrada"],
];
const estadoLabel = (v) => ESTADOS.find(([key]) => key === v)?.[1] || v || "Sin estado";
const estadoClass = (v) => ({
  presentada: "bg-blue-100 text-blue-800",
  concedida: "bg-emerald-100 text-emerald-800",
  denegada: "bg-red-100 text-red-800",
  cerrada: "bg-slate-100 text-slate-700",
  firma_pendiente: "bg-amber-100 text-amber-800",
  justificacion: "bg-orange-100 text-orange-800",
}[v] || "bg-slate-100 text-slate-700");
const money = (v) => Number.isFinite(Number(v)) && v !== "" && v != null ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v)) : "—";

const EMPTY = {
  titulo: "", entidad: "", referencia: "", temporada: "", estado: "detectada",
  importe_solicitado: "", importe_concedido: "", importe_cobrado: "",
  fecha_limite_solicitud: "", fecha_limite_justificacion: "", url_oficial: "",
  numero_registro: "", justificante_uri: "", notas: "", responsable: "",
};

export default function GrantCasesPanel() {
  const [cases, setCases] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, reqs, docs] = await Promise.all([
        base44.entities.GrantCase.list("-created_date", 200),
        base44.entities.GrantRequirement.list("-created_date", 500),
        base44.entities.GrantDocument.list("-created_date", 300),
      ]);
      setCases(Array.isArray(rows) ? rows : []);
      setRequirements(Array.isArray(reqs) ? reqs : []);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (e) {
      toast.error("No se pudieron cargar los expedientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const createCase = async (e) => {
    e?.preventDefault?.();
    if (!form.titulo.trim()) {
      toast.error("Indica el nombre de la convocatoria");
      return;
    }
    if (form.estado === "presentada" && (!(form.numero_registro || "").trim() || !(form.justificante_uri || "").trim())) {
      toast.error("No se puede crear como presentada sin número de registro y justificante oficial.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, titulo: form.titulo.trim() };
      ["importe_solicitado", "importe_concedido", "importe_cobrado"].forEach((k) => {
        payload[k] = payload[k] === "" ? undefined : Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      payload.historial = [{ fecha: new Date().toISOString(), accion: "Expediente creado", detalle: "Alta inicial en el gestor de subvenciones." }];
      await base44.entities.GrantCase.create(payload);
      toast.success("Expediente creado");
      setForm(EMPTY);
      setOpen(false);
      await loadCases();
    } catch (e) {
      toast.error("No se pudo crear el expediente");
    } finally {
      setSaving(false);
    }
  };

  const updateRequirement = async (req, patch) => {
    try {
      await base44.entities.GrantRequirement.update(req.id, patch);
      toast.success("Checklist actualizado");
      await loadCases();
    } catch (e) { toast.error("No se pudo actualizar el requisito"); }
  };

  const saveEvidence = async (item, patch) => {
    try {
      await base44.entities.GrantCase.update(item.id, patch);
      toast.success("Evidencia del expediente guardada");
      await loadCases();
    } catch (e) { toast.error("No se pudo guardar la evidencia"); }
  };

  const changeStatus = async (item, estado) => {
    if (estado === "presentada" && (!(item.numero_registro || "").trim() || !(item.justificante_uri || "").trim())) {
      toast.error("No se puede marcar como presentada sin número de registro y justificante oficial.");
      return;
    }
    try {
      const historial = [...(Object(item).historial || []), { fecha: new Date().toISOString(), accion: "Cambio de estado", detalle: estadoLabel(estado) }];
      await base44.entities.GrantCase.update(item.id, { estado, historial });
      toast.success("Estado actualizado");
      await loadCases();
    } catch (e) {
      toast.error("No se pudo actualizar el estado");
    }
  };

  const filtered = cases.filter((c) => {
    const matchesStatus = filter === "todos" || c.estado === filter;
    const needle = search.trim().toLocaleLowerCase("es");
    const matchesSearch = !needle || [c.titulo, c.entidad, c.referencia, c.temporada].some((v) => (v || "").toLocaleLowerCase("es").includes(needle));
    return matchesStatus && matchesSearch;
  });
  const openCount = cases.filter((c) => !["cerrada", "concedida", "denegada"].includes(c.estado)).length;
  const presentedCount = cases.filter((c) => ["presentada", "resolucion", "justificacion"].includes(c.estado)).length;
  const deadlines = cases.filter((c) => c.fecha_limite_solicitud && c.estado !== "cerrada").length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-900 p-3 text-orange-300"><FolderKanban className="h-6 w-6" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Expedientes de subvención</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">Gestiona cada ayuda desde el análisis de las bases hasta la resolución y la justificación, conservando el historial.</p>
            </div>
          </div>
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nuevo expediente
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-xs text-slate-500">Expedientes activos</p><p className="mt-1 text-2xl font-bold text-slate-900">{openCount}</p></div>
          <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-xs text-slate-500">Presentados / en trámite</p><p className="mt-1 text-2xl font-bold text-slate-900">{presentedCount}</p></div>
          <div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-xs text-slate-500">Con fecha límite registrada</p><p className="mt-1 text-2xl font-bold text-slate-900">{deadlines}</p></div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por convocatoria, entidad, referencia o temporada…" className="min-w-0 rounded-xl" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full rounded-xl sm:w-64"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadCases} disabled={loading} className="rounded-xl"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-700">{cases.length ? "No hay resultados con estos filtros" : "Todavía no hay expedientes generales"}</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">Crea una ficha por convocatoria. Los expedientes de vigilancia y la justificación municipal existente se mantienen separados.</p>
          {!cases.length && <Button onClick={() => setOpen(true)} className="mt-4 rounded-xl bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" /> Crear primer expediente</Button>}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-bold text-slate-900">{item.titulo}</h3>
                      <Badge className={estadoClass(item.estado)}>{estadoLabel(item.estado)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{[item.entidad, item.referencia, item.temporada].filter(Boolean).join(" · ") || "Sin entidad o referencia indicada"}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-2.5"><span className="block text-xs text-slate-500">Solicitado</span><span className="font-semibold">{money(item.importe_solicitado)}</span></div>
                      <div className="rounded-lg bg-slate-50 p-2.5"><span className="block text-xs text-slate-500">Concedido</span><span className="font-semibold">{money(item.importe_concedido)}</span></div>
                      <div className="rounded-lg bg-slate-50 p-2.5"><span className="block text-xs text-slate-500">Cobrado</span><span className="font-semibold">{money(item.importe_cobrado)}</span></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {item.fecha_limite_solicitud && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Límite solicitud: {item.fecha_limite_solicitud}</span>}
                      {item.fecha_limite_justificacion && <span className="inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Límite justificación: {item.fecha_limite_justificacion}</span>}
                      {item.numero_registro && <span className="inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Registro: {item.numero_registro}</span>}
                      {item.url_oficial && <a href={item.url_oficial} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Convocatoria oficial</a>}
                    </div>
                    <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                      <div><Label className="text-xs">Número de registro oficial</Label><Input className="mt-1 h-9" defaultValue={item.numero_registro || ""} onBlur={e => { if (e.target.value !== (item.numero_registro || "")) saveEvidence(item, { numero_registro: e.target.value }); }} placeholder="REGAGE…"/></div>
                      <div><Label className="text-xs">URL del justificante oficial</Label><Input className="mt-1 h-9" defaultValue={item.justificante_uri || ""} onBlur={e => { if (e.target.value !== (item.justificante_uri || "")) saveEvidence(item, { justificante_uri: e.target.value }); }} placeholder="Enlace al PDF de registro"/></div>
                      {item.estado === "presentada" && (!item.justificante_uri || !item.numero_registro) && <p className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-red-700"><AlertCircle className="h-4 w-4" /> Expediente marcado previamente como presentado sin evidencia completa. Añade registro y justificante y revisa el estado.</p>}
                    </div>
                    {item.notas && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{item.notas}</p>}
                    {requirements.some(r => r.expediente_id === item.id) && <div className="mt-4 rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">Checklist documental</p><Badge variant="outline">{requirements.filter(r => r.expediente_id === item.id && ["preparado","revisado","no_aplica"].includes(r.estado)).length}/{requirements.filter(r => r.expediente_id === item.id).length} completados</Badge></div>
                      <div className="space-y-3">{requirements.filter(r => r.expediente_id === item.id).map(req => <div key={req.id} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                        <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{req.nombre}{req.obligatorio && <span className="ml-1 text-xs text-red-600">Obligatorio por verificar</span>}</p>{req.notas && <p className="mt-1 text-xs text-slate-500">{req.notas}</p>}{req.archivo_url && <a href={req.archivo_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-emerald-700 hover:underline">Abrir documento adjunto</a>}</div>
                        <div className="space-y-2"><Select value={req.estado || "pendiente"} onValueChange={estado => updateRequirement(req, { estado })}><SelectTrigger className="h-9 rounded-lg"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="localizado">Localizado</SelectItem><SelectItem value="preparado">Preparado</SelectItem><SelectItem value="revisado">Revisado</SelectItem><SelectItem value="no_aplica">No aplica</SelectItem></SelectContent></Select><Select value={req.documento_archivo_id || "sin_documento"} onValueChange={id => { const doc = documents.find(d => d.id === id); updateRequirement(req, id === "sin_documento" ? { documento_archivo_id: "", archivo_url: "", estado: "pendiente" } : { documento_archivo_id: doc.id, archivo_url: doc.archivo_url, fecha_caducidad: doc.fecha_caducidad || "", estado: "localizado" }); }}><SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Vincular archivo"/></SelectTrigger><SelectContent><SelectItem value="sin_documento">Vincular documento del archivo…</SelectItem>{documents.filter(d => d.estado === "vigente" && d.documento_reutilizable !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.titulo} · v{d.version || 1}</SelectItem>)}</SelectContent></Select></div>
                      </div>)}</div>
                    </div>}
                  </div>
                  <div className="w-full shrink-0 lg:w-56">
                    <Label className="mb-1.5 block text-xs text-slate-500">Actualizar estado</Label>
                    <Select value={item.estado || "detectada"} onValueChange={(v) => changeStatus(item, v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{ESTADOS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                    {item.justificante_uri && <a href={item.justificante_uri} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"><FileCheck2 className="h-3.5 w-3.5" /> Abrir justificante</a>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Nuevo expediente de subvención</DialogTitle></DialogHeader>
          <form onSubmit={createCase} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="grant-title">Convocatoria / nombre *</Label><Input id="grant-title" value={form.titulo} onChange={(e) => updateForm("titulo", e.target.value)} required className="mt-1 rounded-xl" placeholder="Ej. Ayudas a asociaciones deportivas" /></div>
              <div><Label htmlFor="grant-entity">Entidad convocante</Label><Input id="grant-entity" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} className="mt-1 rounded-xl" placeholder="Comunidad de Madrid…" /></div>
              <div><Label htmlFor="grant-ref">Orden / referencia</Label><Input id="grant-ref" value={form.referencia} onChange={(e) => updateForm("referencia", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-season">Temporada / ejercicio</Label><Input id="grant-season" value={form.temporada} onChange={(e) => updateForm("temporada", e.target.value)} className="mt-1 rounded-xl" placeholder="2026-2027" /></div>
              <div><Label>Estado inicial</Label><Select value={form.estado} onValueChange={(v) => updateForm("estado", v)}><SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{ESTADOS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="grant-requested">Importe solicitado (€)</Label><Input id="grant-requested" type="number" min="0" step="0.01" value={form.importe_solicitado} onChange={(e) => updateForm("importe_solicitado", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-awarded">Importe concedido (€)</Label><Input id="grant-awarded" type="number" min="0" step="0.01" value={form.importe_concedido} onChange={(e) => updateForm("importe_concedido", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-paid">Importe cobrado (€)</Label><Input id="grant-paid" type="number" min="0" step="0.01" value={form.importe_cobrado} onChange={(e) => updateForm("importe_cobrado", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-deadline">Límite de solicitud</Label><Input id="grant-deadline" type="date" value={form.fecha_limite_solicitud} onChange={(e) => updateForm("fecha_limite_solicitud", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-just-deadline">Límite de justificación</Label><Input id="grant-just-deadline" type="date" value={form.fecha_limite_justificacion} onChange={(e) => updateForm("fecha_limite_justificacion", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div className="sm:col-span-2"><Label htmlFor="grant-url">Enlace oficial</Label><Input id="grant-url" type="url" value={form.url_oficial} onChange={(e) => updateForm("url_oficial", e.target.value)} className="mt-1 rounded-xl" placeholder="https://…" /></div>
              <div><Label htmlFor="grant-reg">N.º de registro (si ya está presentada)</Label><Input id="grant-reg" value={form.numero_registro} onChange={(e) => updateForm("numero_registro", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-proof">Enlace al justificante oficial</Label><Input id="grant-proof" value={form.justificante_uri} onChange={(e) => updateForm("justificante_uri", e.target.value)} className="mt-1 rounded-xl" placeholder="URL o ruta del documento" /></div>
              <div><Label htmlFor="grant-owner">Responsable interno</Label><Input id="grant-owner" value={form.responsable} onChange={(e) => updateForm("responsable", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div className="sm:col-span-2"><Label htmlFor="grant-notes">Notas</Label><Textarea id="grant-notes" value={form.notas} onChange={(e) => updateForm("notas", e.target.value)} className="mt-1 rounded-xl" rows={3} placeholder="Requisitos pendientes, observaciones, documentación que falta…" /></div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-orange-600 hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar expediente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
