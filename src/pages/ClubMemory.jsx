import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText, Download, BookOpen, HandHeart, Flag, Loader2, Sparkles,
  ShieldCheck, Save, Target, ListChecks,
} from "lucide-react";
import { generateClubMemoryPDF } from "@/components/memory/clubMemoryPdfGenerator";
import EditableSection from "@/components/memory/EditableSection";
import GruposEditor from "@/components/memory/GruposEditor";
import ActividadesEditor from "@/components/memory/ActividadesEditor";
import BulletListEditor from "@/components/memory/BulletListEditor";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const getCurrentSeason = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const inicio = m >= 9 ? y : y - 1;
  return `${inicio}-${inicio + 1}`;
};

const seasonOptions = (activeSeason) => {
  const byDate = parseInt(getCurrentSeason().split("-")[0], 10);
  const byActive = activeSeason ? parseInt(activeSeason.split("-")[0], 10) : byDate;
  const top = Math.max(byDate, byActive);
  const opts = [];
  for (let y = top; y >= top - 6; y--) opts.push(`${y}-${y + 1}`);
  return opts;
};

const emptyDraft = (temporada) => ({
  temporada,
  introduccion: "",
  disciplinas_intro: "",
  grupos: [],
  voluntariado: "",
  voluntariado_objetivos: [],
  otras_actividades: [],
  conclusiones: "",
  aspectos_mejorar: [],
  firmante_cargo: "LA PRESIDENTA",
});

export default function ClubMemory() {
  const [temporada, setTemporada] = useState(getCurrentSeason());
  const [activeSeason, setActiveSeason] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);

  const [data, setData] = useState(null);          // datos agregados (autorrelleno)
  const [draft, setDraft] = useState(emptyDraft(getCurrentSeason()));
  const [draftId, setDraftId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
    base44.entities.SeasonConfig.filter({ activa: true }, "-created_date", 1)
      .then((rows) => {
        const t = rows?.[0]?.temporada;
        if (t) { setActiveSeason(t); setTemporada(t); }
      })
      .catch(() => {});
  }, []);

  // Cargar datos agregados + borrador guardado al cambiar de temporada
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("generateClubMemory", {
        modo: "temporada",
        temporada,
        secciones: { jugadores: true, grupos: true, eventos: true, voluntariado: true, sanisidro: true, socios: true },
      });
      setData(res.data);

      // Borrador guardado de esta temporada
      const saved = await base44.entities.ClubMemoryDraft.filter({ temporada }, "-created_date", 1);
      if (saved?.[0]) {
        setDraftId(saved[0].id);
        const s = saved[0];
        setDraft({ ...emptyDraft(temporada), ...s });
      } else {
        setDraftId(null);
        // Borrador vacío con grupos autorrellenados desde los datos
        setDraft({ ...emptyDraft(temporada), grupos: res.data?.grupos || [] });
      }
    } catch (e) {
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [temporada]);

  useEffect(() => { load(); }, [load]);

  // Reautorrellenar grupos desde datos del club (sin perder textos manuales)
  const autofillGrupos = () => {
    const base = data?.grupos || [];
    const prevByName = Object.fromEntries((draft.grupos || []).map(g => [g.nombre, g]));
    const merged = base.map(g => ({ ...g, ...prevByName[g.nombre], nombre: g.nombre, integrantes: g.integrantes, responsables: prevByName[g.nombre]?.responsables || g.responsables, posicion: prevByName[g.nombre]?.posicion || g.posicion }));
    setField("grupos", merged);
    toast.success("Grupos actualizados con los datos del club");
  };

  const runAI = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke("generateMemoryDraft", { data, temporada });
      const raw = res.data?.draft;
      const d = raw?.introduccion ? raw : (raw?.response || raw);
      if (!d) throw new Error("Sin respuesta");
      // Fusionar textos IA con grupos autorrellenados (la IA aporta el texto por grupo)
      const textosPorNombre = Object.fromEntries((d.grupos_textos || []).map(g => [g.nombre, g.texto]));
      const gruposActuales = (draft.grupos?.length ? draft.grupos : (data.grupos || []));
      const grupos = gruposActuales.map(g => ({ ...g, texto: g.texto || textosPorNombre[g.nombre] || "" }));
      setDraft((prev) => ({
        ...prev,
        introduccion: prev.introduccion || d.introduccion || "",
        disciplinas_intro: prev.disciplinas_intro || d.disciplinas_intro || "",
        grupos,
        voluntariado: prev.voluntariado || d.voluntariado || "",
        voluntariado_objetivos: prev.voluntariado_objetivos?.length ? prev.voluntariado_objetivos : (d.voluntariado_objetivos || []),
        otras_actividades: prev.otras_actividades?.length ? prev.otras_actividades : (d.otras_actividades || []),
        conclusiones: prev.conclusiones || d.conclusiones || "",
        aspectos_mejorar: prev.aspectos_mejorar?.length ? prev.aspectos_mejorar : (d.aspectos_mejorar || []),
      }));
      toast.success("Borrador redactado con IA. Revísalo y edítalo antes de descargar.");
    } catch (e) {
      toast.error("No se pudo generar el borrador con IA");
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...draft, temporada };
      delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (draftId) {
        await base44.entities.ClubMemoryDraft.update(draftId, payload);
      } else {
        const created = await base44.entities.ClubMemoryDraft.create(payload);
        setDraftId(created.id);
      }
      toast.success("Memoria guardada");
    } catch (e) {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      await generateClubMemoryPDF(draft, data, CLUB_LOGO_URL);
      toast.success("Memoria PDF descargada");
    } catch (e) {
      toast.error("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

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
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Memoria del Club</h1>
            <p className="text-slate-300 text-sm">Memoria institucional editable · formato oficial</p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <Card className="rounded-2xl border-slate-200 sticky top-2 z-10 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select value={temporada} onValueChange={setTemporada}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {seasonOptions(activeSeason).map(s => (
                <SelectItem key={s} value={s}>Temporada {s}{s === activeSeason ? " (activa)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={runAI} disabled={aiLoading || loading} className="rounded-lg">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-orange-500" />}
            Redactar con IA
          </Button>

          <Button variant="outline" onClick={save} disabled={saving || loading} className="rounded-lg">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>

          <Button onClick={handleDownload} disabled={!data || generating || loading} className="bg-orange-600 hover:bg-orange-700 ml-auto">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar PDF
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Edita cualquier texto libremente. Pulsa "Redactar con IA" para un borrador automático, o rellena tú mismo. Recuerda guardar.
          </p>

          <EditableSection
            icon={BookOpen}
            title="Introducción"
            value={draft.introduccion}
            onChange={(v) => setField("introduccion", v)}
            rows={7}
            placeholder="Comenzamos una nueva temporada con nuevos retos…"
          />

          <EditableSection
            icon={Flag}
            title="I. Disciplinas deportivas y grupos — introducción"
            hint="Texto general antes del detalle de cada equipo."
            value={draft.disciplinas_intro}
            onChange={(v) => setField("disciplinas_intro", v)}
            rows={3}
            placeholder="El Club ofrece dos disciplinas deportivas: fútbol y baloncesto…"
          />

          <div className="flex justify-end -mt-2">
            <Button variant="ghost" size="sm" onClick={autofillGrupos} className="text-orange-600 text-xs">
              Volver a autorrellenar grupos con los datos del club
            </Button>
          </div>
          <GruposEditor grupos={draft.grupos || []} onChange={(v) => setField("grupos", v)} />

          <EditableSection
            icon={HandHeart}
            title="II. Programa de voluntariado"
            value={draft.voluntariado}
            onChange={(v) => setField("voluntariado", v)}
            rows={5}
            placeholder="Continuamos con nuestro programa de voluntariado deportivo…"
          />
          <BulletListEditor
            icon={Target}
            title="Objetivos del voluntariado"
            items={draft.voluntariado_objetivos || []}
            onChange={(v) => setField("voluntariado_objetivos", v)}
            placeholder="Ej: Expandir los valores del deporte en grupo"
          />

          <ActividadesEditor actividades={draft.otras_actividades || []} onChange={(v) => setField("otras_actividades", v)} />

          <EditableSection
            icon={FileText}
            title="IV. Conclusiones"
            value={draft.conclusiones}
            onChange={(v) => setField("conclusiones", v)}
            rows={6}
            placeholder="La Junta Directiva estamos contentos del resultado del trabajo realizado…"
          />
          <BulletListEditor
            icon={ListChecks}
            title="Aspectos a mejorar"
            items={draft.aspectos_mejorar || []}
            onChange={(v) => setField("aspectos_mejorar", v)}
            placeholder="Ej: Mejorar el problema de impagos"
          />
        </div>
      )}
    </div>
  );
}