import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function StepDatosPersonales({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900 border-b pb-2">Datos del nuevo socio</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre y Apellidos *</Label>
          <Input
            id="nombre"
            name="name"
            autoComplete="name"
            value={formData.nombre_completo}
            onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
            placeholder="Ej: Juan García López"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dni">DNI *</Label>
          <Input
            id="dni"
            name="dni"
            autoComplete="off"
            value={formData.dni}
            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
            placeholder="12345678A"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono Móvil *</Label>
          <Input
            id="telefono"
            name="tel"
            type="tel"
            autoComplete="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="600123456"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_nacimiento">Fecha de nacimiento (opcional)</Label>
          <Input
            id="fecha_nacimiento"
            name="bday"
            type="date"
            value={formData.fecha_nacimiento || ""}
            onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="direccion">Dirección Completa *</Label>
          <Input
            id="direccion"
            name="street-address"
            autoComplete="street-address"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Calle, número, piso..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="municipio">Municipio *</Label>
          <Input
            id="municipio"
            name="address-level2"
            autoComplete="address-level2"
            value={formData.municipio}
            onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
            placeholder="Bustarviejo"
            required
          />
        </div>
      </div>
    </div>
  );
}