import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Search, Edit, Copy, ExternalLink, Trash2, Users,
  Eye, Globe, Loader2, QrCode, Check, Share2, BarChart3, BookOpen
} from "lucide-react";
import ShareDialog from "@/components/page-builder/ShareDialog";
import { buildLandingUrl } from "@/components/page-builder/landingUrl";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// Galería de páginas creadas con el constructor.
export default function PageBuilder() {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [sharing, setSharing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LandingPage.list("-created_date", 100);
      setPages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      await base44.entities.LandingPage.delete(id);
      toast.success("Página eliminada");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleDuplicate = async (page) => {
    try {
      const copy = {
        ...page,
        nombre: page.nombre + " (copia)",
        slug: page.slug + "-copia-" + Date.now().toString(36).slice(-4),
        estado: "borrador",
        estadisticas: { visitas: 0, inscripciones: 0 },
      };
      delete copy.id;
      delete copy.created_date;
      delete copy.updated_date;
      delete copy.created_by;
      const created = await base44.entities.LandingPage.create(copy);
      toast.success("Página duplicada");
      navigate(`/PageBuilderEditor?id=${created.id}`);
    } catch {
      toast.error("Error al duplicar");
    }
  };

  const handleCopyUrl = (page) => {
    const url = buildLandingUrl(page.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(page.id);
    toast.success("URL copiada");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = pages.filter((p) =>
    !search ||
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const estadoBadge = (estado) => {
    const map = {
      borrador: { label: "🟡 Borrador", class: "bg-amber-100 text-amber-700" },
      publicada: { label: "🟢 Publicada", class: "bg-green-100 text-green-700" },
      cerrada: { label: "🔒 Cerrada", class: "bg-slate-100 text-slate-700" },
      archivada: { label: "⚫ Archivada", class: "bg-slate-200 text-slate-500" },
    };
    const e = map[estado] || map.borrador;
    return <Badge className={`${e.class} hover:${e.class}`}>{e.label}</Badge>;
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
              <Globe className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Diseño y publicación</p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Constructor de páginas</h1>
              <p className="mt-1 text-sm text-slate-300">Crea páginas públicas, formularios de inscripción y enlaces para compartir</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button onClick={() => navigate("/PageBuilderGuia")} variant="outline" className="h-11 w-full gap-2 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto">
              <BookOpen className="h-4 w-4" /> Guía
            </Button>
            <Button onClick={() => navigate("/PageBuilderEditor")} className="h-11 w-full gap-2 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto">
              <Plus className="h-4 w-4" /> Nueva página
            </Button>
          </div>
        </div>
      </div>

      {pages.length === 0 && !loading && !search && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">¿Es tu primera vez?</div>
            <p className="text-sm text-slate-600">Lee la guía para entender qué hace cada función. 5 minutos y dominas el constructor.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/PageBuilderGuia")} className="shrink-0 gap-1 rounded-lg bg-orange-600 hover:bg-orange-700">
            <BookOpen className="w-3 h-3" /> Ver guía
          </Button>
        </div>
      )}

      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o URL…"
          className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center shadow-sm sm:py-20">
          <div className="text-7xl mb-4">🎨</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {search ? "No hay resultados" : "Aún no tienes ninguna página"}
          </h3>
          <p className="text-slate-500 mb-6">
            {search ? "Prueba con otra búsqueda." : "Crea tu primera página pública en menos de 5 minutos."}
          </p>
          {!search && (
            <Button onClick={() => navigate("/PageBuilderEditor")} className="gap-2">
              <Plus className="w-4 h-4" /> Crear mi primera página
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const url = buildLandingUrl(p.slug);
            return (
              <div key={p.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-bold text-slate-900">{p.nombre}</h3>
                    <code className="mt-1 block break-all text-xs text-slate-500">/l/{p.slug}</code>
                  </div>
                  {estadoBadge(p.estado)}
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                      <Eye className="w-3 h-3" /> Visitas
                    </div>
                    <div className="font-black text-slate-900">{p.estadisticas?.visitas || 0}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                      <Users className="w-3 h-3" /> Inscritos
                    </div>
                    <div className="font-black text-slate-900">{p.estadisticas?.inscripciones || 0}</div>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/PageBuilderEditor?id=${p.id}`)} className="gap-1 flex-1">
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/PageBuilderInscritos?id=${p.id}`)} className="gap-1 flex-1">
                    <Users className="w-3 h-3" /> Inscritos
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/PageBuilderAnalytics?id=${p.id}`)} className="gap-1" title="Analytics">
                    <BarChart3 className="w-3 h-3" />
                  </Button>
                  {p.estado === "publicada" && p.slug && (
                    <Button size="sm" variant="outline" onClick={() => setSharing(p)} className="gap-1" title="Compartir / QR">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  )}
                  {p.estado === "publicada" && p.slug && (
                    <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")} className="gap-1" title="Abrir">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDuplicate(p)} className="gap-1">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar "{p.nombre}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Las inscripciones ya recibidas se mantendrán pero ya no se podrá editar la página.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-red-600 hover:bg-red-700">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShareDialog
        open={!!sharing}
        onClose={() => setSharing(null)}
        url={sharing ? buildLandingUrl(sharing.slug) : ""}
        title={sharing?.nombre}
      />
    </div>
  );
}