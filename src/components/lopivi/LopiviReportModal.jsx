import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIPOS = [
  "Sospecha de maltrato",
  "Acoso o bullying",
  "Conducta inadecuada de adulto",
  "Situación de riesgo",
  "Otro",
];

const RELACIONES = [
  "Padre/Madre/Tutor",
  "Jugador/a",
  "Entrenador/a",
  "Coordinador/a",
  "Otro miembro del club",
];

const generarCodigo = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `LOPIVI-${s.slice(0, 3)}-${s.slice(3)}`;
};

export default function LopiviReportModal({ open, onOpenChange, dpiEmail, dpiNombre }) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    tipo_incidencia: "",
    relacion_reportante: "",
    menor_afectado: "",
    categoria_equipo: "",
    descripcion: "",
    fecha_hechos: "",
    lugar_hechos: "",
    es_anonimo: false,
    reportante_nombre: "",
    reportante_email: "",
    reportante_telefono: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tipo_incidencia || !form.descripcion) {
      toast.error("Por favor indica el tipo y la descripción de la incidencia");
      return;
    }
    setSubmitting(true);
    try {
      const codigo = generarCodigo();
      await base44.entities.LopiviIncidencia.create({
        ...form,
        codigo_referencia: codigo,
        user_agent: navigator.userAgent,
        estado: "nueva",
      });

      // Intentar enviar notificación al DPI (sin bloquear si falla)
      try {
        await base44.functions.invoke("notifyLopiviIncidencia", {
          codigo,
          tipo: form.tipo_incidencia,
          es_anonimo: form.es_anonimo,
        });
      } catch (err) {
        console.warn("No se pudo enviar email al DPI:", err);
      }

      setSuccess(codigo);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar la incidencia. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccess(null);
      setForm({
        tipo_incidencia: "",
        relacion_reportante: "",
        menor_afectado: "",
        categoria_equipo: "",
        descripcion: "",
        fecha_hechos: "",
        lugar_hechos: "",
        es_anonimo: false,
        reportante_nombre: "",
        reportante_email: "",
        reportante_telefono: "",
      });
    }, 300);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Incidencia registrada</h3>
              <p className="text-slate-600 mt-2">
                {dpiNombre || "El Delegado de Protección"} ha sido notificado/a y se pondrá en contacto si es necesario.
              </p>
            </div>
            <div className="bg-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Código de referencia</p>
              <p className="font-mono font-bold text-lg text-slate-900">{success}</p>
              <p className="text-xs text-slate-500 mt-1">Guárdalo por si necesitas hacer seguimiento.</p>
            </div>
            <Button onClick={handleClose} className="w-full">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Reportar incidencia (LOPIVI)
          </DialogTitle>
          <DialogDescription>
            Toda la información es confidencial y solo la verá el Delegado/a de Protección.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Tipo de incidencia *</Label>
            <Select value={form.tipo_incidencia} onValueChange={(v) => setForm({ ...form, tipo_incidencia: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descripción de los hechos *</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Cuenta con el mayor detalle posible lo que ha pasado..."
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cuándo ocurrió</Label>
              <Input
                value={form.fecha_hechos}
                onChange={(e) => setForm({ ...form, fecha_hechos: e.target.value })}
                placeholder="Ej: 12 mayo en entreno"
              />
            </div>
            <div>
              <Label>Dónde</Label>
              <Input
                value={form.lugar_hechos}
                onChange={(e) => setForm({ ...form, lugar_hechos: e.target.value })}
                placeholder="Campo, vestuario..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Menor afectado</Label>
              <Input
                value={form.menor_afectado}
                onChange={(e) => setForm({ ...form, menor_afectado: e.target.value })}
                placeholder="Nombre (opcional)"
              />
            </div>
            <div>
              <Label>Categoría/equipo</Label>
              <Input
                value={form.categoria_equipo}
                onChange={(e) => setForm({ ...form, categoria_equipo: e.target.value })}
                placeholder="Ej: Alevín"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-2 mb-3">
              <Checkbox
                id="anonimo"
                checked={form.es_anonimo}
                onCheckedChange={(c) => setForm({ ...form, es_anonimo: !!c })}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="anonimo" className="cursor-pointer">Reportar de forma anónima</Label>
                <p className="text-xs text-slate-500">No dejaremos tus datos al DPI.</p>
              </div>
            </div>

            {!form.es_anonimo && (
              <div className="space-y-3">
                <div>
                  <Label>Tu relación con el club</Label>
                  <Select value={form.relacion_reportante} onValueChange={(v) => setForm({ ...form, relacion_reportante: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {RELACIONES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tu nombre</Label>
                  <Input
                    value={form.reportante_nombre}
                    onChange={(e) => setForm({ ...form, reportante_nombre: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.reportante_email}
                      onChange={(e) => setForm({ ...form, reportante_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={form.reportante_telefono}
                      onChange={(e) => setForm({ ...form, reportante_telefono: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : <><Send className="w-4 h-4 mr-2" />Enviar</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}