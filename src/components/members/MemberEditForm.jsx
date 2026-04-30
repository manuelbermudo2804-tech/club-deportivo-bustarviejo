import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, X } from "lucide-react";

export default function MemberEditForm({ member, open, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    nombre_completo: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
    municipio: "",
    tipo_inscripcion: "Nueva Inscripción",
    estado_pago: "Pendiente",
    metodo_pago: "Transferencia",
    cuota_socio: 25,
    es_segundo_progenitor: false,
    es_socio_externo: false,
    notas: ""
  });

  useEffect(() => {
    if (member) {
      setFormData({
        nombre_completo: member.nombre_completo || "",
        dni: member.dni || "",
        telefono: member.telefono || "",
        email: member.email || "",
        direccion: member.direccion || "",
        municipio: member.municipio || "",
        tipo_inscripcion: member.tipo_inscripcion || "Nueva Inscripción",
        estado_pago: member.estado_pago || "Pendiente",
        metodo_pago: member.metodo_pago || "Transferencia",
        cuota_socio: member.cuota_socio || 25,
        es_segundo_progenitor: member.es_segundo_progenitor || false,
        es_socio_externo: member.es_socio_externo || false,
        notas: member.notas || ""
      });
    }
  }, [member]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            ✏️ Editar Socio
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="md:col-span-2">
              <Label htmlFor="nombre_completo">Nombre Completo *</Label>
              <Input
                id="nombre_completo"
                value={formData.nombre_completo}
                onChange={(e) => handleChange("nombre_completo", e.target.value)}
                required
              />
            </div>

            {/* DNI */}
            <div>
              <Label htmlFor="dni">DNI *</Label>
              <ValidatedInput
                id="dni"
                validationType="dni"
                value={formData.dni}
                onChange={(e) => handleChange("dni", e.target.value)}
                required
              />
            </div>

            {/* Teléfono */}
            <div>
              <Label htmlFor="telefono">Teléfono *</Label>
              <ValidatedInput
                id="telefono"
                validationType="telefono"
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <Label htmlFor="email">Email *</Label>
              <ValidatedInput
                id="email"
                validationType="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <Label htmlFor="direccion">Dirección *</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => handleChange("direccion", e.target.value)}
                required
              />
            </div>

            {/* Municipio */}
            <div>
              <Label htmlFor="municipio">Municipio *</Label>
              <Input
                id="municipio"
                value={formData.municipio}
                onChange={(e) => handleChange("municipio", e.target.value)}
                required
              />
            </div>

            {/* Cuota */}
            <div>
              <Label htmlFor="cuota_socio">Cuota (€)</Label>
              <Input
                id="cuota_socio"
                type="number"
                value={formData.cuota_socio}
                onChange={(e) => handleChange("cuota_socio", parseFloat(e.target.value))}
              />
            </div>

            {/* Tipo inscripción */}
            <div>
              <Label>Tipo de Inscripción</Label>
              <Select value={formData.tipo_inscripcion} onValueChange={(v) => handleChange("tipo_inscripcion", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nueva Inscripción">Nueva Inscripción</SelectItem>
                  <SelectItem value="Renovación">Renovación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado de pago */}
            <div>
              <Label>Estado de Pago</Label>
              <Select value={formData.estado_pago} onValueChange={(v) => handleChange("estado_pago", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En revisión">En revisión</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Fallido">Fallido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div>
              <Label>Método de Pago</Label>
              <Select value={formData.metodo_pago} onValueChange={(v) => handleChange("metodo_pago", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Bizum">Bizum</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Switches */}
            <div className="md:col-span-2 flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.es_segundo_progenitor}
                  onCheckedChange={(v) => handleChange("es_segundo_progenitor", v)}
                />
                <Label>Es 2º Progenitor</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.es_socio_externo}
                  onCheckedChange={(v) => handleChange("es_socio_externo", v)}
                />
                <Label>Socio Externo (sin hijos en el club)</Label>
              </div>
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => handleChange("notas", e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}