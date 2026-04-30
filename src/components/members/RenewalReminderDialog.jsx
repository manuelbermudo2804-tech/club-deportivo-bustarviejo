import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, MessageCircle, Loader2, Users, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RenewalReminderDialog({ 
  open, 
  onClose, 
  members, 
  seasonConfig, 
  onSendReminders 
}) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  // Filtrar socios pendientes de renovación
  const normalizeEmail = (e) => (e || "").toLowerCase().trim();
  const pendingMembers = members.filter(m => {
    // Socios de temporadas anteriores que pagaron y no están en la temporada actual
    const currentSeasonEmails = new Set(
      members
        .filter(mem => mem.temporada === seasonConfig?.temporada)
        .map(mem => normalizeEmail(mem.email))
    );

    return m.temporada !== seasonConfig?.temporada &&
           m.estado_pago === "Pagado" &&
           !currentSeasonEmails.has(normalizeEmail(m.email));
  });

  // Eliminar duplicados por email (normalizado)
  const uniqueMembers = [];
  const seenEmails = new Set();
  for (const member of pendingMembers) {
    const key = normalizeEmail(member.email);
    if (key && !seenEmails.has(key)) {
      seenEmails.add(key);
      uniqueMembers.push(member);
    }
  }

  // Contar cuántos tienen teléfono
  const membersWithPhone = uniqueMembers.filter(m => m.telefono && m.telefono.length >= 9);

  const handleSend = async () => {
    if (!sendEmail && !sendWhatsApp) {
      toast.error("Selecciona al menos un método de envío");
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const result = await onSendReminders(uniqueMembers, { sendEmail, sendWhatsApp });
      setResults(result);
      toast.success(`✅ Recordatorios enviados correctamente`);
    } catch (error) {
      toast.error("Error al enviar recordatorios");
    } finally {
      setSending(false);
    }
  };

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    // Limpiar el teléfono
    let cleaned = phone.replace(/\D/g, '');
    // Si no tiene prefijo de país, añadir España (+34)
    if (cleaned.length === 9) {
      cleaned = '34' + cleaned;
    }
    return cleaned;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-6 h-6 text-green-600" />
            Enviar Recordatorios de Renovación
          </DialogTitle>
          <DialogDescription>
            Envía recordatorios a los socios de temporadas anteriores que aún no han renovado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen de destinatarios */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-bold text-blue-900 text-lg">{uniqueMembers.length} socios</p>
                <p className="text-sm text-blue-700">pendientes de renovación</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline" className="bg-white">
                <Mail className="w-3 h-3 mr-1" /> {uniqueMembers.length} emails
              </Badge>
              <Badge variant="outline" className="bg-white">
                <Phone className="w-3 h-3 mr-1" /> {membersWithPhone.length} teléfonos
              </Badge>
            </div>
          </div>

          {uniqueMembers.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ¡Todos los socios anteriores ya han renovado! No hay recordatorios pendientes.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Métodos de envío */}
              <div className="space-y-3">
                <Label className="font-semibold">Métodos de envío</Label>
                
                <div 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    sendEmail ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200'
                  }`}
                  onClick={() => setSendEmail(!sendEmail)}
                >
                  <Checkbox checked={sendEmail} onCheckedChange={setSendEmail} />
                  <Mail className={`w-5 h-5 ${sendEmail ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Correo Electrónico</p>
                    <p className="text-xs text-slate-600">Se enviará a {uniqueMembers.length} direcciones</p>
                  </div>
                </div>

                <div 
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    sendWhatsApp ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200'
                  }`}
                  onClick={() => setSendWhatsApp(!sendWhatsApp)}
                >
                  <Checkbox checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
                  <MessageCircle className={`w-5 h-5 ${sendWhatsApp ? 'text-green-600' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-xs text-slate-600">
                      {membersWithPhone.length} de {uniqueMembers.length} tienen teléfono válido
                    </p>
                  </div>
                </div>
              </div>

              {sendWhatsApp && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <MessageCircle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    <strong>Nota:</strong> Se abrirá WhatsApp Web para cada mensaje. Deberás confirmar el envío manualmente para cumplir con la política de WhatsApp.
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de socios (preview) */}
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Nombre</th>
                      <th className="text-left p-2 font-medium">Temporada</th>
                      <th className="text-center p-2 font-medium">📧</th>
                      <th className="text-center p-2 font-medium">📱</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueMembers.slice(0, 10).map(member => (
                      <tr key={member.id} className="border-t">
                        <td className="p-2 truncate max-w-[150px]">{member.nombre_completo}</td>
                        <td className="p-2 text-slate-600">{member.temporada}</td>
                        <td className="p-2 text-center">{member.email ? '✅' : '❌'}</td>
                        <td className="p-2 text-center">{member.telefono ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uniqueMembers.length > 10 && (
                  <p className="text-center text-xs text-slate-500 py-2">
                    ...y {uniqueMembers.length - 10} socios más
                  </p>
                )}
              </div>

              {/* Resultados */}
              {results && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Enviados:</strong> {results.emailsSent} emails
                    {results.whatsappOpened > 0 && `, ${results.whatsappOpened} WhatsApps abiertos`}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {results ? 'Cerrar' : 'Cancelar'}
          </Button>
          {uniqueMembers.length > 0 && !results && (
            <Button 
              onClick={handleSend} 
              disabled={sending || (!sendEmail && !sendWhatsApp)}
              className="bg-gradient-to-r from-green-600 to-green-700"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Enviar Recordatorios</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}