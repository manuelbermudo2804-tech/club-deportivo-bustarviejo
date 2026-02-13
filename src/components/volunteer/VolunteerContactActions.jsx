import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, Copy, Send, Users } from "lucide-react";

export default function VolunteerContactActions({ profiles, filteredProfiles }) {
  const [showContact, setShowContact] = useState(false);
  const list = filteredProfiles || profiles || [];

  const activeList = list.filter(p => p.activo !== false);
  const emails = [...new Set(activeList.map(p => p.email).filter(Boolean))];
  const phones = [...new Set(activeList.map(p => p.telefono).filter(Boolean))];

  const copyEmails = () => {
    navigator.clipboard.writeText(emails.join(", ")).then(() => toast.success(`${emails.length} emails copiados`)).catch(() => {});
  };

  const copyPhones = () => {
    navigator.clipboard.writeText(phones.join(", ")).then(() => toast.success(`${phones.length} teléfonos copiados`)).catch(() => {});
  };

  const openMailto = () => {
    if (emails.length === 0) return;
    // BCC para privacidad
    window.open(`mailto:?bcc=${emails.join(",")}&subject=Voluntariado CD Bustarviejo`, "_blank");
  };

  const openWhatsAppBroadcast = () => {
    // WhatsApp no tiene API de listas de difusión desde web, 
    // así que copiamos los teléfonos y damos instrucciones
    const formatted = phones.map(p => {
      const clean = p.replace(/\D/g, "");
      return clean.startsWith("34") ? clean : `34${clean}`;
    });
    navigator.clipboard.writeText(formatted.join("\n")).then(() => {
      toast.success("Teléfonos copiados. Pégalos en WhatsApp para crear una lista de difusión.");
    }).catch(() => {});
  };

  return (
    <>
      <Button
        onClick={() => setShowContact(true)}
        variant="outline"
        className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
      >
        <Send className="w-4 h-4" /> Contactar ({activeList.length})
      </Button>

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Contactar con {activeList.length} voluntarios
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">📧 Por email ({emails.length})</p>
              <div className="flex gap-2">
                <Button onClick={openMailto} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                  <Mail className="w-4 h-4" /> Abrir email
                </Button>
                <Button onClick={copyEmails} variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" /> Copiar emails
                </Button>
              </div>
              <p className="text-xs text-slate-500">Se abrirá tu cliente de correo con todos los destinatarios en CCO (privacidad).</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">📱 Por WhatsApp ({phones.length})</p>
              <div className="flex gap-2">
                <Button onClick={openWhatsAppBroadcast} className="flex-1 bg-green-600 hover:bg-green-700 gap-2">
                  <MessageCircle className="w-4 h-4" /> Copiar teléfonos
                </Button>
                <Button onClick={copyPhones} variant="outline" className="gap-2">
                  <Phone className="w-4 h-4" /> Copiar lista
                </Button>
              </div>
              <p className="text-xs text-slate-500">Copia los teléfonos y crea una lista de difusión en WhatsApp manualmente.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">👥 Lista rápida</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {activeList.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <span className="font-medium">{p.nombre}</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>{p.telefono}</span>
                      <Badge variant="secondary" className="capitalize text-[10px]">{p.relacion}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}