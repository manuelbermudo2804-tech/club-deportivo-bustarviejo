import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, MessageCircle, Send, Loader2, Smartphone } from "lucide-react";

export default function IndividualReminderDialog({ isOpen, onClose, payment, player, allPlayerPayments, onSend }) {
  const [methods, setMethods] = useState({
    email: false,
    chat: false,
    animation: false
  });
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [reminderType, setReminderType] = useState("specific"); // "specific" | "all_unpaid"

  const toggleMethod = (method) => {
    setMethods(prev => ({ ...prev, [method]: !prev[method] }));
  };

  // Todos los meses posibles
  const allPossibleMonths = ["Junio", "Septiembre", "Diciembre"];
  
  // Información de pagos por mes
  const monthsInfo = allPossibleMonths.map(mes => {
    const existingPayment = (allPlayerPayments || []).find(p => p.mes === mes);
    return {
      mes: mes,
      estado: existingPayment?.estado || "Sin registrar",
      cantidad: existingPayment?.cantidad || 0,
      isPending: !existingPayment || existingPayment.estado === "Pendiente" || existingPayment.estado === "En revisión"
    };
  });

  const hasAnyPayment = (allPlayerPayments || []).some(p => p.jugador_id === player?.id);

  const toggleMonth = (mes) => {
    setSelectedMonths(prev => 
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const selectAllMonths = () => {
    const pendingMonths = monthsInfo.filter(m => m.isPending).map(m => m.mes);
    if (selectedMonths.length === pendingMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths(pendingMonths);
    }
  };

  const getDefaultMessage = () => {
    if (reminderType === "all_unpaid" || !hasAnyPayment) {
      return `Estimados padres/tutores,

Les recordamos que NO han registrado ningún pago para este jugador en la temporada actual.

Jugador: ${player?.nombre}
Temporada: ${payment?.temporada || "2024-2025"}

Por favor, accede a la aplicación y registra los pagos correspondientes lo antes posible.

Atentamente,
CD Bustarviejo`;
    }

    if (selectedMonths.length === 0) {
      return `Estimados padres/tutores,

Les recordamos que tienen un pago pendiente:

Jugador: ${payment?.jugador_nombre}
Periodo: ${payment?.mes}
Temporada: ${payment?.temporada}
Cantidad: ${payment?.cantidad}€
Vencimiento: 30 de ${payment?.mes}

Por favor, realiza el pago y sube el justificante en la aplicación.

Atentamente,
CD Bustarviejo`;
    }

    const selectedMonthsInfo = monthsInfo.filter(m => selectedMonths.includes(m.mes));
    const totalAmount = selectedMonthsInfo.reduce((sum, m) => sum + (m.cantidad || 0), 0);

    return `Estimados padres/tutores,

Les recordamos que tienen ${selectedMonths.length} pago${selectedMonths.length > 1 ? 's' : ''} pendiente${selectedMonths.length > 1 ? 's' : ''}:

Jugador: ${player?.nombre}
Temporada: ${payment?.temporada || "2024-2025"}

${selectedMonthsInfo.map(m => `• ${m.mes}: ${m.cantidad > 0 ? m.cantidad + '€' : 'Importe pendiente'} (Vencimiento: 30 de ${m.mes})`).join('\n')}

${totalAmount > 0 ? `Total pendiente: ${totalAmount}€` : ''}

Por favor, realiza ${selectedMonths.length > 1 ? 'los pagos' : 'el pago'} y sube ${selectedMonths.length > 1 ? 'los justificantes' : 'el justificante'} en la aplicación.

Atentamente,
CD Bustarviejo`;
  };

  const handleSend = async () => {
    const selectedMethods = Object.keys(methods).filter(m => methods[m]);
    if (selectedMethods.length === 0) {
      alert("Por favor selecciona al menos un método de envío");
      return;
    }

    if (reminderType === "specific" && selectedMonths.length === 0) {
      alert("Por favor selecciona al menos un mes para recordar");
      return;
    }

    setSending(true);
    try {
      await onSend({
        paymentId: payment.id,
        playerId: player.id,
        methods: methods,
        message: customMessage || getDefaultMessage(),
        reminderType: reminderType,
        selectedMonths: selectedMonths
      });
      onClose();
      setMethods({ email: false, chat: false, animation: false });
      setCustomMessage("");
      setSelectedMonths([]);
      setReminderType("specific");
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
          {/* Player Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-900">{player?.nombre}</p>
            <div className="text-sm">
              <p className="text-slate-600">Temporada: <span className="font-medium">{payment?.temporada || "2024-2025"}</span></p>
              {monthsInfo.filter(m => m.isPending).length > 0 && (
                <p className="text-orange-600 font-medium mt-1">
                  {monthsInfo.filter(m => m.isPending).length} pago{monthsInfo.filter(m => m.isPending).length > 1 ? 's' : ''} pendiente{monthsInfo.filter(m => m.isPending).length > 1 ? 's' : ''}
                </p>
              )}
              {!hasAnyPayment && (
                <p className="text-red-600 font-medium mt-1">
                  ⚠️ Sin pagos registrados
                </p>
              )}
            </div>
          </div>

          {/* Reminder Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipo de Recordatorio</Label>
            
            <div className="space-y-2">
              <div 
                className={`flex items-start space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  reminderType === "specific" ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setReminderType("specific")}
              >
                <input 
                  type="radio" 
                  name="reminderType" 
                  checked={reminderType === "specific"}
                  onChange={() => setReminderType("specific")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">Meses específicos sin pagar</span>
                  <p className="text-xs text-slate-500 mt-1">Selecciona los meses pendientes que quieres recordar</p>
                </div>
              </div>

              <div 
                className={`flex items-start space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  reminderType === "all_unpaid" ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setReminderType("all_unpaid")}
              >
                <input 
                  type="radio" 
                  name="reminderType" 
                  checked={reminderType === "all_unpaid"}
                  onChange={() => setReminderType("all_unpaid")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium text-red-700">Sin ningún pago registrado</span>
                  <p className="text-xs text-red-600 mt-1">Para jugadores que no han registrado ninguna cuota</p>
                </div>
              </div>
            </div>
          </div>

          {/* Month Selection - Only for specific type */}
          {reminderType === "specific" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Selecciona los meses a recordar</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllMonths}
                  className="text-xs"
                >
                  {selectedMonths.length === monthsInfo.filter(m => m.isPending).length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {monthsInfo.map((monthInfo) => (
                  <div 
                    key={monthInfo.mes}
                    className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedMonths.includes(monthInfo.mes) ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => toggleMonth(monthInfo.mes)}
                  >
                    <Checkbox 
                      checked={selectedMonths.includes(monthInfo.mes)}
                      onCheckedChange={() => toggleMonth(monthInfo.mes)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{monthInfo.mes}</span>
                        {monthInfo.cantidad > 0 && (
                          <span className="text-sm font-semibold text-orange-600">{monthInfo.cantidad}€</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Estado: {monthInfo.estado}
                        {monthInfo.isPending && " • Vencimiento: 30 de " + monthInfo.mes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedMonths.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800">
                    ✓ {selectedMonths.length} mes{selectedMonths.length > 1 ? 'es' : ''} seleccionado{selectedMonths.length > 1 ? 's' : ''}
                  </p>
                  {monthsInfo.filter(m => selectedMonths.includes(m.mes)).reduce((sum, m) => sum + (m.cantidad || 0), 0) > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Total: {monthsInfo.filter(m => selectedMonths.includes(m.mes)).reduce((sum, m) => sum + (m.cantidad || 0), 0)}€
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* Method Selection - Multiple */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Métodos de Envío (selecciona uno o varios)</Label>
            
            <div className="space-y-2">
              <div 
                className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => toggleMethod('email')}
              >
                <Checkbox 
                  id="email"
                  checked={methods.email}
                  onCheckedChange={() => toggleMethod('email')}
                />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="w-5 h-5 text-orange-600" />
                  <div>
                    <span className="font-medium">Correo Electrónico</span>
                    <p className="text-xs text-slate-500">Envío profesional con datos bancarios</p>
                  </div>
                </Label>
              </div>

              <div 
                className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => toggleMethod('chat')}
              >
                <Checkbox 
                  id="chat"
                  checked={methods.chat}
                  onCheckedChange={() => toggleMethod('chat')}
                />
                <Label htmlFor="chat" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <span className="font-medium">Chat del Grupo</span>
                    <p className="text-xs text-slate-500">Mensaje en el grupo de la categoría</p>
                  </div>
                </Label>
              </div>

              <div 
                className="flex items-center space-x-3 border-2 border-purple-300 rounded-lg p-4 hover:bg-purple-50 cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 transition-colors"
                onClick={() => toggleMethod('animation')}
              >
                <Checkbox 
                  id="animation"
                  checked={methods.animation}
                  onCheckedChange={() => toggleMethod('animation')}
                />
                <Label htmlFor="animation" className="flex items-center gap-2 cursor-pointer flex-1">
                  <span className="text-2xl animate-bounce">🔔</span>
                  <div>
                    <span className="font-semibold text-purple-700">Notificación Visual en App</span>
                    <p className="text-xs text-purple-600">Banner animado + Email + Chat urgente</p>
                  </div>
                </Label>
              </div>
            </div>

            {Object.values(methods).some(v => v) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-800 font-medium">
                  ✓ Se enviará por: {Object.keys(methods).filter(k => methods[k]).map(k => {
                    if (k === 'email') return 'Email';
                    if (k === 'chat') return 'Chat';
                    if (k === 'animation') return 'Notificación Visual en App';
                  }).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label>Mensaje personalizado (opcional)</Label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <p className="text-xs text-blue-800 font-medium mb-2">Vista previa del mensaje por defecto:</p>
              <pre className="text-[10px] text-blue-700 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                {getDefaultMessage()}
              </pre>
            </div>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Deja vacío para usar el mensaje por defecto mostrado arriba, o escribe tu mensaje personalizado aquí..."
              rows={8}
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