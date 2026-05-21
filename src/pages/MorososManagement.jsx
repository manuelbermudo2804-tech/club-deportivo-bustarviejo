import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Upload, AlertTriangle, Check, Ban, Trash2, FileSpreadsheet, Search, ArrowLeft, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DebtDocumentsManager from "@/components/debts/DebtDocumentsManager";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", color: "bg-red-100 text-red-700" },
  { value: "pagada", label: "Pagada", color: "bg-green-100 text-green-700" },
  { value: "condonada", label: "Condonada", color: "bg-slate-100 text-slate-700" },
];

const emptyForm = {
  email_familia: "",
  dni_jugador: "",
  dni_tutor: "",
  jugador_nombre: "",
  tutor_nombre: "",
  importe: "",
  temporada_origen: "",
  concepto: "",
  notas_admin: "",
  documentos_adjuntos: [],
};

export default function MorososManagement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const { data: deudas = [], isLoading } = useQuery({
    queryKey: ["deudas"],
    queryFn: () => base44.entities.Deuda.list("-created_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const me = await base44.auth.me();
      return base44.entities.Deuda.create({
        ...data,
        importe: Number(data.importe),
        email_familia: data.email_familia.toLowerCase().trim(),
        dni_jugador: (data.dni_jugador || "").toUpperCase().trim(),
        dni_tutor: (data.dni_tutor || "").toUpperCase().trim(),
        creada_por: me.email,
        estado: "pendiente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      toast.success("Deuda registrada");
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const me = await base44.auth.me();
      return base44.entities.Deuda.update(id, {
        ...data,
        actualizada_por: me.email,
        fecha_actualizacion: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      toast.success("Deuda actualizada");
      setEditing(null);
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Deuda.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      toast.success("Deuda eliminada");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email_familia || !form.importe || !form.temporada_origen || !form.concepto) {
      toast.error("Faltan campos obligatorios (email, importe, temporada, concepto)");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (deuda) => {
    setEditing(deuda);
    setForm({
      email_familia: deuda.email_familia || "",
      dni_jugador: deuda.dni_jugador || "",
      dni_tutor: deuda.dni_tutor || "",
      jugador_nombre: deuda.jugador_nombre || "",
      tutor_nombre: deuda.tutor_nombre || "",
      importe: deuda.importe || "",
      temporada_origen: deuda.temporada_origen || "",
      concepto: deuda.concepto || "",
      notas_admin: deuda.notas_admin || "",
      documentos_adjuntos: Array.isArray(deuda.documentos_adjuntos) ? deuda.documentos_adjuntos : [],
    });
    setShowForm(true);
  };

  const handleMarkPaid = (deuda) => {
    if (!confirm(`¿Marcar como PAGADA la deuda de ${deuda.importe}€ de ${deuda.tutor_nombre || deuda.email_familia}?`)) return;
    updateMutation.mutate({ id: deuda.id, data: { estado: "pagada", fecha_pago: new Date().toISOString().split("T")[0] } });
  };

  const handleMarkCondonada = (deuda) => {
    if (!confirm(`¿Marcar como CONDONADA la deuda de ${deuda.importe}€? Esto la cancela sin cobro.`)) return;
    updateMutation.mutate({ id: deuda.id, data: { estado: "condonada" } });
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar permanentemente esta deuda?")) return;
    deleteMutation.mutate(id);
  };

  // Importación CSV: email,dni_jugador,jugador_nombre,tutor_nombre,importe,temporada,concepto
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("Archivo vacío");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const idxEmail = headers.indexOf("email");
      const idxImporte = headers.indexOf("importe");
      const idxTemp = headers.indexOf("temporada");
      const idxConcepto = headers.indexOf("concepto");
      if (idxEmail < 0 || idxImporte < 0 || idxTemp < 0 || idxConcepto < 0) {
        throw new Error("Cabeceras requeridas: email, importe, temporada, concepto (opcionales: dni_jugador, jugador_nombre, tutor_nombre, dni_tutor)");
      }
      const idxDniJug = headers.indexOf("dni_jugador");
      const idxJugador = headers.indexOf("jugador_nombre");
      const idxTutor = headers.indexOf("tutor_nombre");
      const idxDniTut = headers.indexOf("dni_tutor");

      const me = await base44.auth.me();
      const rows = lines.slice(1).map(l => {
        const cols = l.split(",");
        return {
          email_familia: (cols[idxEmail] || "").trim().toLowerCase(),
          dni_jugador: idxDniJug >= 0 ? (cols[idxDniJug] || "").trim().toUpperCase() : "",
          dni_tutor: idxDniTut >= 0 ? (cols[idxDniTut] || "").trim().toUpperCase() : "",
          jugador_nombre: idxJugador >= 0 ? (cols[idxJugador] || "").trim() : "",
          tutor_nombre: idxTutor >= 0 ? (cols[idxTutor] || "").trim() : "",
          importe: Number((cols[idxImporte] || "0").trim().replace(",", ".")),
          temporada_origen: (cols[idxTemp] || "").trim(),
          concepto: (cols[idxConcepto] || "").trim(),
          estado: "pendiente",
          creada_por: me.email,
        };
      }).filter(r => r.email_familia && r.importe > 0);

      if (rows.length === 0) throw new Error("No hay filas válidas");

      await base44.entities.Deuda.bulkCreate(rows);
      queryClient.invalidateQueries({ queryKey: ["deudas"] });
      toast.success(`Importadas ${rows.length} deudas`);
      setShowImport(false);
    } catch (err) {
      toast.error("Error importando: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filtrado
  const filtered = deudas.filter(d => {
    if (filtroEstado !== "all" && d.estado !== filtroEstado) return false;
    if (search) {
      const s = search.toLowerCase();
      return d.email_familia?.toLowerCase().includes(s)
        || d.jugador_nombre?.toLowerCase().includes(s)
        || d.tutor_nombre?.toLowerCase().includes(s)
        || d.dni_jugador?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalPendiente = deudas.filter(d => d.estado === "pendiente").reduce((s, d) => s + (Number(d.importe) || 0), 0);
  const countPendiente = deudas.filter(d => d.estado === "pendiente").length;
  const totalPagado = deudas.filter(d => d.estado === "pagada").reduce((s, d) => s + (Number(d.importe) || 0), 0);

  return (
    <div className="min-h-screen p-4 lg:p-8 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <Link to={createPageUrl("Payments")} className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Volver a Pagos
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            Gestión de Morosos
          </h1>
          <p className="text-slate-600 mt-1">
            Registra deudas de temporadas anteriores. Se detectarán automáticamente en nuevas inscripciones/renovaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Importar CSV
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" /> Nueva Deuda
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">Pendiente de cobro</p>
            <p className="text-3xl font-bold text-red-700">{totalPendiente.toFixed(2)} €</p>
            <p className="text-xs text-red-600">{countPendiente} deuda(s)</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-700">Recuperado</p>
            <p className="text-3xl font-bold text-green-700">{totalPagado.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-700">Total registros</p>
            <p className="text-3xl font-bold">{deudas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por email, nombre o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="pagada">Pagadas</SelectItem>
              <SelectItem value="condonada">Condonadas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Deudas registradas ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-slate-500">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No hay deudas con estos filtros</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(d => {
                const estadoInfo = ESTADOS.find(e => e.value === d.estado);
                return (
                  <div key={d.id} className="border rounded-lg p-3 hover:bg-slate-50 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={estadoInfo?.color}>{estadoInfo?.label}</Badge>
                        <span className="font-semibold">{d.jugador_nombre || d.tutor_nombre || d.email_familia}</span>
                        <span className="text-xs text-slate-500">· Temp. {d.temporada_origen}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{d.concepto}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.email_familia}
                        {d.dni_jugador && ` · DNI Jug: ${d.dni_jugador}`}
                        {d.dni_tutor && ` · DNI Tutor: ${d.dni_tutor}`}
                      </p>
                      {d.notas_admin && <p className="text-xs italic text-slate-500 mt-1">📝 {d.notas_admin}</p>}
                      {Array.isArray(d.documentos_adjuntos) && d.documentos_adjuntos.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {d.documentos_adjuntos.length} archivo(s) adjunto(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-700">{Number(d.importe).toFixed(2)} €</p>
                        {d.fecha_pago && <p className="text-xs text-green-600">Pagada {d.fecha_pago}</p>}
                      </div>
                      <div className="flex gap-1">
                        {d.estado === "pendiente" && (
                          <>
                            <Button size="sm" variant="outline" className="border-green-500 text-green-700" onClick={() => handleMarkPaid(d)} title="Marcar pagada">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-500" onClick={() => handleMarkCondonada(d)} title="Condonar">
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(d)}>Editar</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar deuda" : "Nueva deuda"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Email familia *</Label>
                <Input type="email" required value={form.email_familia} onChange={(e) => setForm({ ...form, email_familia: e.target.value })} placeholder="padre@ejemplo.com" />
              </div>
              <div>
                <Label>Importe (€) *</Label>
                <Input type="number" step="0.01" required value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
              </div>
              <div>
                <Label>Temporada origen *</Label>
                <Input required value={form.temporada_origen} onChange={(e) => setForm({ ...form, temporada_origen: e.target.value })} placeholder="2025-2026" />
              </div>
              <div>
                <Label>Nombre del jugador</Label>
                <Input value={form.jugador_nombre} onChange={(e) => setForm({ ...form, jugador_nombre: e.target.value })} />
              </div>
              <div>
                <Label>DNI Jugador</Label>
                <Input value={form.dni_jugador} onChange={(e) => setForm({ ...form, dni_jugador: e.target.value })} placeholder="12345678A" />
              </div>
              <div>
                <Label>Nombre del tutor</Label>
                <Input value={form.tutor_nombre} onChange={(e) => setForm({ ...form, tutor_nombre: e.target.value })} />
              </div>
              <div>
                <Label>DNI Tutor</Label>
                <Input value={form.dni_tutor} onChange={(e) => setForm({ ...form, dni_tutor: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input required value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Cuota fraccionada Diciembre impagada" />
            </div>
            <div>
              <Label>Notas internas</Label>
              <Textarea value={form.notas_admin} onChange={(e) => setForm({ ...form, notas_admin: e.target.value })} rows={2} />
            </div>
            <div className="pt-2 border-t">
              <DebtDocumentsManager
                documentos={form.documentos_adjuntos}
                onChange={(docs) => setForm({ ...form, documentos_adjuntos: docs })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Actualizar" : "Guardar deuda"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar deudas desde CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">El CSV debe tener estas columnas (cabecera en la primera fila):</p>
            <code className="block text-xs bg-slate-100 p-2 rounded">
              email,importe,temporada,concepto,dni_jugador,jugador_nombre,tutor_nombre,dni_tutor
            </code>
            <p className="text-xs text-slate-500">Las 4 primeras son obligatorias. Las demás son opcionales.</p>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="block w-full text-sm" disabled={importing} />
            {importing && <p className="text-sm text-orange-600">Importando...</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}