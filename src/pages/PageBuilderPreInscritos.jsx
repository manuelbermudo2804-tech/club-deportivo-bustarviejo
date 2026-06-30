import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Search, Mail, Phone, Trash2, AlertTriangle, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const ESTADOS = {
  pendiente: { label: "🕓 Pendiente", class: "bg-amber-100 text-amber-700" },
  contactado: { label: "📞 Contactado", class: "bg-blue-100 text-blue-700" },
  recuperado: { label: "✅ Recuperado", class: "bg-green-100 text-green-700" },
  descartado: { label: "🗑️ Descartado", class: "bg-slate-100 text-slate-500" },
};

// Listado SEPARADO de equipos que empezaron a inscribirse pero no completaron el formulario.
export default function PageBuilderPreInscritos() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pageId = params.get("id");

  const [page, setPage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("sin_completar");
  const [selected, setSelected] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!pageId) { navigate("/PageBuilder"); return; }
    (async () => {
      try {
        const me = await base44.auth.me();
        const p = await base44.entities.LandingPage.get(pageId);
        const isAdmin = me?.role === "admin";
        const authorized = (p?.panel_gestion?.emails_autorizados || []).map((e) => (e || "").toLowerCase().trim());
        const myEmail = (me?.email || "").toLowerCase().trim();
        if (!isAdmin && !authorized.includes(myEmail)) {
          setAccessDenied(true); setLoading(false); return;
        }
        setPage(p);
        const data = await base44.entities.PreInscripcion.filter({ landing_page_id: pageId }, "-created_date", 500);
        setItems(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Error cargando pre-registros");
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId, navigate]);

  const updateEstado = async (id, estado) => {
    try {
      await base44.entities.PreInscripcion.update(id, { estado });
      setItems((prev) => prev.map((s) => s.id === id ? { ...s, estado } : s));
      if (selected?.id === id) setSelected({ ...selected, estado });
      toast.success("Estado actualizado");
    } catch { toast.error("Error"); }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.PreInscripcion.delete(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Pre-registro eliminado");
    } catch { toast.error("Error"); }
  };

  const filtered = items.filter((s) => {
    if (filterEstado === "envio_fallido" && !s.envio_fallido) return false;
    if (filterEstado === "sin_completar" && s.completada) return false;
    if (filterEstado === "completadas" && !s.completada) return false;
    if (["pendiente", "contactado", "recuperado", "descartado"].includes(filterEstado) && s.estado !== filterEstado) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.nombre_equipo || "").toLowerCase().includes(q) ||
      (s.nombre || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.telefono || "").includes(q)
    );
  });

  const sinCompletar = items.filter((s) => !s.completada).length;
  const envioFallidoCount = items.filter((s) => s.envio_fallido && !s.completada).length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sin acceso</h1>
          <p className="text-slate-500 mb-6">No tienes permiso para gestionar esta página.</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/PageBuilderInscritos?id=${pageId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">⚠️ Equipos sin completar · {page?.nombre || "..."}</h1>
          <p className="text-sm text-slate-500">{sinCompletar} empezaron a inscribirse pero no terminaron</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Aquí aparecen los equipos que escribieron su nombre y contacto pero <strong>cerraron la página antes de enviar</strong>.
          No son inscripciones reales — contáctalos para que terminen.
        </p>
      </div>

      {envioFallidoCount > 0 && (
        <button
          onClick={() => setFilterEstado("envio_fallido")}
          className="w-full text-left bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-5 flex items-start gap-3 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            <strong>{envioFallidoCount} {envioFallidoCount === 1 ? "equipo completó el formulario" : "equipos completaron el formulario"} pero el envío falló.</strong> Rellenaron todo y pulsaron Enviar, pero hubo un error de conexión. Son inscripciones válidas — contáctalos y pásalos a la lista oficial. (Pulsa para filtrar)
          </p>
        </button>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo, contacto…" className="pl-10" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="envio_fallido">🚨 Envío fallido</SelectItem>
            <SelectItem value="sin_completar">⚠️ Sin completar</SelectItem>
            <SelectItem value="completadas">✅ Sí completaron</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">🕓 Pendientes</SelectItem>
            <SelectItem value="contactado">📞 Contactados</SelectItem>
            <SelectItem value="recuperado">✅ Recuperados</SelectItem>
            <SelectItem value="descartado">🗑️ Descartados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-slate-500">{items.length === 0 ? "No hay equipos a medias" : "No hay resultados con esos filtros"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <div key={s.id} onClick={() => setSelected(s)} className={`p-4 cursor-pointer transition-colors ${s.envio_fallido && !s.completada ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {s.nombre_equipo || s.nombre || "Sin nombre"}
                      {s.envio_fallido && !s.completada
                        ? <AlertTriangle className="w-4 h-4 text-red-500" />
                        : !s.completada && <ShieldQuestion className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      {s.nombre && s.nombre_equipo && <span>👤 {s.nombre}</span>}
                      {s.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</span>}
                      {s.telefono && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {s.telefono}</span>}
                      <span>{new Date(s.created_date).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.completada
                      ? <Badge className="bg-green-100 text-green-700">✅ Completó</Badge>
                      : s.envio_fallido
                        ? <Badge className="bg-red-100 text-red-700">🚨 Envío fallido</Badge>
                        : <Badge className={ESTADOS[s.estado]?.class}>{ESTADOS[s.estado]?.label || s.estado}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4" onClick={() => setSelected(null)}>
          <div className="max-w-lg mx-auto my-8 bg-white rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{selected.nombre_equipo || selected.nombre || "Sin nombre"}</h2>
                <p className="text-xs text-slate-500 mt-1">Empezó el {new Date(selected.created_date).toLocaleString("es-ES")}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm">
                {selected.nombre && <div><span className="text-slate-500">Responsable:</span> <strong className="text-slate-900">{selected.nombre}</strong></div>}
                {selected.email && <div><span className="text-slate-500">Email:</span> <strong className="text-slate-900">{selected.email}</strong></div>}
                {selected.telefono && <div><span className="text-slate-500">Teléfono:</span> <strong className="text-slate-900">{selected.telefono}</strong></div>}
              </div>

              {!selected.completada && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seguimiento</label>
                  <Select value={selected.estado} onValueChange={(v) => updateEstado(selected.id, v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">🕓 Pendiente</SelectItem>
                      <SelectItem value="contactado">📞 Contactado</SelectItem>
                      <SelectItem value="recuperado">✅ Recuperado</SelectItem>
                      <SelectItem value="descartado">🗑️ Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                      <AlertDialogTitle>¿Eliminar pre-registro?</AlertDialogTitle>
                      <AlertDialogDescription>Se borrará permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selected.id)} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
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