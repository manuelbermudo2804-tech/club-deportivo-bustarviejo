import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Globe, Loader2, Copy, Check, Share2 } from "lucide-react";
import TemplatePicker from "@/components/page-builder/TemplatePicker";
import EditorHero from "@/components/page-builder/EditorHero";
import EditorFormulario from "@/components/page-builder/EditorFormulario";
import EditorBloques from "@/components/page-builder/EditorBloques";
import EditorBranding from "@/components/page-builder/EditorBranding";
import EditorPanelGestion from "@/components/page-builder/EditorPanelGestion";
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
  const [showPicker, setShowPicker] = useState(!editId);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("hero");
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Cargar página existente
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const found = await base44.entities.LandingPage.list();
        const p = found.find((x) => x.id === editId);
        if (p) setPage(p);
        else {
          toast.error("Página no encontrada");
          navigate("/PageBuilder");
        }
      } catch {
        toast.error("Error cargando la página");
      }
    })();
  }, [editId, navigate]);

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
      const payload = { ...page };
      if (nuevoEstado) payload.estado = nuevoEstado;

      if (page.id) {
        await base44.entities.LandingPage.update(page.id, payload);
        toast.success("Cambios guardados");
        setPage(payload);
      } else {
        const created = await base44.entities.LandingPage.create(payload);
        toast.success("Página creada");
        setPage(created);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Topbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/PageBuilder")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 truncate">{page.nombre || "Sin nombre"}</div>
            <div className="text-xs text-slate-500 truncate">
              {page.slug ? `/l/${page.slug}` : "sin slug definido"}
              {page.estado === "publicada" && <span className="ml-2 text-green-600 font-semibold">● Publicada</span>}
              {page.estado === "borrador" && <span className="ml-2 text-amber-600 font-semibold">● Borrador</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {page.id && page.slug && (
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-2">
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Compartir</span>
            </Button>
          )}
          {page.id && page.slug && page.estado === "publicada" && (
            <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")} className="gap-2 hidden sm:flex">
              <Eye className="w-4 h-4" /> Ver
            </Button>
          )}
          <Button size="sm" onClick={() => handleSave()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(page.estado === "publicada" ? "borrador" : "publicada")}
            disabled={saving}
            className={page.estado === "publicada"
              ? "bg-slate-600 hover:bg-slate-700 gap-2"
              : "bg-green-600 hover:bg-green-700 gap-2"}
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
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10 overflow-x-auto">
            {[
              { id: "hero", label: "🎬", title: "Hero" },
              { id: "bloques", label: "🧱", title: "Bloques" },
              { id: "formulario", label: "📋", title: "Form" },
              { id: "branding", label: "🎨", title: "Estilo" },
              { id: "panel", label: "🎫", title: "Panel app" },
              { id: "ajustes", label: "⚙️", title: "Ajustes" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-2 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "text-slate-900 border-b-2 border-slate-900 bg-slate-50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title={t.title}
              >
                <span className="text-base mr-1">{t.label}</span> {t.title}
              </button>
            ))}
          </div>

          <div className="p-5">
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
                formulario={page.config?.formulario || { campos: [] }}
                onChange={(v) => updateConfig("formulario", v)}
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
          <div className="bg-slate-300 text-center py-2 text-xs text-slate-700 font-medium sticky top-0 z-10">
            🖥️ Vista previa en vivo
          </div>
          <div className="bg-white min-h-full">
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
              />
            )}
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