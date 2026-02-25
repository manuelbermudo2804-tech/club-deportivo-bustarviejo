import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MOTIVOS = [
  { value: "lesion_larga", label: "🏥 Lesión de larga duración", emoji: "🏥" },
  { value: "baja_anticipada", label: "🚪 Baja anticipada voluntaria", emoji: "🚪" },
  { value: "prorrateo_tardio", label: "📅 Prorrateo por inscripción tardía", emoji: "📅" },
  { value: "descuento_familiar", label: "👨‍👩‍👧 Descuento familiar", emoji: "👨‍👩‍👧" },
  { value: "otro", label: "✏️ Otro (escribir motivo)", emoji: "✏️" },
];

export default function FeeAdjustmentDialog({ open, onOpenChange, player, payments, onSuccess }) {
  const [motivoTipo, setMotivoTipo] = useState("");
  const [motivoCustom, setMotivoCustom] = useState("");
  const [nuevaCuota, setNuevaCuota] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  // Calcular cuota original desde pagos
  const playerPayments = (payments || []).filter(p => p.jugador_id === player?.id && !p.is_deleted);
  const cuotaOriginal = player?.ajuste_cuota?.cuota_original 
    || playerPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const totalPagado = playerPayments
    .filter(p => p.estado === "Pagado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const handleSave = async () => {
    if (!motivoTipo) { toast.error("Selecciona un motivo"); return; }
    if (motivoTipo === "otro" && !motivoCustom.trim()) { toast.error("Escribe el motivo personalizado"); return; }
    if (!nuevaCuota || Number(nuevaCuota) < 0) { toast.error("Introduce una cuota válida"); return; }

    const cuotaNum = Number(nuevaCuota);
    const motivo = motivoTipo === "otro" 
      ? motivoCustom.trim() 
      : MOTIVOS.find(m => m.value === motivoTipo)?.label || motivoTipo;

    setSaving(true);
    const currentUser = await base44.auth.me();

    // 1. Guardar ajuste en el jugador
    await base44.entities.Player.update(player.id, {
      ajuste_cuota: {
        cuota_original: cuotaOriginal,
        cuota_ajustada: cuotaNum,
        motivo,
        motivo_tipo: motivoTipo,
        notas: notas.trim() || null,
        ajustado_por: currentUser.email,
        fecha_ajuste: new Date().toISOString(),
      }
    });

    // 2. Recalcular pagos pendientes
    const pendientes = playerPayments
      .filter(p => p.estado === "Pendiente")
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    if (pendientes.length > 0) {
      const restante = Math.max(0, cuotaNum - totalPagado);
      
      if (pendientes.length === 1) {
        // Un solo pago pendiente: poner el restante
        await base44.entities.Payment.update(pendientes[0].id, { cantidad: restante });
      } else {
        // Varios pagos pendientes: repartir equitativamente
        const porPago = Math.round((restante / pendientes.length) * 100) / 100;
        for (let i = 0; i < pendientes.length; i++) {
          const cantidadPago = i === pendientes.length - 1
            ? Math.round((restante - porPago * (pendientes.length - 1)) * 100) / 100
            : porPago;
          await base44.entities.Payment.update(pendientes[i].id, { 
            cantidad: Math.max(0, cantidadPago) 
          });
        }
      }
    }

    setSaving(false);
    toast.success(`Cuota ajustada a ${cuotaNum}€`);
    onOpenChange(false);
    setMotivoTipo("");
    setMotivoCustom("");
    setNuevaCuota("");
    setNotas("");
    if (onSuccess) onSuccess();
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">💰 Ajustar Cuota</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info del jugador */}
          <div className="bg-slate-50 rounded-xl p-4 border">
            <p className="font-bold text-slate-900">{player.nombre}</p>
            <Badge className="bg-orange-100 text-orange-700 mt-1">{player.categoria_principal || player.deporte}</Badge>
          </div>

          {/* Cuota actual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
              <p className="text-xs text-blue-600 font-medium">Cuota Original</p>
              <p className="text-2xl font-bold text-blue-700">{cuotaOriginal.toFixed(0)}€</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-center">
              <p className="text-xs text-green-600 font-medium">Ya Pagado</p>
              <p className="text-2xl font-bold text-green-700">{totalPagado.toFixed(0)}€</p>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label className="font-semibold">Motivo del ajuste *</Label>
            <Select value={motivoTipo} onValueChange={setMotivoTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivoTipo === "otro" && (
              <Input
                placeholder="Escribe el motivo..."
                value={motivoCustom}
                onChange={e => setMotivoCustom(e.target.value)}
              />
            )}
          </div>

          {/* Nueva cuota */}
          <div className="space-y-2">
            <Label className="font-semibold">Nueva cuota total (€) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 165"
              value={nuevaCuota}
              onChange={e => setNuevaCuota(e.target.value)}
              className="text-lg font-bold"
            />
            {nuevaCuota && Number(nuevaCuota) < totalPagado && (
              <p className="text-xs text-red-600">⚠️ La nueva cuota es menor que lo ya pagado ({totalPagado}€). Se pondrán 0€ pendientes.</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label className="font-semibold">Notas (opcional)</Label>
            <Textarea
              placeholder="Ej: Lesión de rodilla desde octubre, 3 meses de baja..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
            />
          </div>

          {/* Preview del resultado */}
          {nuevaCuota && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-sm font-bold text-yellow-900 mb-2">👁️ Así lo verá la familia:</p>
              <div className="flex items-center gap-2">
                <span className="line-through text-slate-400 text-lg">{cuotaOriginal.toFixed(0)}€</span>
                <span className="text-2xl font-bold text-green-700">{Number(nuevaCuota).toFixed(0)}€</span>
              </div>
              <p className="text-xs text-yellow-800 mt-1">
                {motivoTipo === "otro" ? motivoCustom : MOTIVOS.find(m => m.value === motivoTipo)?.label || ""}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Ajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}