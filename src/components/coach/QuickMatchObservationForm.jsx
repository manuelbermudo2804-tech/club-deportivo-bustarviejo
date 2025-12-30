import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { X, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const RATING_LABELS = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Normal",
  4: "Bien",
  5: "Excelente"
};

export default function QuickMatchObservationForm({ 
  categoria, 
  rival = "",
  fechaPartido = "",
  jornada = "",
  onSave, 
  onCancel,
  entrenadorEmail,
  entrenadorNombre 
}) {
  const [formData, setFormData] = useState({
    categoria: categoria || "",
    rival: rival || "",
    fecha_partido: fechaPartido || new Date().toISOString().split('T')[0],
    resultado: "",
    goles_primera_parte: "",
    goles_segunda_parte: "",
    estado_fisico: 3,
    ocasiones_claras: "",
    solidez_defensiva: 3,
    control_partido: 3,
    observaciones: "",
    temporada: "2025/2026",
    jornada: jornada || ""
  });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

   const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      if (step === 1 && (!formData.rival || !formData.resultado)) {
        toast.error("Rellena rival y resultado");
        return;
      }
      setStep(step + 1);
      return;
    }

    if (!formData.rival || !formData.resultado) {
      toast.error("Rellena rival y resultado");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        entrenador_email: entrenadorEmail,
        entrenador_nombre: entrenadorNombre,
        goles_primera_parte: formData.goles_primera_parte ? parseInt(formData.goles_primera_parte) : null,
        goles_segunda_parte: formData.goles_segunda_parte ? parseInt(formData.goles_segunda_parte) : null,
        ocasiones_claras: formData.ocasiones_claras ? parseInt(formData.ocasiones_claras) : null,
        jornada: formData.jornada ? parseInt(formData.jornada) : null
      });
      setSuccessOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const RatingSelector = ({ label, value, onChange }) => (
    <div>
      <Label className="text-xs text-slate-600 mb-1 block">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`flex-1 py-2 px-1 text-xs font-semibold rounded transition-colors ${
              value === rating
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1 text-center">
        {RATING_LABELS[value]}
      </p>
    </div>
  );

  return (<>
    <Card className="border-2 border-orange-500">
      <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Registro Post-Partido
          </CardTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
            <span className={`${step >= 1 ? 'text-orange-700 font-semibold' : ''}`}>1. Datos</span>
            <span className={`${step >= 2 ? 'text-orange-700 font-semibold' : ''}`}>2. Métricas</span>
            <span className={`${step >= 3 ? 'text-orange-700 font-semibold' : ''}`}>3. Valoración</span>
          </div>
          <Progress value={step === 1 ? 33 : step === 2 ? 66 : 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Rival <span className="text-red-600">*</span></Label>
                  <Input value={formData.rival} onChange={(e) => setFormData({ ...formData, rival: e.target.value })} placeholder="CD Rival" className="h-9 bg-slate-100" disabled={!!rival} required />
                </div>
                <div>
                  <Label className="text-xs">Resultado <span className="text-red-600">*</span></Label>
                  <Input value={formData.resultado} onChange={(e) => setFormData({ ...formData, resultado: e.target.value })} placeholder="2-1 (V)" className="h-9" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={formData.fecha_partido} onChange={(e) => setFormData({ ...formData, fecha_partido: e.target.value })} className="h-9 bg-slate-100" disabled={!!fechaPartido} />
                </div>
                <div>
                  <Label className="text-xs">Jornada</Label>
                  <Input type="number" value={formData.jornada} onChange={(e) => setFormData({ ...formData, jornada: e.target.value })} placeholder="5" className="h-9 bg-slate-100" disabled={!!jornada} />
                </div>
                <div>
                  <Label className="text-xs">Temporada</Label>
                  <Input value={formData.temporada} onChange={(e) => setFormData({ ...formData, temporada: e.target.value })} className="h-9 bg-slate-100" disabled />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Campos con <span className="text-red-600">*</span> son obligatorios</p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Goles 1ª Parte</Label>
                  <Input type="number" min="0" value={formData.goles_primera_parte} onChange={(e) => setFormData({ ...formData, goles_primera_parte: e.target.value })} placeholder="0" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Goles 2ª Parte</Label>
                  <Input type="number" min="0" value={formData.goles_segunda_parte} onChange={(e) => setFormData({ ...formData, goles_segunda_parte: e.target.value })} placeholder="0" className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Ocasiones Claras de Gol</Label>
                <Input type="number" min="0" value={formData.ocasiones_claras} onChange={(e) => setFormData({ ...formData, ocasiones_claras: e.target.value })} placeholder="3-4" className="h-9" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Goles 1ª Parte</Label>
                  <Input type="number" min="0" value={formData.goles_primera_parte} onChange={(e) => setFormData({ ...formData, goles_primera_parte: e.target.value })} placeholder="0" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Goles 2ª Parte</Label>
                  <Input type="number" min="0" value={formData.goles_segunda_parte} onChange={(e) => setFormData({ ...formData, goles_segunda_parte: e.target.value })} placeholder="0" className="h-9" />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Ocasiones Claras de Gol</Label>
                <Input type="number" min="0" value={formData.ocasiones_claras} onChange={(e) => setFormData({ ...formData, ocasiones_claras: e.target.value })} placeholder="3-4" className="h-9" />
              </div>

              <div className="space-y-2 mt-4">
                <RatingSelector label="💪 Estado Físico del Equipo" value={formData.estado_fisico} onChange={(val) => setFormData({ ...formData, estado_fisico: val })} />
                <RatingSelector label="🛡️ Solidez Defensiva" value={formData.solidez_defensiva} onChange={(val) => setFormData({ ...formData, solidez_defensiva: val })} />
                <RatingSelector label="⚽ Control del Partido" value={formData.control_partido} onChange={(val) => setFormData({ ...formData, control_partido: val })} />
              </div>
              <div>
                <Label className="text-xs">Observaciones (opcional)</Label>
                <Textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} placeholder="Qué funcionó bien / Qué mejorar..." className="h-16 text-sm" />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">Atrás</Button>
            )}
            <Button type={step === 3 ? 'submit' : 'button'} onClick={step === 3 ? undefined : () => setStep(step + 1)} disabled={step === 1 && (!formData.rival || !formData.resultado) || saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {step === 3 ? (saving ? 'Guardando…' : (<><Zap className="w-4 h-4 mr-2" /> Guardar</>)) : 'Siguiente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    <Dialog open={successOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" /> Registro enviado
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">Tu observación post‑partido se ha guardado correctamente.</p>
        <DialogFooter>
          <Button onClick={() => { setSuccessOpen(false); onCancel && onCancel(); }} className="bg-green-600 hover:bg-green-700">Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>);
    }