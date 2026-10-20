import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Archive, CheckCircle2, Clock, ExternalLink, FileText, Loader2, RefreshCw, Search, Sparkles, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = ["Identidad del club","Representación","Fiscal y Seguridad Social","Estatutos y normativa","Deportivo y licencias","Presupuestos y cuentas","Memorias y proyectos","Facturas y pagos","Certificados","Resoluciones y registros","Otros"];
const ESTADOS_DOC = ["vigente","por_revisar","caducado","sustituido"];
const decisionMeta = {
  PRESENTAR: { label: "PRESENTAR", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  REVISAR: { label: "REVISAR ANTES DE DECIDIR", cls: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  NO_PRESENTAR: { label: "NO PRESENTAR", cls: "bg-slate-200 text-slate-700", icon: XCircle },
};
const safeParse = (s) => { try { return JSON.parse(s || "null"); } catch { return null; } };

export default function GrantCommandCenter({ alerts = [], onChanged }) {
  const [docs, setDocs] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [uploading, setUploading] = useState(false);
  const [analysingId, setAnalysingId] = useState("");
  const [analysingAll, setAnalysingAll] = useState(false);
  const [replacingId, setReplacingId] = useState("nuevo");
  const fileRef = useRef(null);
  const [form, setForm] = useState({ titulo: "", categoria: "Identidad del club", entidad_emisora: "", fecha_documento: "", fecha_caducidad: "", temporada: "", notas: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a, c] = await Promise.all([
        base44.entities.GrantDocument.list("-created_date", 300),
        base44.entities.GrantAssessment.list("-created_date", 300),
        base44.entities.GrantCase.list("-created_date", 300),
      ]);
      setDocs(d || []);
      setAssessments(a || []);
      setCases(c || []);
    } catch (e) { toast.error("No se pudo cargar el archivo y las recomendaciones"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filteredDocs = useMemo(() => docs.filter(d => {
    const q = search.trim().toLowerCase();
    return (!q || [d.titulo,d.nombre_archivo,d.entidad_emisora,d.temporada,d.notas].some(v => String(v || "").toLowerCase().includes(q)))
      && (categoryFilter === "todas" || d.categoria === categoryFilter);
  }), [docs, search, categoryFilter]);

  const updateForm = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const analysePending = async () => {
    const pending = recomendables.filter(a => !assessmentsByAlert[a.id]);
    if (!pending.length) { toast.success("Todas las oportunidades visibles ya tienen análisis"); return; }
    setAnalysingAll(true);
    let ok = 0, failed = 0;
    try {
      for (const alert of pending) {
        try {
          const res = await base44.functions.invoke("analyzeGrantBases", { alertId: alert.id });
          if (res.data?.success) ok++; else failed++;
        } catch { failed++; }
      }
      await load();
      onChanged?.();
      toast.success("Análisis finalizado: " + ok + " correctos" + (failed ? ", " + failed + " con error" : ""));
    } finally { setAnalysingAll(false); }
  };

  const createCase = async (alert, assessment) => {
    if (cases.some(c => c.fuente_alerta_id === alert.id)) { toast.info("Ya existe un expediente de trabajo para esta convocatoria"); return; }
    try {
      const newCase = await base44.entities.GrantCase.create({
        titulo: alert.titulo, entidad: alert.categoria || alert.fuente_nombre || "",
        referencia: alert.guid || "", estado: "preparando", fecha_limite_solicitud: assessment.fecha_limite || alert.fecha_limite || undefined,
        url_oficial: alert.enlace || "", fuente_alerta_id: alert.id, requiere_revision: true,
        notas: "Expediente creado desde el motor de decisión. Recomendación: " + assessment.decision + ". Siguiente acción: " + (assessment.siguiente_accion || "revisar bases") + ". No marcar como presentada sin justificante oficial.",
        historial: [{ fecha: new Date().toISOString(), accion: "Expediente creado", detalle: "Creado desde la recomendación automática " + assessment.decision + ". Pendiente de revisión humana." }],
      });
      const requiredDocs = Array.isArray(assessment.documentos_pendientes) ? assessment.documentos_pendientes : [];
      if (newCase?.id && requiredDocs.length) {
        await Promise.all(requiredDocs.map(nombre => base44.entities.GrantRequirement.create({
          expediente_id: newCase.id, alert_id: alert.id, nombre, estado: "pendiente", obligatorio: true,
          evidencia_oficial_url: alert.enlace || "", notas: "Generado desde el análisis de bases. Confirmar si es obligatorio y si existe un documento vigente en el archivo común.",
        })));
      }
      await load();
      toast.success("Expediente de trabajo creado. Sigue pendiente de preparación y revisión.");
    } catch (e) { toast.error("No se pudo crear el expediente: " + (e.message || "error")); }
  };

  const markReviewed = async (assessment, reviewed) => {
    try {
      await base44.entities.GrantAssessment.update(assessment.id, { revisado_humano: reviewed });
      await load();
      toast.success(reviewed ? "Revisión humana registrada" : "Revisión humana retirada");
    } catch { toast.error("No se pudo guardar la revisión"); }
  };

  const saveDocument = async (file) => {
    if (!file) return;
    if (!form.titulo.trim()) { toast.error("Pon un nombre al documento antes de subirlo"); return; }
    setUploading(true);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (!uploaded?.file_url) throw new Error("No se recibió la URL del archivo");
      const previous = replacingId !== "nuevo" ? docs.find(d => d.id === replacingId) : null;
      const versionHistory = previous ? [...(previous.historial_versiones || []), {
        version: previous.version || 1, archivo_url: previous.archivo_url, nombre_archivo: previous.nombre_archivo,
        fecha: new Date().toISOString(), notas: "Versión anterior conservada automáticamente",
      }] : [];
      if (previous) await base44.entities.GrantDocument.update(previous.id, { estado: "sustituido" });
      await base44.entities.GrantDocument.create({
        ...form, archivo_url: uploaded.file_url, nombre_archivo: file.name, tipo_mime: file.type || "",
        version: previous ? (Number(previous.version || 1) + 1) : 1,
        estado: form.fecha_caducidad && form.fecha_caducidad < new Date().toISOString().slice(0,10) ? "caducado" : (form.fecha_caducidad ? "vigente" : "por_revisar"),
        documento_reutilizable: true, expediente_ids: previous?.expediente_ids || [],
        historial_versiones: versionHistory, sustituye_documento_id: previous?.id || "",
      });
      toast.success("Documento archivado y disponible para reutilizar");
      setForm({ titulo: "", categoria: "Identidad del club", entidad_emisora: "", fecha_documento: "", fecha_caducidad: "", temporada: "", notas: "" });
      setReplacingId("nuevo");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) { toast.error("No se pudo guardar el documento: " + (e.message || "error")); }
    finally { setUploading(false); }
  };

  const markDocState = async (doc, estado) => {
    try { await base44.entities.GrantDocument.update(doc.id, { estado }); await load(); }
    catch { toast.error("No se pudo actualizar el documento"); }
  };

  const analyse = async (alert) => {
    setAnalysingId(alert.id);
    try {
      const res = await base44.functions.invoke("analyzeGrantBases", { alertId: alert.id });
      if (!res.data?.success) throw new Error(res.data?.error || "No se pudo analizar");
      toast.success("Análisis terminado. Revisa la decisión y los requisitos.");
      await load();
      onChanged?.();
    } catch (e) { toast.error(e.message || "Error al analizar"); }
    finally { setAnalysingId(""); }
  };

  // Las evaluaciones llegan ordenadas por fecha descendente: conservar siempre la más reciente por alerta.
  const assessmentsByAlert = useMemo(() => assessments.reduce((acc, item) => {
    if (item.alert_id && !acc[item.alert_id]) acc[item.alert_id] = item;
    return acc;
  }, {}), [assessments]);
  const recomendables = alerts.filter(a => !["descartada","solicitada"].includes(a.estado));
  const todayISO = new Date().toISOString().slice(0, 10);
  const effectiveDecision = (alert) => {
    const assessment = assessmentsByAlert[alert.id];
    const deadline = assessment?.fecha_limite || alert.fecha_limite;
    // Un plazo vencido nunca debe mostrarse como recomendación de presentar una solicitud nueva.
    if (deadline && deadline < todayISO) return "NO_PRESENTAR";
    return assessment?.decision || "REVISAR";
  };
  const sortedRecomendables = useMemo(() => [...recomendables].sort((a,b) => {
    const rank = (item) => { const d = effectiveDecision(item); return d === "PRESENTAR" ? 0 : d === "REVISAR" ? 1 : d === "NO_PRESENTAR" ? 3 : 2; };
    return rank(a) - rank(b) || ((a.fecha_limite || "9999-12-31").localeCompare(b.fecha_limite || "9999-12-31"));
  }), [recomendables, assessmentsByAlert]);
  const pendientes = docs.filter(d => d.estado === "por_revisar" || d.estado === "caducado").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-slate-500">Oportunidades detectadas</p><p className="mt-1 text-2xl font-bold">{recomendables.length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-slate-500">Recomendadas para presentar</p><p className="mt-1 text-2xl font-bold text-emerald-700">{recomendables.filter(a => effectiveDecision(a) === "PRESENTAR").length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-slate-500">Pendientes de comprobar</p><p className="mt-1 text-2xl font-bold text-amber-700">{recomendables.filter(a => effectiveDecision(a) === "REVISAR").length + recomendables.filter(a => !assessmentsByAlert[a.id]).length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-slate-500">Documentos por revisar/caducados</p><p className="mt-1 text-2xl font-bold">{pendientes}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="decisiones">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="decisiones" className="rounded-lg">Qué subvenciones presentar</TabsTrigger>
          <TabsTrigger value="archivo" className="rounded-lg">Archivo documental</TabsTrigger>
        </TabsList>
        <TabsContent value="decisiones" className="space-y-3 pt-3">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="font-semibold text-slate-900">Motor de decisión del club</p>
            <p className="mt-1 text-sm text-slate-600">Analiza las bases, la elegibilidad, el plazo y la documentación. Cuando falte evidencia no marcará una ayuda como segura: explicará qué dato bloquea la decisión.</p>
            <Button onClick={analysePending} disabled={analysingAll || loading || recomendables.every(a => assessmentsByAlert[a.id])} className="mt-3 rounded-xl bg-orange-600 hover:bg-orange-700">
              {analysingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
              {analysingAll ? "Analizando oportunidades…" : "Analizar todas las oportunidades pendientes"}
            </Button>
          </div>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div> :
            recomendables.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No hay oportunidades pendientes. Pulsa «Revisar ahora» en la pestaña de subvenciones para detectar nuevas convocatorias.</div> :
            sortedRecomendables.map(alert => {
              const assessment = assessmentsByAlert[alert.id];
              const deadline = assessment?.fecha_limite || alert.fecha_limite;
              const decision = effectiveDecision(alert);
              const meta = decisionMeta[decision] || decisionMeta.REVISAR;
              const Icon = meta.icon;
              const days = deadline ? Math.ceil((new Date(deadline + "T23:59:59") - new Date()) / 86400000) : null;
              const analysis = safeParse(alert.analisis_ia);
              return <Card key={alert.id} className="rounded-2xl border-slate-200">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><h3 className="font-semibold text-slate-900">{alert.titulo}</h3><p className="mt-1 text-xs text-slate-500">{alert.fuente_nombre || alert.categoria || "Fuente pendiente de verificar"}{alert.fecha_limite ? " · Cierre: " + alert.fecha_limite : " · Sin fecha límite confirmada"}</p></div>
                    <Badge className={meta.cls}><Icon className="mr-1 h-3.5 w-3.5"/>{meta.label}</Badge>
                  </div>
                  {assessment ? <>
                    {assessment.motivos?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{assessment.motivos.map((m,i)=><li key={i}>{m}</li>)}</ul>}
                    {assessment.dudas_criticas?.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Bloqueos por resolver:</strong><ul className="mt-1 list-disc pl-5">{assessment.dudas_criticas.map((m,i)=><li key={i}>{m}</li>)}</ul></div>}
                    {assessment.siguiente_accion && <p className="text-sm"><strong>Siguiente acción:</strong> {assessment.siguiente_accion}</p>}
                    {deadline && <p className="text-xs text-slate-500">Fecha límite evaluada: {deadline}</p>}
                    {days !== null && days < 0 && <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700"><strong>Plazo vencido.</strong> No preparar una solicitud nueva con esta fecha. Comprobar si existe una nueva edición, ampliación oficial o un trámite de recurso independiente.</div>}
                    {assessment.fuente_evidencias?.length > 0 && <div className="space-y-1 text-xs text-slate-500">{assessment.fuente_evidencias.map((ev,i)=><p key={i}>Fuente: {ev.documento}{ev.apartado ? " · " + ev.apartado : ""}{ev.url ? <> · <a className="text-blue-600 underline" href={ev.url} target="_blank" rel="noreferrer">abrir evidencia</a></> : ""}</p>)}</div>}
                    {!assessment.revisado_humano && <p className="text-xs text-amber-700">Recomendación automática pendiente de validación humana.</p>}
                    <Button variant="outline" size="sm" onClick={() => markReviewed(assessment, !assessment.revisado_humano)} className="rounded-lg">
                      {assessment.revisado_humano ? "Quitar marca de revisión" : "Marcar como revisada por la junta"}
                    </Button>
                  </> : <>
                    {alert.resumen && <p className="text-sm text-slate-600">{alert.resumen}</p>}
                    <p className="text-sm text-amber-800">{days !== null && days < 0 ? "El plazo indicado parece cerrado; comprobar si hay ampliación o nueva convocatoria." : "Todavía no hay análisis suficiente para recomendar presentarla con seguridad."}</p>
                    {analysis?.resumen && <p className="text-sm text-slate-600">{analysis.resumen}</p>}
                  </>}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => analyse(alert)} disabled={analysingId === alert.id} className="rounded-xl bg-orange-600 hover:bg-orange-700">
                      {analysingId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                      {assessment ? "Actualizar análisis y decisión" : "Analizar y decidir"}
                    </Button>
                    {assessment && <Button variant="outline" onClick={() => createCase(alert, assessment)} className="rounded-xl" disabled={cases.some(c => c.fuente_alerta_id === alert.id)}><Archive className="mr-2 h-4 w-4"/>{cases.some(c => c.fuente_alerta_id === alert.id) ? "Expediente creado" : "Crear expediente de trabajo"}</Button>}
                    {alert.enlace && <a href={alert.enlace} target="_blank" rel="noreferrer"><Button variant="outline" className="rounded-xl"><ExternalLink className="mr-2 h-4 w-4"/>Bases oficiales</Button></a>}
                    {days !== null && days >= 0 && days <= 7 && <Badge className="bg-red-100 text-red-700"><Clock className="mr-1 h-3 w-3"/>{days === 0 ? "Cierra hoy" : days + " días restantes"}</Badge>}
                    {days !== null && days < 0 && <Badge variant="outline" className="border-slate-300 text-slate-600">Plazo vencido</Badge>}
                  </div>
                </CardContent>
              </Card>;
            })}
        </TabsContent>

        <TabsContent value="archivo" className="space-y-4 pt-3">
          <Card className="rounded-2xl"><CardContent className="space-y-4 p-4">
            <div><h3 className="flex items-center gap-2 font-semibold"><Archive className="h-5 w-5 text-orange-600"/>Añadir documento al archivo común</h3><p className="mt-1 text-sm text-slate-500">Guarda cada documento una vez y reutilízalo en expedientes. Las nuevas versiones se añadirán sin borrar silenciosamente las anteriores.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Nombre del documento *</Label><Input className="mt-1" value={form.titulo} onChange={e=>updateForm("titulo",e.target.value)} placeholder="Certificado de estar al corriente con Hacienda"/></div>
              <div><Label>Versión de documento existente (opcional)</Label><Select value={replacingId} onValueChange={setReplacingId}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="nuevo">Documento nuevo</SelectItem>{docs.filter(d => d.estado !== "sustituido").map(d=><SelectItem key={d.id} value={d.id}>{d.titulo} · v{d.version || 1}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Categoría</Label><Select value={form.categoria} onValueChange={v=>updateForm("categoria",v)}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{CATEGORIAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Entidad emisora</Label><Input className="mt-1" value={form.entidad_emisora} onChange={e=>updateForm("entidad_emisora",e.target.value)} placeholder="AEAT, Seguridad Social, RFFM…"/></div>
              <div><Label>Temporada / ejercicio</Label><Input className="mt-1" value={form.temporada} onChange={e=>updateForm("temporada",e.target.value)} placeholder="2025-2026"/></div>
              <div><Label>Fecha del documento</Label><Input className="mt-1" type="date" value={form.fecha_documento} onChange={e=>updateForm("fecha_documento",e.target.value)}/></div>
              <div><Label>Fecha de caducidad</Label><Input className="mt-1" type="date" value={form.fecha_caducidad} onChange={e=>updateForm("fecha_caducidad",e.target.value)}/></div>
              <div className="sm:col-span-2"><Label>Notas</Label><Textarea className="mt-1" rows={2} value={form.notas} onChange={e=>updateForm("notas",e.target.value)} placeholder="Observaciones, organismo que lo solicita, limitaciones…"/></div>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={e=>saveDocument(e.target.files?.[0])} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"/>
            <Button disabled={uploading || !form.titulo.trim()} onClick={()=>fileRef.current?.click()} className="rounded-xl bg-orange-600 hover:bg-orange-700">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}{uploading ? "Subiendo y archivando…" : "Seleccionar archivo y guardar"}</Button>
          </CardContent></Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar documento, entidad o temporada…"/></div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="sm:w-64"><SelectValue placeholder="Todas las categorías"/></SelectTrigger><SelectContent><SelectItem value="todas">Todas las categorías</SelectItem>{CATEGORIAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>

          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-600"/></div> : filteredDocs.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-300"/>Todavía no hay documentos en el archivo común.</div> :
            <div className="space-y-2">{filteredDocs.map(doc=><Card key={doc.id} className="rounded-xl"><CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="font-medium text-slate-800">{doc.titulo}</p><p className="mt-1 break-words text-xs text-slate-500">{doc.nombre_archivo} · {doc.categoria}{doc.temporada ? " · "+doc.temporada : ""}{doc.fecha_caducidad ? " · Caduca "+doc.fecha_caducidad : ""}</p>{doc.notas && <p className="mt-1 text-sm text-slate-600">{doc.notas}</p>}</div>
              <div className="flex flex-wrap items-center gap-2"><Badge className={doc.estado === "vigente" ? "bg-emerald-100 text-emerald-800" : doc.estado === "caducado" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{doc.estado.replace("_"," ")}</Badge><Select value={doc.estado} onValueChange={v=>markDocState(doc,v)}><SelectTrigger className="h-8 w-36"><SelectValue/></SelectTrigger><SelectContent>{ESTADOS_DOC.map(s=><SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent></Select><a href={doc.archivo_url} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="rounded-lg"><ExternalLink className="mr-1 h-3.5 w-3.5"/>Abrir</Button></a></div>
            </CardContent></Card>)}</div>}
        </TabsContent>
      </Tabs>
      <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={load} className="text-slate-500"><RefreshCw className="mr-2 h-3.5 w-3.5"/>Actualizar archivo y recomendaciones</Button></div>
    </div>
  );
}
