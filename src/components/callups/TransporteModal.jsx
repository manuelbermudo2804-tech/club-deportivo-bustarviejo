import React, { useState, useEffect } from "react";
import { Car, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TRANSPORTE_OPTIONS = [
  { value: "ofrezco_plazas", emoji: "🚗", label: "Ofrezco plazas en mi coche", color: "border-green-300 bg-green-50 hover:bg-green-100 text-green-800", active: "ring-2 ring-green-500 bg-green-100 border-green-400" },
  { value: "necesito_transporte", emoji: "🙋", label: "Necesito transporte", color: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800", active: "ring-2 ring-orange-500 bg-orange-100 border-orange-400" },
  { value: "voy_por_mi_cuenta", emoji: "👍", label: "Voy por mi cuenta", color: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700", active: "ring-2 ring-slate-400 bg-slate-100 border-slate-400" },
];

export default function TransporteModal({ open, onOpenChange, existingTransporte, playerName, userPhone, userName, onSave, isSaving }) {
  const [tipo, setTipo] = useState(existingTransporte?.tipo || "");
  const [plazas, setPlazas] = useState(existingTransporte?.plazas || 1);
  const [puntoSalida, setPuntoSalida] = useState(existingTransporte?.punto_salida || "");
  const [telefono, setTelefono] = useState(existingTransporte?.telefono_contacto || userPhone || "");
  const [nombreContacto, setNombreContacto] = useState(existingTransporte?.nombre_contacto || userName || "");

  useEffect(() => {
    if (open) {
      setTipo(existingTransporte?.tipo || "");
      setPlazas(existingTransporte?.plazas || 1);
      setPuntoSalida(existingTransporte?.punto_salida || "");
      setTelefono(existingTransporte?.telefono_contacto || userPhone || "");
      setNombreContacto(existingTransporte?.nombre_contacto || userName || "");
    }
  }, [open, existingTransporte, userPhone, userName]);

  const handleSave = () => {
    if (!tipo) return;
    const data = {
      tipo,
      plazas: tipo === "voy_por_mi_cuenta" ? 0 : Number(plazas),
      punto_salida: tipo === "ofrezco_plazas" ? puntoSalida : "",
      telefono_contacto: tipo !== "voy_por_mi_cuenta" ? telefono : "",
      nombre_contacto: nombreContacto,
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Transporte al Partido
          </DialogTitle>
          <DialogDescription>
            <strong>{playerName}</strong> — ¿Cómo vais al partido?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de transporte */}
          <div className="space-y-2">
            {TRANSPORTE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTipo(opt.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all font-medium text-left ${
                  tipo === opt.value ? opt.active : opt.color
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Campos extra según tipo */}
          {tipo === "ofrezco_plazas" && (
            <div className="space-y-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div>
                <Label className="text-sm font-semibold text-green-800">Plazas libres</Label>
                <div className="flex items-center gap-2 mt-1">
                  {[1,2,3,4,5,6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlazas(n)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                        plazas === n 
                          ? 'bg-green-600 text-white shadow-md' 
                          : 'bg-white border border-green-300 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-green-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> ¿Desde dónde sales?
                </Label>
                <Input
                  placeholder="Ej: Bustarviejo, Plaza Mayor"
                  value={puntoSalida}
                  onChange={(e) => setPuntoSalida(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {tipo === "necesito_transporte" && (
            <div className="space-y-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
              <div>
                <Label className="text-sm font-semibold text-orange-800">¿Cuántas plazas necesitas?</Label>
                <div className="flex items-center gap-2 mt-1">
                  {[1,2,3,4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlazas(n)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                        plazas === n 
                          ? 'bg-orange-600 text-white shadow-md' 
                          : 'bg-white border border-orange-300 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Datos de contacto (si ofrece o necesita) */}
          {tipo && tipo !== "voy_por_mi_cuenta" && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs font-semibold text-blue-700">📱 Datos de contacto (visibles para otros padres)</p>
              <div>
                <Label className="text-sm text-blue-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Tu nombre
                </Label>
                <Input
                  placeholder="Ej: Juan García"
                  value={nombreContacto}
                  onChange={(e) => setNombreContacto(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-blue-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Tu teléfono (para WhatsApp)
                </Label>
                <Input
                  type="tel"
                  placeholder="Ej: 612 345 678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tipo || isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar transporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}