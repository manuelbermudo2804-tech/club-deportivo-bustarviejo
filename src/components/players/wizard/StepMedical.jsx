import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart } from "lucide-react";

export default function StepMedical({ currentPlayer, setCurrentPlayer }) {
  const fm = currentPlayer.ficha_medica || {};
  const update = (field, value) => {
    setCurrentPlayer({
      ...currentPlayer,
      ficha_medica: { ...fm, [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-600" /> Ficha Médica y Emergencias
      </h3>
      <p className="text-sm text-slate-600">
        Estos datos son muy importantes para la seguridad de tu hijo/a. Aunque no son obligatorios, te recomendamos completarlos.
      </p>

      {/* Datos médicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Alergias</Label>
          <Textarea value={fm.alergias || ""} onChange={(e) => update("alergias", e.target.value)} rows={2} placeholder="Alimentos, medicamentos, etc." />
        </div>
        <div className="space-y-2">
          <Label>Grupo Sanguíneo</Label>
          <Select value={fm.grupo_sanguineo || ""} onValueChange={(v) => update("grupo_sanguineo", v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Medicación Habitual</Label>
          <Textarea value={fm.medicacion_habitual || ""} onChange={(e) => update("medicacion_habitual", e.target.value)} rows={2} placeholder="Medicamentos que toma regularmente" />
        </div>
        <div className="space-y-2">
          <Label>Condiciones Médicas</Label>
          <Textarea value={fm.condiciones_medicas || ""} onChange={(e) => update("condiciones_medicas", e.target.value)} rows={2} placeholder="Asma, diabetes, epilepsia, etc." />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Lesiones o Historial Relevante</Label>
          <Textarea value={fm.lesiones || ""} onChange={(e) => update("lesiones", e.target.value)} rows={2} placeholder="Lesiones previas o actuales" />
        </div>
      </div>

      {/* Contactos de emergencia */}
      <div className="border-t pt-4 space-y-4">
        <h4 className="font-semibold text-red-800">📞 Contactos de Emergencia</h4>

        <div className="bg-red-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">Contacto 1</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Nombre</Label>
              <Input value={fm.contacto_emergencia_nombre || ""} onChange={(e) => update("contacto_emergencia_nombre", e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Teléfono</Label>
              <ValidatedInput validationType="telefono" type="tel" value={fm.contacto_emergencia_telefono || ""} onChange={(e) => update("contacto_emergencia_telefono", e.target.value)} placeholder="600 123 456" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">Contacto 2</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Nombre</Label>
              <Input value={fm.contacto_emergencia_2_nombre || ""} onChange={(e) => update("contacto_emergencia_2_nombre", e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Teléfono</Label>
              <ValidatedInput validationType="telefono" type="tel" value={fm.contacto_emergencia_2_telefono || ""} onChange={(e) => update("contacto_emergencia_2_telefono", e.target.value)} placeholder="600 654 321" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}