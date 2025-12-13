import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, CheckCircle2 } from "lucide-react";

export default function ClothingOrderSuccess({ isOpen, onClose, orderDetails }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="py-8 text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-green-800">¡Pedido Registrado!</h2>
            <p className="text-green-700 text-lg">
              Tu pedido de equipación ha sido recibido correctamente
            </p>
          </div>

          {orderDetails && (
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm text-slate-600">
                <strong>Jugador:</strong> {orderDetails.jugador_nombre}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Total:</strong> {orderDetails.precio_total}€
              </p>
              {orderDetails.credito_aplicado > 0 && (
                <p className="text-sm text-purple-600">
                  🎁 <strong>Crédito aplicado:</strong> -{orderDetails.credito_aplicado}€
                </p>
              )}
              <p className="text-sm text-slate-600">
                <strong>Estado:</strong> En revisión
              </p>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              📦 <strong>Recogida en Septiembre</strong>
              <br />
              <span className="text-xs text-blue-700">
                Podrás recoger tu pedido en las instalaciones del club durante la primera semana de Septiembre
              </span>
            </p>
          </div>

          <Button 
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700 px-8 py-6 text-lg w-full"
          >
            ✅ Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}