import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Info } from "lucide-react";
import InscriptionPaymentFlow from "../inscriptions/InscriptionPaymentFlow";
import { useActiveSeason } from "../season/SeasonProvider";
import { playerAllCategories } from "../utils/playerCategoryFilter";
import { toast } from "sonner";

/**
 * Permite a un jugador YA inscrito apuntarse a una categoría EXTRA
 * (marcada como "disponible_como_extra" en Gestión de Categorías).
 * Reutiliza su documentación existente y le muestra el flujo de pago normal.
 */
export default function AddExtraActivityDialog({ player, open, onOpenChange, onDone }) {
  const { activeSeason: currentSeason, seasonConfig } = useActiveSeason();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['extraCategoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true, disponible_como_extra: true }),
    enabled: open,
  });

  // Categorías extra a las que el jugador AÚN no pertenece
  const currentCats = playerAllCategories(player).map(c => (c || '').trim().toLowerCase());
  const availableExtras = categoryConfigs.filter(
    (c) => !currentCats.includes((c.nombre || '').trim().toLowerCase())
  );

  const handleSelect = (cat) => {
    setSelectedCategory(cat);
    setShowPayment(true);
  };

  const handlePaymentContinue = async (paymentsData) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const { data: result } = await base44.functions.invoke('playerRenewalAction', {
        action: 'add_extra_category',
        playerId: player.id,
        categoria: selectedCategory.nombre,
        payments: paymentsData?.payments || [],
        temporada: seasonConfig?.temporada
      });
      if (!result?.success) throw new Error(result?.error || 'Error al añadir la actividad');
      toast.success(`${player.nombre} apuntado a ${selectedCategory.nombre}`);
      onDone?.();
      handleClose();
    } catch (err) {
      console.error('[AddExtraActivityDialog] Error:', err);
      toast.error('Error al añadir la actividad: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setShowPayment(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            {showPayment ? `Apuntar a ${selectedCategory?.nombre}` : "Apuntarme a otra actividad"}
          </DialogTitle>
        </DialogHeader>

        {!showPayment ? (
          <div className="space-y-4 py-2">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>{player?.nombre}</strong> ya está inscrito, así que su documentación se reutiliza.
                Solo elige la actividad y la forma de pago.
              </AlertDescription>
            </Alert>

            {availableExtras.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay actividades adicionales disponibles ahora mismo.
              </div>
            ) : (
              <div className="space-y-2">
                {availableExtras.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{cat.nombre}</p>
                      <p className="text-xs text-slate-500">{cat.deporte || 'Fútbol'}</p>
                    </div>
                    <span className="text-blue-700 font-bold">{cat.cuota_total}€</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-2">
            <InscriptionPaymentFlow
              playerData={{ ...player, deporte: selectedCategory.nombre }}
              seasonConfig={seasonConfig}
              categoryConfigs={[selectedCategory]}
              descuentoHermano={0}
              onContinue={handlePaymentContinue}
              userEmail={player?.email_padre}
            />
            <Button variant="ghost" className="w-full mt-2" onClick={() => setShowPayment(false)}>
              ← Elegir otra actividad
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}