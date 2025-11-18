import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Phone, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function IndividualReminderDialog({ 
  isOpen, 
  onClose, 
  payment,
  player,
  onSend,
  isLoading 
}) {
  const [sendMethod, setSendMethod] = useState("email");
  const [customMessage, setCustomMessage] = useState("");

  const handleSend = () => {
    onSend({ 
      payment, 
      player,
      sendMethod, 
      customMessage: customMessage.trim() || null 
    });
  };

  if (!payment || !player) return null;

  const hasEmail = player.email_padre || player.email_tutor_2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            📩 Enviar Recordatorio Individual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3">
              {player.foto_url ? (
                <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                  {player.nombre.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900">{player.nombre}</p>
                <p className="text-sm text-slate-600">{player.deporte}</p>
              </div>
            </div>
            <div className="border-t pt-2 text-sm space-y-1">
              <p><strong>Mes:</strong> {payment.mes}</p>
              <p><strong>Cantidad:</strong> {payment.cantidad}€</p>
              <p><strong>Estado:</strong> {payment.estado}</p>
              {payment.justificante_url && (
                <p className="text-blue-600">✅ Justificante subido</p>
              )}
            </div>
          </div>

          {/* Send Method */}
          <div className="space-y-2">
            <Label>Método de Envío *</Label>
            <Select value={sendMethod} onValueChange={setSendMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!hasEmail}>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Email con datos bancarios</span>
                  </div>
                </SelectItem>
                <SelectItem value="chat">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Mensaje al chat del grupo</span>
                  </div>
                </SelectItem>
                <SelectItem value="both" disabled={!hasEmail}>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <MessageCircle className="w-4 h-4" />
                    <span>Email + Chat</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {!hasEmail && (
              <p className="text-xs text-orange-600">
                ⚠️ No hay email configurado para este jugador
              </p>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Mensaje Personalizado (Opcional)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Añade un mensaje personalizado que se incluirá en el recordatorio..."
              className="h-24"
            />
            <p className="text-xs text-slate-500">
              💡 Se enviará el mensaje estándar con datos bancarios + tu mensaje
            </p>
          </div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-300">
            <Mail className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-slate-700">
              {sendMethod === "email" || sendMethod === "both" ? (
                <>
                  <strong>El email incluirá:</strong>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>IBAN del club y datos bancarios completos</li>
                    <li>Concepto de pago personalizado</li>
                    <li>Instrucciones paso a paso</li>
                    {customMessage && <li>Tu mensaje personalizado</li>}
                  </ul>
                </>
              ) : (
                <>
                  <strong>El mensaje al chat incluirá:</strong>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>Recordatorio de pago pendiente</li>
                    <li>Enlace directo a la app</li>
                    {customMessage && <li>Tu mensaje personalizado</li>}
                  </ul>
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isLoading || (sendMethod !== "chat" && !hasEmail)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  {sendMethod === "email" && <Mail className="w-4 h-4 mr-2" />}
                  {sendMethod === "chat" && <MessageCircle className="w-4 h-4 mr-2" />}
                  {sendMethod === "both" && (
                    <>
                      <Mail className="w-4 h-4 mr-1" />
                      <MessageCircle className="w-4 h-4 mr-2" />
                    </>
                  )}
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