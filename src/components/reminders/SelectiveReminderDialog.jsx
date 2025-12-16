import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Bell } from "lucide-react";

export default function SelectiveReminderDialog({ 
  open, 
  onClose, 
  family, 
  onSend 
}) {
  const [selectedPayments, setSelectedPayments] = useState(() => {
    // Por defecto, seleccionar todos
    const initial = {};
    family.jugadores.forEach(jugador => {
      if (jugador.hasPendingPayments) {
        initial[jugador.id] = jugador.pendingMonths.map(m => m.mes);
      }
    });
    return initial;
  });
  const [sending, setSending] = useState(false);

  const toggleJugador = (jugadorId, allMonths) => {
    if (selectedPayments[jugadorId]?.length === allMonths.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedPayments(prev => {
        const newState = { ...prev };
        delete newState[jugadorId];
        return newState;
      });
    } else {
      // Seleccionar todos los meses de este jugador
      setSelectedPayments(prev => ({
        ...prev,
        [jugadorId]: allMonths
      }));
    }
  };

  const toggleMonth = (jugadorId, mes) => {
    setSelectedPayments(prev => {
      const jugadorMonths = prev[jugadorId] || [];
      if (jugadorMonths.includes(mes)) {
        // Deseleccionar este mes
        const newMonths = jugadorMonths.filter(m => m !== mes);
        if (newMonths.length === 0) {
          const newState = { ...prev };
          delete newState[jugadorId];
          return newState;
        }
        return { ...prev, [jugadorId]: newMonths };
      } else {
        // Seleccionar este mes
        return { ...prev, [jugadorId]: [...jugadorMonths, mes] };
      }
    });
  };

  const handleSend = async () => {
    setSending(true);
    await onSend(selectedPayments);
    setSending(false);
    onClose();
  };

  const totalSelected = Object.values(selectedPayments).reduce((sum, months) => sum + months.length, 0);
  const totalAmount = family.jugadores.reduce((sum, jugador) => {
    const selectedMonths = selectedPayments[jugador.id] || [];
    return sum + jugador.pendingMonths
      .filter(m => selectedMonths.includes(m.mes))
      .reduce((s, m) => s + m.cantidad, 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 Seleccionar Pagos a Recordar
          </DialogTitle>
          <p className="text-sm text-slate-600">
            {family.nombre_tutor} • {family.email}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {family.jugadores.map(jugador => {
            if (!jugador.hasPendingPayments) return null;
            
            const jugadorMonths = selectedPayments[jugador.id] || [];
            const allSelected = jugadorMonths.length === jugador.pendingMonths.length;
            const someSelected = jugadorMonths.length > 0;

            return (
              <div key={jugador.id} className="border rounded-lg p-4 space-y-3">
                {/* Header del jugador con checkbox general */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleJugador(jugador.id, jugador.pendingMonths.map(m => m.mes))}
                    className="h-5 w-5"
                  />
                  {jugador.foto_url ? (
                    <img src={jugador.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                      {jugador.nombre.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{jugador.nombre}</p>
                    <p className="text-xs text-slate-600">{jugador.deporte}</p>
                  </div>
                  {someSelected && (
                    <Badge variant={allSelected ? "default" : "secondary"}>
                      {jugadorMonths.length}/{jugador.pendingMonths.length} meses
                    </Badge>
                  )}
                </div>

                {/* Meses individuales */}
                <div className="pl-12 space-y-2">
                  {jugador.pendingMonths.map(month => {
                    const isSelected = jugadorMonths.includes(month.mes);
                    return (
                      <div 
                        key={month.mes}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-2 border-blue-200' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => toggleMonth(jugador.id, month.mes)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMonth(jugador.id, month.mes)}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {month.mes}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {month.cantidad}€
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen */}
        <div className="bg-slate-100 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600">Pagos seleccionados:</p>
              <p className="text-2xl font-bold text-slate-900">{totalSelected}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Total a recordar:</p>
              <p className="text-2xl font-bold text-orange-600">{totalAmount.toFixed(0)}€</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={totalSelected === 0 || sending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Enviar Recordatorio ({totalSelected})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}