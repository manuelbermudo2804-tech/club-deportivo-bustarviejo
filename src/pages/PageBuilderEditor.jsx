import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Globe, Loader2, Copy, Check, Share2, Smartphone, Monitor, HelpCircle, Undo2, Redo2 } from "lucide-react";
import TemplatePicker from "@/components/page-builder/TemplatePicker";
import EditorHero from "@/components/page-builder/EditorHero";
import EditorFormulario from "@/components/page-builder/EditorFormulario";
import EditorBloques from "@/components/page-builder/EditorBloques";
import EditorBranding from "@/components/page-builder/EditorBranding";
import EditorPanelGestion from "@/components/page-builder/EditorPanelGestion";
import EditorPago from "@/components/page-builder/EditorPago";
import EditorAvanzado from "@/components/page-builder/EditorAvanzado";
import CupoPorCategoriaEditor from "@/components/page-builder/CupoPorCategoriaEditor";
import ShareDialog from "@/components/page-builder/ShareDialog";
import { buildLandingUrl } from "@/components/page-builder/landingUrl";
import ImageUploadInput from "@/components/page-builder/ImageUploadInput";
import PublicHero from "@/components/page-builder/PublicHero";
import PublicBlockRenderer from "@/components/page-builder/PublicBlockRenderer";
import PublicForm from "@/components/page-builder/PublicForm";
import { getTemplate } from "@/components/page-builder/landingTemplates";

const slugify = (s) => s.toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

// Editor principal del constructor de páginas (3 columnas: ajustes / preview / propiedades del bloque).
export default function PageBuilderEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("id");

  const [page, setPage] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showPicker, setShowPicker] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [tab, setTab] = useState("hero");
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewport, setViewport] = useState("desktop"); // 'desktop' | 'mobile'

  const [dirty, setDirty] = useState(false);
  const [initialPage, setInitialPage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyReady = useRef(false);
  const applyingHistory = useRef(false);
  const draftRestoreChecked = useRef(false);
  const draftKey = `page_builder_editor_draft_${editId || "new"}`;

  // Cargar página existente
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoadError(false);
    (async () => {
      try {
        const p = await base44.entities.LandingPage.get(editId);
        if (cancelled) return;
        if (p) {
          setPage(p);
          setInitialPage(JSON.stringify(p));
          setHistory([JSON.stringify(p)]);
          setHistoryIndex(0);
          historyReady.current = true;
          setLoadError(false);
        } else {
          toast.error("Página no encontrada");
          navigate("/PageBuilder");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando la página del constructor:", err);
        setLoadError(true);
        toast.error("No se ha podido cargar la página. Puedes volver a intentarlo.");
      }
    })();
    return () => { cancelled = true; };
  }, [editId, navigate, loadAttempt]);

  // Detectar cambios sin guardar y mantener un historial local limitado para deshacer/rehacer.
  useEffect(() => {
    if (!page || !initialPage) return;
    const snapshot = JSON.stringify(page);
    setDirty(snapshot !== initialPage);
    if (!historyReady.current) {
      setHistory([snapshot]);
      setHistoryIndex(0);
      historyReady.current = true;
      return;
    }
    if (applyingHistory.current) {
      applyingHistory.current = false;
      return;
    }
    setHistory((current) => {
      const base = current.slice(0, Math.max(0, historyIndex + 1));
      if (base[base.length - 1] === snapshot) return current;
      const next = [...base, snapshot].slice(-50);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [page, initialPage]);

  const moveHistory = (direction) => {
    const nextIndex = historyIndex + direction;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    try {
      const snapshot = history[nextIndex];
      applyingHistory.current = true;
      setPage(JSON.parse(snapshot));
      setHistoryIndex(nextIndex);
    } catch (err) {
      applyingHistory.current = false;
      console.error("No se pudo restaurar el cambio del editor:", err);
      toast.error("No se pudo recuperar ese cambio.");
    }
  };

  // Recuperación local opcional de borradores del editor; nunca restaura ni ejecuta pagos.
  useEffect(() => {
    if (!page || draftRestoreChecked.current) return;
    draftRestoreChecked.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.page || typeof draft.savedAt !== "number") return;
      if (JSON.stringify(draft.page) === JSON.stringify(page)) return;
      const when = new Date(draft.savedAt).toLocaleString();
      if (window.confirm(`Hay una copia local del editor guardada el ${when}. ¿Quieres recuperar esos cambios?\n\nSi eliges No, se conservará la página cargada.`)) {
        setPage(draft.page);
        toast.success("Borrador local recuperado");
      } else {
        window.localStorage.removeItem(draftKey);
      }
    } catch (err) {
      console.warn("No se pudo leer el borrador local del editor:", err);
    }
  }, [page, draftKey]);

  useEffect(() => {
    if (!page || !dirty) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ page, savedAt: Date.now() }));
    } catch (err) {
      console.warn("No se pudo guardar el borrador local del editor:", err);
    }
  }, [page, dirty, draftKey]);

  // Advertir antes de salir si hay cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handlePickTemplate = (template) => {
    setPage({
      slug: "",
      nombre: `Página ${template.nombre}`,
      estado: "borrador",
      plantilla_origen: template.id,
      tema_visual: template.tema,
      config: template.config,
    });
    setShowPicker(false);
  };

  const updateConfig = (k, v) => {
    setPage((p) => ({ ...p, config: { ...p.config, [k]: v } }));
  };

  const handleSave = async (nuevoEstado) => {
    if (nuevoEstado === "publicada" && page.estado !== "publicada") {
      const avisos = [];
      if (!page.config?.hero?.titulo?.trim()) avisos.push("falta el título principal");
      if (!page.config?.hero?.subtitulo?.trim()) avisos.push("falta el subtítulo");
      if (!(page.config?.bloques || []).length) avisos.push("no hay bloques de contenido");
      if (page.config?.formulario && !(page.config?.formulario?.campos || []).length) avisos.push("el formulario no tiene campos");
      if (avisos.length && !window.confirm(`Antes de publicar, revisa lo siguiente:\n\n• ${avisos.join("\n• ")}\n\nPuedes publicar igualmente si es intencionado. ¿Quieres continuar?`)) return;
      if (!avisos.length && !window.confirm("Vas a publicar esta página. Será accesible mediante su URL pública. ¿Continuar?")) return;
    }
    if (!page.nombre || !page.slug) {
      toast.error("Debes rellenar nombre y slug");
      setTab("ajustes");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(page.slug)) {
      toast.error("El slug solo puede tener letras minúsculas, números y guiones");
      return;
    }
    setSaving(true);
    try {
      // Validar slug único
      const existing = await base44.entities.LandingPage.filter({ slug: page.slug });
      const duplicate = (existing || []).find((x) => x.id !== page.id);
      if (duplicate) {
        toast.error(`La URL "/l/${page.slug}" ya está en uso por otra página`);
        setTab("ajustes");
        setSaving(false);
        return;
      }

      const payload = { ...page };
      if (nuevoEstado) payload.estado = nuevoEstado;

      if (page.id) {
        await base44.entities.LandingPage.update(page.id, payload);
        toast.success("Cambios guardados");
        setPage(payload);
        setInitialPage(JSON.stringify(payload));
        try { window.localStorage.removeItem(draftKey); } catch {}
        setLastSavedAt(new Date());
      } else {
        const created = await base44.entities.LandingPage.create(payload);
        toast.success("Página creada");
        setPage(created);
        setInitialPage(JSON.stringify(created));
        try { window.localStorage.removeItem(draftKey); } catch {}
        setLastSavedAt(new Date());
        navigate(`/PageBuilderEditor?id=${created.id}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = buildLandingUrl(page?.slug);



  if (showPicker) {
    return <TemplatePicker onPick={handlePickTemplate} onCancel={() => navigate("/PageBuilder")} />;
  }

  if (!page) {
    if (loadError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">No se ha podido cargar la página</h1>
            <p className="mt-2 text-sm text-slate-600">Puede ser un problema temporal de conexión o permisos. No se han modificado los datos de la página.</p>
            <div className="mt-5 flex flex-col-reverse justify-center gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => navigate("/PageBuilder")}>Volver al listado</Button>
              <Button onClick={() => { setLoadError(false); setLoadAttempt((n) => n + 1); }}>
                <Loader2 className="mr-2 h-4 w-4" /> Reintentar carga
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-600" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm">Cargando editor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Topbar */}
      <div className="sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-800 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir igualmente?")) return;
              navigate("/PageBuilder");
            }}
            className="text-slate-200 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="font-bold text-white truncate flex items-center gap-2">
              {page.nombre || "Sin nombre"}
              {saving ? <span className="text-xs font-normal text-blue-600">● guardando…</span> : dirty ? <span className="text-xs font-normal text-amber-600">● cambios pendientes</span> : lastSavedAt ? <span className="text-xs font-normal text-emerald-600">● guardado</span> : null}
            </div>
            <div className="text-xs text-slate-300 truncate">
              {page.slug ? `/l/${page.slug}` : "sin slug definido"}
              {page.estado === "publicada" && <span className="ml-2 text-green-600 font-semibold">● Publicada</span>}
              {page.estado === "borrador" && <span className="ml-2 text-amber-600 font-semibold">● Borrador</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" size="icon" onClick={() => moveHistory(-1)} disabled={historyIndex <= 0} title="Deshacer cambio" aria-label="Deshacer cambio" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-35">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => moveHistory(1)} disabled={historyIndex < 0 || historyIndex >= history.length - 1} title="Rehacer cambio" aria-label="Rehacer cambio" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-35">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open("/PageBuilderGuia", "_blank")}
            title="Abrir guía de ayuda"
            aria-label="Abrir guía de ayuda"
            className="text-slate-200 hover:text-white hover:bg-white/10"
          >
            <HelpCircle className="w-4 h-4 text-slate-200" />
          </Button>
          {page.id && page.slug && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-2 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Compartir</span>
            </Button>
          )}
          {page.id && page.slug && page.estado === "publicada" && (
            <Button type="button" variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")} className="gap-2 hidden sm:flex border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              <Eye className="w-4 h-4" /> Ver
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => handleSave()} disabled={saving} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm focus-visible:ring-2 focus-visible:ring-orange-400">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardar"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(page.estado === "publicada" ? "borrador" : "publicada")}
            disabled={saving}
            className={page.estado === "publicada"
              ? "bg-slate-700 hover:bg-slate-600 text-white gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400"
              : "bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-400"}
          >
            <Globe className="w-4 h-4" />
            {page.estado === "publicada" ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      {/* Layout 2 columnas: panel + preview */}
      <div className="grid lg:grid-cols-[400px_1fr] gap-0 lg:h-[calc(100vh-64px)]">
        {/* Panel izquierdo */}
        <div className="bg-white border-r border-slate-200 overflow-y-auto">
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10 overflow-x-auto scrollbar-thin">
            {[
              { id: "hero", label: "🎬", title: "Hero" },
              { id: "bloques", label: "🧱", title: "Bloques" },
              { id: "formulario", label: "📋", title: "Form" },
              { id: "pago", label: "💳", title: "Pago" },
              { id: "avanzado", label: "🚀", title: "Avanzado" },
              { id: "branding", label: "🎨", title: "Estilo" },
              { id: "panel", label: "🎫", title: "Panel" },
              { id: "ajustes", label: "⚙️", title: "Ajustes" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-none min-w-[76px] px-3 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "text-orange-700 border-b-2 border-orange-600 bg-orange-50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
                title={t.title}
              >
                <span className="text-base mr-1">{t.label}</span> {t.title}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "hero" && (
              <EditorHero
                hero={page.config?.hero || {}}
                onChange={(v) => updateConfig("hero", v)}
              />
            )}
            {tab === "bloques" && (
              <EditorBloques
                bloques={page.config?.bloques || []}
                onChange={(v) => updateConfig("bloques", v)}
              />
            )}
            {tab === "formulario" && (
              <EditorFormulario
                formulario={page.config?.formulario ?? null}
                onChange={(v) => updateConfig("formulario", v)}
              />
            )}
            {tab === "pago" && (
              <EditorPago
                pago={page.config?.pago || {}}
                onChange={(v) => updateConfig("pago", v)}
              />
            )}
            {tab === "avanzado" && (
              <EditorAvanzado
                config={page.config || {}}
                panel={page.panel_gestion || {}}
                onConfigChange={updateConfig}
                onPanelChange={(v) => setPage({ ...page, panel_gestion: v })}
              />
            )}
            {tab === "branding" && (
              <EditorBranding
                branding={page.config?.branding || {}}
                onChange={(v) => updateConfig("branding", v)}
              />
            )}
            {tab === "panel" && (
              <EditorPanelGestion
                panel={page.panel_gestion || {}}
                onChange={(v) => setPage({ ...page, panel_gestion: v })}
              />
            )}
            {tab === "ajustes" && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base mb-3">⚙️ Ajustes generales</h3>
                <div>
                  <Label>Nombre interno</Label>
                  <Input
                    value={page.nombre || ""}
                    onChange={(e) => setPage({ ...page, nombre: e.target.value })}
                    placeholder="Mi página"
                  />
                  <p className="text-xs text-slate-500 mt-1">Solo lo verás tú en el panel.</p>
                </div>

                <div>
                  <Label>URL (slug)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 px-2">/l/</span>
                    <Input
                      value={page.slug || ""}
                      onChange={(e) => setPage({ ...page, slug: slugify(e.target.value) })}
                      placeholder="mi-pagina"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Solo letras minúsculas, números y guiones. {page.slug && publicUrl && (
                      <span className="block text-blue-600 mt-1 break-all">{publicUrl}</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select value={page.estado} onValueChange={(v) => setPage({ ...page, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">🟡 Borrador (privada)</SelectItem>
                      <SelectItem value="publicada">🟢 Publicada</SelectItem>
                      <SelectItem value="cerrada">🔒 Cerrada (mensaje)</SelectItem>
                      <SelectItem value="archivada">⚫ Archivada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <Label className="font-bold">🎟️ Plazas / Aforo</Label>
                  <p className="text-xs text-slate-500 mt-1">Limita el número de inscripciones para evitar excesos.</p>
                </div>
                <div>
                  <Label>Plazas máximas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={page.config?.limites?.plazas_maximas ?? ""}
                    onChange={(e) => updateConfig("limites", {
                      ...(page.config?.limites || {}),
                      plazas_maximas: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                    })}
                    placeholder="Ej: 32 (deja vacío para sin límite)"
                  />
                  <p className="text-xs text-slate-500 mt-1">Cuando se llene, no se aceptarán más inscripciones automáticamente.</p>
                </div>
                <div>
                  <Label>Plazas ya ocupadas (reservas fuera de la web)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={page.config?.limites?.plazas_reservadas_manual ?? ""}
                    onChange={(e) => updateConfig("limites", {
                      ...(page.config?.limites || {}),
                      plazas_reservadas_manual: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                    })}
                    placeholder="Ej: 15 (gente apuntada por teléfono)"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Se suma al contador de ocupadas. Úsalo para reservar plazas de quien se apuntó por fuera (teléfono, en persona…) sin crear inscritos ficticios. Ej: 16 plazas − 15 reservadas = solo 1 disponible online.
                  </p>
                </div>
                <div>
                  <Label>Mostrar contador de plazas a los usuarios</Label>
                  <Select
                    value={page.config?.limites?.mostrar_plazas ? "si" : "no"}
                    onValueChange={(v) => updateConfig("limites", {
                      ...(page.config?.limites || {}),
                      mostrar_plazas: v === "si",
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">✅ Sí, mostrar "X / Y plazas ocupadas"</SelectItem>
                      <SelectItem value="no">❌ No, mantener oculto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mensaje cuando se agoten las plazas</Label>
                  <Input
                    value={page.config?.limites?.mensaje_plazas_agotadas || ""}
                    onChange={(e) => updateConfig("limites", {
                      ...(page.config?.limites || {}),
                      mensaje_plazas_agotadas: e.target.value,
                    })}
                    placeholder="Lo sentimos, ya no quedan plazas disponibles."
                  />
                </div>

                <CupoPorCategoriaEditor
                  formulario={page.config?.formulario}
                  limites={page.config?.limites || {}}
                  onChange={(v) => updateConfig("limites", { ...(page.config?.limites || {}), ...v })}
                />

                <div className="pt-3 border-t border-slate-200">
                  <Label className="font-bold">SEO & Compartir</Label>
                </div>
                <div>
                  <Label>Meta título</Label>
                  <Input
                    value={page.config?.seo?.meta_titulo || ""}
                    onChange={(e) => updateConfig("seo", { ...(page.config?.seo || {}), meta_titulo: e.target.value })}
                    placeholder="Aparece en la pestaña del navegador"
                  />
                </div>
                <div>
                  <Label>Meta descripción</Label>
                  <Input
                    value={page.config?.seo?.meta_descripcion || ""}
                    onChange={(e) => updateConfig("seo", { ...(page.config?.seo || {}), meta_descripcion: e.target.value })}
                    placeholder="Para Google y WhatsApp"
                  />
                </div>
                <div>
                  <Label>Imagen para WhatsApp / redes (Open Graph)</Label>
                  <ImageUploadInput
                    value={page.config?.seo?.imagen_og}
                    onChange={(v) => updateConfig("seo", { ...(page.config?.seo || {}), imagen_og: v })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Esta imagen aparece al compartir el enlace en WhatsApp, Facebook, Twitter… Recomendado 1200x630px.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview en vivo */}
        <div className="bg-slate-200 overflow-y-auto">
          <div className="bg-slate-300 text-center py-2 text-xs text-slate-700 font-medium sticky top-0 z-10 flex items-center justify-center gap-3">
            <span>🖥️ Vista previa</span>
            <div className="flex bg-white rounded-full p-0.5 shadow-sm">
              <button
                onClick={() => setViewport("desktop")}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition ${viewport === "desktop" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                <Monitor className="w-3 h-3" /> Desktop
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition ${viewport === "mobile" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                <Smartphone className="w-3 h-3" /> Móvil
              </button>
            </div>
          </div>
          <div className={`min-h-full flex justify-center ${viewport === "mobile" ? "p-4 bg-slate-300" : ""}`}>
            <div
              className={`bg-white ${viewport === "mobile" ? "w-[390px] max-w-full rounded-2xl shadow-2xl overflow-hidden border-8 border-slate-900" : "w-full"}`}
              style={viewport === "mobile" ? { maxHeight: "calc(100vh - 120px)", overflowY: "auto" } : {}}
            >
              <PublicHero
                hero={page.config?.hero || {}}
                branding={page.config?.branding || {}}
                onCtaClick={() => {}}
              />
              {(page.config?.bloques || []).map((b) => (
                <PublicBlockRenderer key={b.id} bloque={b} branding={page.config?.branding || {}} />
              ))}
              {page.config?.formulario && (
                <PublicForm
                  landingId="preview"
                  landingSlug="preview"
                  formulario={page.config.formulario}
                  branding={page.config?.branding || {}}
                  limites={page.config?.limites || {}}
                  pago={page.config?.pago || {}}
                  cupones={page.config?.cupones || []}
                  listaEspera={page.config?.lista_espera || null}
                  isPreview={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={publicUrl}
        title={page.nombre}
      />
    </div>
  );
}