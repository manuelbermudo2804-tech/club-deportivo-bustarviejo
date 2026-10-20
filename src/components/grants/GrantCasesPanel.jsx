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
import { FolderKanban, Plus, RefreshCw, CalendarClock, ExternalLink, FileCheck2, Loader2, Save, AlertCircle, FileText, Download } from "lucide-react";
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
  fecha_limite_solicitud: "", fecha_presentacion: "", fecha_resolucion: "", fecha_limite_justificacion: "", url_oficial: "",
  numero_registro: "", justificante_uri: "", notas: "", responsable: "", historial: [],
};

export default function GrantCasesPanel() {
  const [cases, setCases] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseDrafts, setExpenseDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [requirementDrafts, setRequirementDrafts] = useState({});
  const [addingRequirementTo, setAddingRequirementTo] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, reqs, docs, expenseRows] = await Promise.all([
        base44.entities.GrantCase.list("-created_date", 200),
        base44.entities.GrantRequirement.list("-created_date", 500),
        base44.entities.GrantDocument.list("-created_date", 300),
        base44.entities.GrantExpense.list("-created_date", 500),
      ]);
      setCases(Array.isArray(rows) ? rows : []);
      setRequirements(Array.isArray(reqs) ? reqs : []);
      setDocuments(Array.isArray(docs) ? docs : []);
      setExpenses(Array.isArray(expenseRows) ? expenseRows : []);
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
      if (payload.estado === "presentada" && (!(payload.numero_registro || "").trim() || !(payload.justificante_uri || "").trim())) {
        toast.error("Para crear un expediente como presentado debes incluir número de registro y justificante oficial.");
        setSaving(false);
        return;
      }
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

  const addRequirement = async (item) => {
    const draft = requirementDrafts[item.id] || {};
    if (!(draft.nombre || "").trim()) { toast.error("Escribe el nombre del requisito o documento."); return; }
    try {
      await base44.entities.GrantRequirement.create({ expediente_id: item.id, nombre: draft.nombre.trim(), categoria: draft.categoria || "Otros", obligatorio: draft.obligatorio !== false, estado: "pendiente", notas: (draft.notas || "").trim() });
      setRequirementDrafts(prev => ({ ...prev, [item.id]: { nombre: "", categoria: "Otros", obligatorio: true, notas: "" } }));
      setAddingRequirementTo(""); toast.success("Requisito añadido al expediente"); await loadCases();
    } catch (e) { toast.error("No se pudo añadir el requisito"); }
  };

  const addExpense = async (item) => {
    const draft = expenseDrafts[item.id] || {};
    if (!(draft.concepto || "").trim()) { toast.error("Indica el concepto del gasto."); return; }
    const amount = Number(draft.importe);
    if (draft.importe === "" || !Number.isFinite(amount) || amount < 0) { toast.error("Introduce un importe válido, igual o superior a cero."); return; }
    try {
      await base44.entities.GrantExpense.create({
        expediente_id: item.id, concepto: draft.concepto.trim(), importe: amount, estado: "pendiente",
        ...(draft.proveedor?.trim() ? { proveedor: draft.proveedor.trim() } : {}),
        ...(draft.numero_factura?.trim() ? { numero_factura: draft.numero_factura.trim() } : {}),
        ...(draft.fecha_factura ? { fecha_factura: draft.fecha_factura } : {}),
        ...(draft.categoria ? { categoria: draft.categoria } : {}),
        ...(draft.factura_url?.trim() ? { factura_url: draft.factura_url.trim() } : {}),
        ...(draft.fecha_pago ? { fecha_pago: draft.fecha_pago } : {}),
        ...(draft.referencia_pago?.trim() ? { referencia_pago: draft.referencia_pago.trim() } : {}),
        ...(draft.notas?.trim() ? { notas: draft.notas.trim() } : {}),
      });
      setExpenseDrafts(prev => ({ ...prev, [item.id]: { concepto: "", proveedor: "", numero_factura: "", fecha_factura: "", importe: "", categoria: "Otros", factura_url: "", fecha_pago: "", referencia_pago: "", notas: "" } }));
      toast.success("Gasto vinculado al expediente");
      await loadCases();
    } catch (e) { toast.error("No se pudo guardar el gasto"); }
  };

  const updateExpense = async (expense, patch) => {
    try {
      await base44.entities.GrantExpense.update(expense.id, patch);
      toast.success("Gasto actualizado");
      await loadCases();
    } catch (e) { toast.error("No se pudo actualizar el gasto"); }
  };

  const saveEvidence = async (item, patch) => {
    try {
      const labels = {
        numero_registro: "número de registro",
        justificante_uri: "justificante oficial",
        fecha_presentacion: "fecha de presentación",
        fecha_resolucion: "fecha de resolución",
        importe_solicitado: "importe solicitado",
        importe_concedido: "importe concedido",
        importe_cobrado: "importe cobrado",
      };
      const changed = Object.keys(patch).map(key => labels[key] || key.replaceAll("_", " "));
      const now = new Date().toISOString();
      const payload = {
        ...patch,
        historial: [
          ...(Array.isArray(item.historial) ? item.historial : []),
          { fecha: now, accion: "Actualización de expediente", detalle: "Actualizado: " + changed.join(", ") + "." },
        ],
      };
      await base44.entities.GrantCase.update(item.id, payload);
      toast.success("Expediente actualizado");
      await loadCases();
    } catch (e) { toast.error("No se pudo guardar la actualización"); }
  };

  const changeStatus = async (item, estado) => {
    if (estado === "presentada" && (!(item.numero_registro || "").trim() || !(item.justificante_uri || "").trim())) {
      toast.error("No se puede marcar como presentada sin número de registro y justificante oficial.");
      return;
    }
    if (estado === "presentada") {
      const pendingMandatory = requirements.filter(req => req.expediente_id === item.id && req.obligatorio !== false && !["revisado", "no_aplica"].includes(req.estado));
      if (pendingMandatory.length > 0) {
        toast.error("Revisa los " + pendingMandatory.length + " requisitos obligatorios pendientes antes de presentar el expediente.");
        return;
      }
    }
    try {
      const now = new Date().toISOString();
      const patch = { estado, historial: [...(Array.isArray(item.historial) ? item.historial : []), { fecha: now, accion: "Cambio de estado", detalle: estadoLabel(estado) }] };
      if (estado === "presentada" && !item.fecha_presentacion) patch.fecha_presentacion = now.slice(0, 10);
      if (["concedida", "denegada"].includes(estado) && !item.fecha_resolucion) patch.fecha_resolucion = now.slice(0, 10);
      await base44.entities.GrantCase.update(item.id, patch);
      toast.success("Estado actualizado");
      await loadCases();
    } catch (e) {
      toast.error("No se pudo actualizar el estado");
    }
  };

  const openDraft = (item) => {
    const itemRequirements = requirements.filter(req => req.expediente_id === item.id);
    const lines = [
      "BORRADOR DE TRABAJO — SUBVENCIÓN",
      "Documento orientativo generado desde el gestor del C.D. Bustarviejo.",
      "IMPORTANTE: no es un formulario oficial. Contrastar con las bases, completar los campos y revisar antes de firmar o presentar.",
      "",
      "1. DATOS DE LA CONVOCATORIA",
      "Convocatoria: " + (item.titulo || "Pendiente"),
      "Entidad convocante: " + (item.entidad || "Pendiente"),
      "Referencia: " + (item.referencia || "Pendiente"),
      "Temporada/ejercicio: " + (item.temporada || "Pendiente"),
      "Enlace oficial: " + (item.url_oficial || "Pendiente de incorporar"),
      "Estado interno: " + estadoLabel(item.estado),
      "",
      "2. DATOS ECONÓMICOS",
      "Importe solicitado: " + money(item.importe_solicitado),
      "Importe concedido: " + money(item.importe_concedido),
      "Importe cobrado: " + money(item.importe_cobrado),
      "Pendiente de cobro: " + (item.importe_concedido != null && item.importe_concedido !== "" ? money(Math.max(0, Number(item.importe_concedido) - (Number(item.importe_cobrado) || 0))) : "Pendiente de calcular"),
      "",
      "3. FECHAS Y PRESENTACIÓN",
      "Límite de solicitud: " + (item.fecha_limite_solicitud || "Pendiente"),
      "Fecha de presentación: " + (item.fecha_presentacion || "Pendiente"),
      "Fecha de resolución: " + (item.fecha_resolucion || "Pendiente"),
      "Límite de justificación: " + (item.fecha_limite_justificacion || "Pendiente"),
      "Número de registro: " + (item.numero_registro || "Pendiente"),
      "Justificante oficial: " + (item.justificante_uri || "Pendiente"),
      "",
      "4. CHECKLIST DOCUMENTAL",
      ...(itemRequirements.length ? itemRequirements.map(req => "- [" + (["revisado", "no_aplica"].includes(req.estado) ? "x" : " ") + "] " + req.nombre + " — " + (req.estado || "pendiente") + (req.obligatorio === false ? " (no obligatorio)" : " (obligatorio)")) : ["- No se han registrado requisitos para este expediente. Revisar las bases oficiales."]),
      "",
      "5. MEMORIA / PROYECTO DE ACTUACIÓN (COMPLETAR Y ADAPTAR A LAS BASES)",
      "Entidad solicitante y trayectoria:",
      "[Completar]",
      "",
      "Objetivos y necesidad del proyecto:",
      "[Completar]",
      "",
      "Actividades, calendario y personas destinatarias:",
      "[Completar]",
      "",
      "Resultados e indicadores de evaluación:",
      "[Completar]",
      "",
      "Presupuesto detallado y financiación:",
      "[Completar con importes contrastados y documentación justificativa]",
      "",
      "6. REVISIÓN FINAL",
      "- Confirmar requisitos, elegibilidad, plazos y formato exigidos en las bases.",
      "- Verificar que los importes coinciden con presupuesto, facturas y justificantes.",
      "- Revisar anexos, firmas y certificados vigentes.",
      "- No presentar hasta que una persona responsable haya validado el contenido.",
      "",
      "Responsable interno: " + (item.responsable || "Pendiente de asignar"),
      "Notas del expediente: " + (item.notas || "Sin notas registradas"),
    ];
    setDraftTitle("Borrador - " + (item.titulo || "subvencion"));
    setDraftText(lines.join("\n"));
    setDraftOpen(true);
  };

  const downloadDraft = () => {
    const blob = new Blob([draftText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (draftTitle || "borrador-subvencion").replace(/[^a-z0-9áéíóúñü_-]+/gi, "-") + ".txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
                      <div className="rounded-lg bg-slate-50 p-2.5"><Label className="block text-xs text-slate-500">Solicitado (€)</Label><Input type="number" min="0" step="0.01" className="mt-1 h-9 bg-white" defaultValue={item.importe_solicitado ?? ""} onBlur={e => { const value = e.target.value === "" ? undefined : Number(e.target.value); if (value !== item.importe_solicitado && (value === undefined || Number.isFinite(value) && value >= 0)) saveEvidence(item, { importe_solicitado: value }); }} /></div>
                      <div className="rounded-lg bg-slate-50 p-2.5"><Label className="block text-xs text-slate-500">Concedido (€)</Label><Input type="number" min="0" step="0.01" className="mt-1 h-9 bg-white" defaultValue={item.importe_concedido ?? ""} onBlur={e => { const value = e.target.value === "" ? undefined : Number(e.target.value); if (value !== item.importe_concedido && (value === undefined || Number.isFinite(value) && value >= 0)) saveEvidence(item, { importe_concedido: value }); }} /></div>
                      <div className="rounded-lg bg-slate-50 p-2.5"><Label className="block text-xs text-slate-500">Cobrado (€)</Label><Input type="number" min="0" step="0.01" className="mt-1 h-9 bg-white" defaultValue={item.importe_cobrado ?? ""} onBlur={e => { const value = e.target.value === "" ? undefined : Number(e.target.value); if (value !== item.importe_cobrado && (value === undefined || Number.isFinite(value) && value >= 0)) saveEvidence(item, { importe_cobrado: value }); }} /></div>
                      {Number.isFinite(Number(item.importe_concedido)) && item.importe_concedido !== "" && <p className="sm:col-span-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-slate-700">Pendiente de cobro: <strong>{money(Math.max(0, Number(item.importe_concedido) - (Number(item.importe_cobrado) || 0)))}</strong>{Number(item.importe_cobrado) > Number(item.importe_concedido) && <span className="ml-2 text-amber-800">Revisa los importes: lo cobrado supera lo concedido.</span>}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {item.fecha_limite_solicitud && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Límite solicitud: {item.fecha_limite_solicitud}</span>}
                      {item.fecha_limite_justificacion && <span className="inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Límite justificación: {item.fecha_limite_justificacion}</span>}
                      {item.fecha_presentacion && <span className="inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Presentada: {item.fecha_presentacion}</span>}
                      {item.fecha_resolucion && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Resolución: {item.fecha_resolucion}</span>}
                      {item.numero_registro && <span className="inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Registro: {item.numero_registro}</span>}
                      {item.url_oficial && <a href={item.url_oficial} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Convocatoria oficial</a>}
                    </div>
                    <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                      <div><Label className="text-xs">Número de registro oficial</Label><Input className="mt-1 h-9" defaultValue={item.numero_registro || ""} onBlur={e => { if (e.target.value !== (item.numero_registro || "")) saveEvidence(item, { numero_registro: e.target.value }); }} placeholder="REGAGE…"/></div>
                      <div><Label className="text-xs">URL del justificante oficial</Label><Input className="mt-1 h-9" defaultValue={item.justificante_uri || ""} onBlur={e => { if (e.target.value !== (item.justificante_uri || "")) saveEvidence(item, { justificante_uri: e.target.value }); }} placeholder="Enlace al PDF de registro"/></div>
                      <div><Label className="text-xs">Fecha de presentación</Label><Input type="date" className="mt-1 h-9" defaultValue={item.fecha_presentacion || ""} onBlur={e => { if (e.target.value !== (item.fecha_presentacion || "")) saveEvidence(item, { fecha_presentacion: e.target.value }); }}/></div>
                      <div><Label className="text-xs">Fecha de resolución</Label><Input type="date" className="mt-1 h-9" defaultValue={item.fecha_resolucion || ""} onBlur={e => { if (e.target.value !== (item.fecha_resolucion || "")) saveEvidence(item, { fecha_resolucion: e.target.value }); }}/></div>
                      {item.estado === "presentada" && (!item.justificante_uri || !item.numero_registro) && <p className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-red-700"><AlertCircle className="h-4 w-4" /> Expediente marcado previamente como presentado sin evidencia completa. Añade registro y justificante y revisa el estado.</p>}
                    </div>
                    <div className="mt-3">
                      {addingRequirementTo === item.id ? (
                        <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                          <Label>Nuevo requisito o documento</Label>
                          <Input value={requirementDrafts[item.id]?.nombre || ""} onChange={e => setRequirementDrafts(prev => ({ ...prev, [item.id]: { categoria: "Otros", obligatorio: true, ...(prev[item.id] || {}), nombre: e.target.value } }))} placeholder="Ej. Certificado de Hacienda vigente" />
                          <Select value={requirementDrafts[item.id]?.categoria || "Otros"} onValueChange={v => setRequirementDrafts(prev => ({ ...prev, [item.id]: { obligatorio: true, ...(prev[item.id] || {}), categoria: v } }))}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                          <Textarea value={requirementDrafts[item.id]?.notas || ""} onChange={e => setRequirementDrafts(prev => ({ ...prev, [item.id]: { obligatorio: true, ...(prev[item.id] || {}), notas: e.target.value } }))} rows={2} placeholder="Notas o apartado de las bases (opcional)" />
                          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => addRequirement(item)} className="rounded-lg bg-orange-600 hover:bg-orange-700"><Save className="mr-1 h-4 w-4" /> Guardar requisito</Button><Button size="sm" variant="outline" onClick={() => setAddingRequirementTo("")} className="rounded-lg">Cancelar</Button></div>
                        </div>
                      ) : <Button size="sm" variant="outline" onClick={() => setAddingRequirementTo(item.id)} className="rounded-lg"><Plus className="mr-1 h-4 w-4" /> Añadir requisito</Button>}
                    </div>
                    <section className="mt-4 space-y-3 rounded-xl border border-orange-200 bg-orange-50/30 p-3">
                      {(() => {
                        const itemExpenses = expenses.filter(exp => exp.expediente_id === item.id);
                        const total = itemExpenses.reduce((sum, exp) => sum + (Number(exp.importe) || 0), 0);
                        const reviewedTotal = itemExpenses.filter(exp => ["revisado", "aceptado"].includes(exp.estado)).reduce((sum, exp) => sum + (Number(exp.importe) || 0), 0);
                        const draft = expenseDrafts[item.id] || { concepto: "", proveedor: "", numero_factura: "", fecha_factura: "", importe: "", categoria: "Otros", factura_url: "", fecha_pago: "", referencia_pago: "", notas: "" };
                        const setDraft = (key, value) => setExpenseDrafts(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { concepto: "", proveedor: "", numero_factura: "", fecha_factura: "", importe: "", categoria: "Otros", factura_url: "", fecha_pago: "", referencia_pago: "", notas: "" }), [key]: value } }));
                        return <>
                          <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-slate-900">Justificación económica</h4><p className="text-xs text-slate-500">Gastos vinculados solo a este expediente; registra factura y evidencia de pago.</p></div><Badge variant="outline">{itemExpenses.length} gastos</Badge></div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-lg bg-white p-2"><Label className="text-xs text-slate-500">Total registrado</Label><p className="mt-1 font-bold">{money(total)}</p></div><div className="rounded-lg bg-white p-2"><Label className="text-xs text-slate-500">Revisado / aceptado internamente</Label><p className="mt-1 font-bold">{money(reviewedTotal)}</p></div><div className="rounded-lg bg-white p-2"><Label className="text-xs text-slate-500">Concedido</Label><p className="mt-1 font-bold">{money(item.importe_concedido)}</p></div></div>
                          {item.importe_concedido != null && Number(item.importe_concedido) > 0 && <p className="text-xs text-slate-600">Gasto registrado: {Math.round(total / Number(item.importe_concedido) * 100)}% del importe concedido. Este cálculo no confirma la elegibilidad del gasto.</p>}
                          {itemExpenses.length > 0 && <div className="space-y-2">{itemExpenses.map(exp => <div key={exp.id} className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{exp.concepto} <span className="whitespace-nowrap">{money(exp.importe)}</span></p><p className="mt-1 break-words text-xs text-slate-500">{[exp.proveedor, exp.numero_factura ? "Factura " + exp.numero_factura : "", exp.fecha_factura].filter(Boolean).join(" · ") || "Sin proveedor, número ni fecha de factura"}</p>{exp.fecha_pago && <p className="mt-1 text-xs text-slate-500">Pago: {exp.fecha_pago}{exp.referencia_pago ? " · " + exp.referencia_pago : ""}</p>}{exp.factura_url && <a href={exp.factura_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:underline"><ExternalLink className="h-3 w-3" /> Abrir factura / evidencia</a>}{exp.notas && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{exp.notas}</p>}</div><Select value={exp.estado || "pendiente"} onValueChange={estado => updateExpense(exp, { estado })}><SelectTrigger className="h-8 w-full rounded-lg sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="revisado">Revisado internamente</SelectItem><SelectItem value="aceptado">Aceptado internamente</SelectItem><SelectItem value="rechazado">Rechazado</SelectItem></SelectContent></Select></div></div>)}</div>}
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3"><p className="mb-2 text-sm font-semibold">Añadir gasto / factura</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2"><Label className="text-xs">Concepto *</Label><Input value={draft.concepto} onChange={e => setDraft("concepto", e.target.value)} className="mt-1 h-9" placeholder="Ej. Material deportivo para actividad subvencionada" /></div>
                            <div><Label className="text-xs">Proveedor</Label><Input value={draft.proveedor} onChange={e => setDraft("proveedor", e.target.value)} className="mt-1 h-9" /></div><div><Label className="text-xs">Número de factura</Label><Input value={draft.numero_factura} onChange={e => setDraft("numero_factura", e.target.value)} className="mt-1 h-9" /></div>
                            <div><Label className="text-xs">Fecha factura</Label><Input type="date" value={draft.fecha_factura} onChange={e => setDraft("fecha_factura", e.target.value)} className="mt-1 h-9" /></div><div><Label className="text-xs">Importe (€) *</Label><Input type="number" min="0" step="0.01" value={draft.importe} onChange={e => setDraft("importe", e.target.value)} className="mt-1 h-9" /></div>
                            <div><Label className="text-xs">Categoría</Label><Select value={draft.categoria || "Otros"} onValueChange={v => setDraft("categoria", v)}><SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger><SelectContent>{["Personal y servicios", "Material deportivo", "Instalaciones", "Transporte", "Seguros", "Organización de actividades", "Otros"].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-xs">Fecha de pago</Label><Input type="date" value={draft.fecha_pago} onChange={e => setDraft("fecha_pago", e.target.value)} className="mt-1 h-9" /></div>
                            <div className="sm:col-span-2"><Label className="text-xs">URL de factura o archivo del documento</Label><Input value={draft.factura_url} onChange={e => setDraft("factura_url", e.target.value)} className="mt-1 h-9" placeholder="Enlace al documento del archivo común" /></div><div className="sm:col-span-2"><Label className="text-xs">Referencia de pago</Label><Input value={draft.referencia_pago} onChange={e => setDraft("referencia_pago", e.target.value)} className="mt-1 h-9" placeholder="Transferencia, recibo o referencia bancaria" /></div><div className="sm:col-span-2"><Label className="text-xs">Notas</Label><Textarea value={draft.notas} onChange={e => setDraft("notas", e.target.value)} rows={2} placeholder="Observaciones internas" /></div>
                          </div><Button type="button" size="sm" onClick={() => addExpense(item)} className="mt-3 rounded-lg bg-orange-600 hover:bg-orange-700"><Plus className="mr-1 h-4 w-4" /> Guardar gasto en este expediente</Button></div>
                          <p className="text-xs text-slate-500">La clasificación y el estado son controles internos, no una confirmación oficial de gasto subvencionable. Contrastar siempre con las bases y conservar factura y justificante de pago.</p>
                        </>;
                      })()}
                    </section>
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
                    <Button type="button" variant="outline" onClick={() => openDraft(item)} className="mb-3 w-full rounded-xl"><FileText className="mr-2 h-4 w-4" /> Generar borrador</Button>
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

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Generador de borrador de subvención</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-800">Documento de trabajo, no oficial. Revisa las bases de la convocatoria y completa los apartados antes de utilizarlo.</p>
          <div className="space-y-2"><Label>Título del archivo</Label><Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Contenido editable</Label><Textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={18} className="font-mono text-sm" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDraftOpen(false)} className="rounded-xl">Cerrar</Button><Button type="button" onClick={downloadDraft} className="rounded-xl bg-orange-600 hover:bg-orange-700"><Download className="mr-2 h-4 w-4" /> Descargar borrador (.txt)</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div><Label htmlFor="grant-submitted-date">Fecha de presentación</Label><Input id="grant-submitted-date" type="date" value={form.fecha_presentacion} onChange={(e) => updateForm("fecha_presentacion", e.target.value)} className="mt-1 rounded-xl" /></div>
              <div><Label htmlFor="grant-resolution-date">Fecha de resolución</Label><Input id="grant-resolution-date" type="date" value={form.fecha_resolucion} onChange={(e) => updateForm("fecha_resolucion", e.target.value)} className="mt-1 rounded-xl" /></div>
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
