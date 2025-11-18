import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, MessageCircle, Send, Loader2 } from "lucide-react";

export default function IndividualReminderDialog({ isOpen, onClose, payment, player, onSend }) {
  const [method, setMethod] = useState("email");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const defaultMessage = `Estimados padres/tutores,

Les recordamos que tienen un pago pendiente:

Jugador: ${payment?.jugador_nombre}
Periodo: ${payment?.mes}
Temporada: ${payment?.temporada}
Cantidad: ${payment?.cantidad}€
Vencimiento: 30 de ${payment?.mes}

Por favor, realiza el pago y sube el justificante en la aplicación.

Atentamente,
CD Bustarviejo`;

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend({
        paymentId: payment.id,
        playerId: player.id,
        method,
        message: customMessage || defaultMessage
      });
      onClose();
    } catch (error) {
      console.error("Error sending reminder:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Recordatorio Individual</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-900">{payment?.jugador_nombre}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-slate-600">Periodo: <span className="font-medium">{payment?.mes}</span></p>
              <p className="text-slate-600">Cantidad: <span className="font-medium">{payment?.cantidad}€</span></p>
              <p className="text-slate-600">Estado: <span className="font-medium">{payment?.estado}</span></p>
              <p className="text-slate-600">Temporada: <span className="font-medium">{payment?.temporada}</span></p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-blue-900">Contactos del Jugador</p>
            <div className="space-y-1 text-sm">
              {player?.email_padre && (
                <p className="text-blue-800">📧 Padre: {player.email_padre}</p>
              )}
              {player?.email_tutor_2 && (
                <p className="text-blue-800">📧 Tutor 2: {player.email_tutor_2}</p>
              )}
              {player?.telefono && (
                <p className="text-blue-800">📱 Teléfono: {player.telefono}</p>
              )}
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-3">
            <Label>Método de Envío</Label>
            <RadioGroup value={method} onValueChange={setMethod}>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span>Correo Electrónico</span>
                  <span className="text-xs text-slate-500">(Recomendado)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="chat" id="chat" />
                <Label htmlFor="chat" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span>Chat del Grupo</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Ambos (Email + Chat)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border-2 border-purple-300 rounded-lg p-3 hover:bg-purple-50 cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50">
                <RadioGroupItem value="animation" id="animation" />
                <Label htmlFor="animation" className="flex items-center gap-2 cursor-pointer flex-1">
                  <span className="text-2xl animate-bounce">🔔</span>
                  <div>
                    <span className="font-semibold text-purple-700">Con Animación Visual</span>
                    <p className="text-xs text-purple-600">Email + Chat + Notificación destacada</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Mensaje (opcional - se usará el mensaje por defecto si está vacío)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={defaultMessage}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sending} className="bg-orange-600 hover:bg-orange-700">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Recordatorio
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}