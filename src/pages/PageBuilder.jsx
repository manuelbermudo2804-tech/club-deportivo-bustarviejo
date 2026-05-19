import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Search, Edit, Copy, ExternalLink, Trash2, Users,
  Eye, Globe, Loader2, QrCode, Check, Share2
} from "lucide-react";
import ShareDialog from "@/components/page-builder/ShareDialog";
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
    const url = `${window.location.origin}/l/${page.slug}`;
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
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            🚀 Constructor de Páginas
          </h1>
          <p className="text-slate-500 mt-1">
            Crea páginas públicas con formulario en minutos. URL única para compartir.
          </p>
        </div>
        <Button
          onClick={() => navigate("/PageBuilderEditor")}
          className="gap-2 bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" /> Nueva página
        </Button>
      </div>

      <div className="mb-5 relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o URL…"
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
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
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => {
            const url = `${window.location.origin}/l/${p.slug}`;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 truncate">{p.nombre}</h3>
                    <code className="text-xs text-slate-500 truncate block">/l/{p.slug}</code>
                  </div>
                  {estadoBadge(p.estado)}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                      <Eye className="w-3 h-3" /> Visitas
                    </div>
                    <div className="font-black text-slate-900">{p.estadisticas?.visitas || 0}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                      <Users className="w-3 h-3" /> Inscritos
                    </div>
                    <div className="font-black text-slate-900">{p.estadisticas?.inscripciones || 0}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/PageBuilderEditor?id=${p.id}`)} className="gap-1 flex-1">
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/PageBuilderInscritos?id=${p.id}`)} className="gap-1 flex-1">
                    <Users className="w-3 h-3" /> Inscritos
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
        url={sharing ? `${window.location.origin}/l/${sharing.slug}` : ""}
        title={sharing?.nombre}
      />
    </div>
  );
}