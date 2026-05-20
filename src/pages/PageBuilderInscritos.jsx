import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2, Search, Mail, Phone, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SubmissionDataView from "@/components/page-builder/SubmissionDataView";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const ESTADOS = {
  nuevo: { label: "🆕 Nuevo", class: "bg-blue-100 text-blue-700" },
  contactado: { label: "📞 Contactado", class: "bg-amber-100 text-amber-700" },
  confirmado: { label: "✅ Confirmado", class: "bg-green-100 text-green-700" },
  cancelado: { label: "❌ Cancelado", class: "bg-red-100 text-red-700" },
};

// Panel de gestión de inscritos de una página.
export default function PageBuilderInscritos() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pageId = params.get("id");

  const [page, setPage] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [selected, setSelected] = useState(null);

  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!pageId) {
      navigate("/PageBuilder");
      return;
    }
    (async () => {
      try {
        const me = await base44.auth.me();
        const allPages = await base44.entities.LandingPage.list();
        const p = allPages.find((x) => x.id === pageId);

        // Validar acceso: admin O email en panel_gestion.emails_autorizados
        const isAdmin = me?.role === "admin";
        const authorized = (p?.panel_gestion?.emails_autorizados || [])
          .map((e) => (e || "").toLowerCase().trim());
        const myEmail = (me?.email || "").toLowerCase().trim();
        if (!isAdmin && !authorized.includes(myEmail)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setPage(p);
        const subs = await base44.entities.LandingSubmission.filter(
          { landing_page_id: pageId },
          "-created_date",
          500
        );
        setSubmissions(subs || []);
      } catch (err) {
        console.error(err);
        toast.error("Error cargando inscritos");
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId, navigate]);

  const updateEstado = async (subId, estado) => {
    try {
      await base44.entities.LandingSubmission.update(subId, { estado });
      setSubmissions((prev) => prev.map((s) => s.id === subId ? { ...s, estado } : s));
      if (selected?.id === subId) setSelected({ ...selected, estado });
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error");
    }
  };

  const handleDelete = async (subId) => {
    try {
      await base44.entities.LandingSubmission.delete(subId);
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      if (selected?.id === subId) setSelected(null);
      toast.success("Inscripción eliminada");
    } catch {
      toast.error("Error");
    }
  };

  const exportCSV = () => {
    if (!submissions.length) return;
    const allKeys = new Set(["id", "nombre", "email", "telefono", "estado", "fecha"]);
    submissions.forEach((s) => {
      Object.keys(s.datos || {}).forEach((k) => allKeys.add(k));
    });
    const headers = Array.from(allKeys);
    const rows = submissions.map((s) => headers.map((h) => {
      let v;
      if (h === "id") v = s.id;
      else if (h === "fecha") v = s.created_date;
      else if (["nombre", "email", "telefono", "estado"].includes(h)) v = s[h];
      else v = s.datos?.[h];
      const s2 = (v ?? "").toString().replace(/"/g, '""');
      return `"${s2}"`;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inscritos-${page?.slug || "landing"}-${Date.now()}.csv`;
    link.click();
    toast.success("CSV descargado");
  };

  const filtered = submissions.filter((s) => {
    if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.nombre?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.telefono?.includes(q)
    );
  });

  const stats = {
    total: submissions.length,
    nuevo: submissions.filter((s) => s.estado === "nuevo").length,
    contactado: submissions.filter((s) => s.estado === "contactado").length,
    confirmado: submissions.filter((s) => s.estado === "confirmado").length,
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sin acceso</h1>
          <p className="text-slate-500 mb-6">No tienes permiso para gestionar esta página. Pide a un administrador que te añada como gestor.</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/PageBuilder")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            📊 Inscritos · {page?.nombre || "..."}
          </h1>
          <p className="text-sm text-slate-500">{stats.total} inscripciones recibidas</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Users className="w-4 h-4" /> Total</div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="text-blue-600 text-sm mb-1">🆕 Nuevos</div>
          <div className="text-2xl font-black text-blue-700">{stats.nuevo}</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <div className="text-amber-600 text-sm mb-1">📞 Contactados</div>
          <div className="text-2xl font-black text-amber-700">{stats.contactado}</div>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
          <div className="text-green-600 text-sm mb-1">✅ Confirmados</div>
          <div className="text-2xl font-black text-green-700">{stats.confirmado}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-10" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="nuevo">🆕 Nuevos</SelectItem>
            <SelectItem value="contactado">📞 Contactados</SelectItem>
            <SelectItem value="confirmado">✅ Confirmados</SelectItem>
            <SelectItem value="cancelado">❌ Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-slate-500">{submissions.length === 0 ? "Aún no hay inscritos" : "No hay resultados con esos filtros"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{s.nombre || "Sin nombre"}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      {s.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</span>}
                      {s.telefono && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {s.telefono}</span>}
                      <span>{new Date(s.created_date).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <Badge className={ESTADOS[s.estado]?.class}>{ESTADOS[s.estado]?.label || s.estado}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4" onClick={() => setSelected(null)}>
          <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selected.nombre || "Sin nombre"}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Inscrito el {new Date(selected.created_date).toLocaleString("es-ES")}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                <Select value={selected.estado} onValueChange={(v) => updateEstado(selected.id, v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">🆕 Nuevo</SelectItem>
                    <SelectItem value="contactado">📞 Contactado</SelectItem>
                    <SelectItem value="confirmado">✅ Confirmado</SelectItem>
                    <SelectItem value="cancelado">❌ Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Datos del formulario</label>
                <SubmissionDataView
                  datos={selected.datos}
                  campos={page?.config?.formulario?.campos || []}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
                {selected.email && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(`mailto:${selected.email}`)}>
                    <Mail className="w-4 h-4" /> Email
                  </Button>
                )}
                {selected.telefono && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(`https://wa.me/${selected.telefono.replace(/\D/g, "")}`)}>
                    💬 WhatsApp
                  </Button>
                )}
                <div className="flex-1" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar inscripción?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se borrará permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selected.id)} className="bg-red-600 hover:bg-red-700">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}