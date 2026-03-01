import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Inbox, Send, Copy, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import ContactRequestCard from "../components/contacts/ContactRequestCard";

export default function ContactRequests() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailDialog, setEmailDialog] = useState(null);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("Re: Tu consulta en CD Bustarviejo");
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contact-requests"],
    queryFn: () => base44.entities.ContactRequest.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContactRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-requests"] }),
  });

  const handleStatusChange = (id, newStatus) => {
    const data = { estado: newStatus };
    if (newStatus === "contactado") {
      data.fecha_respuesta = new Date().toISOString();
    }
    updateMutation.mutate({ id, data });
    toast.success(`Estado actualizado a "${newStatus}"`);
  };

  const handleAddNote = (id, note) => {
    const contact = contacts.find(c => c.id === id);
    const existingNotes = contact?.notas_admin || "";
    const timestamp = new Date().toLocaleDateString("es-ES");
    const newNotes = existingNotes
      ? `${existingNotes}\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;
    updateMutation.mutate({ id, data: { notas_admin: newNotes } });
    toast.success("Nota guardada");
  };

  const handleSendEmail = async () => {
    if (!emailDialog || !emailBody.trim()) return;
    try {
      await base44.integrations.Core.SendEmail({
        to: emailDialog.email,
        subject: emailSubject,
        body: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#ea580c,#16a34a);padding:16px 20px;border-radius:12px 12px 0 0;">
              <h2 style="color:white;margin:0;font-size:18px;">CD Bustarviejo</h2>
            </div>
            <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
              <p>Hola ${emailDialog.nombre},</p>
              ${emailBody.split('\n').map(l => `<p>${l}</p>`).join('')}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
              <p style="color:#64748b;font-size:12px;">CD Bustarviejo - Club de fútbol y baloncesto</p>
            </div>
          </div>
        `,
        from_name: "CD Bustarviejo",
      });
      updateMutation.mutate({
        id: emailDialog.id,
        data: {
          estado: emailDialog.estado === "nuevo" ? "contactado" : emailDialog.estado,
          respondido_por: "admin",
          fecha_respuesta: new Date().toISOString(),
        },
      });
      toast.success(`Email enviado a ${emailDialog.email}`);
      setEmailDialog(null);
      setEmailBody("");
    } catch (err) {
      toast.error("Error al enviar email: " + err.message);
    }
  };

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !search ||
        c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefono?.includes(search) ||
        c.mensaje?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, search, statusFilter]);

  const counts = useMemo(() => ({
    nuevo: contacts.filter(c => c.estado === "nuevo").length,
    contactado: contacts.filter(c => c.estado === "contactado").length,
    inscrito: contacts.filter(c => c.estado === "inscrito").length,
    descartado: contacts.filter(c => c.estado === "descartado").length,
    total: contacts.length,
  }), [contacts]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            📩 Contactos Web
            {counts.nuevo > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">{counts.nuevo} nuevos</Badge>
            )}
          </h1>
          <p className="text-slate-600 text-sm mt-1">Solicitudes de información desde tu web externa</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowWebhookInfo(!showWebhookInfo)}>
          <Info className="w-4 h-4 mr-1.5" /> Cómo conectar mi web
        </Button>
      </div>

      {/* Webhook info */}
      {showWebhookInfo && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm space-y-2">
            <p><strong>Para conectar tu formulario web:</strong></p>
            <p>Configura tu formulario para que envíe un POST a esta URL (ve a Dashboard → Code → Functions → contactWebhook para copiar la URL):</p>
            <div className="bg-white rounded-lg p-3 border border-blue-200 font-mono text-xs break-all">
              POST con JSON: {"{"} "nombre": "...", "email": "...", "telefono": "...", "categoria_interes": "...", "mensaje": "..." {"}"}
            </div>
            <p className="text-xs text-blue-600">
              <strong>WordPress:</strong> usa el plugin "WPForms" o "Contact Form 7" + "Webhooks" · 
              <strong>Wix:</strong> usa Wix Automations → "Send HTTP Request" · 
              <strong>Otro:</strong> cualquier formulario que envíe POST JSON sirve
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          className={statusFilter === "all" ? "bg-orange-600 hover:bg-orange-700 h-8 text-xs" : "h-8 text-xs"}
        >
          Todos ({counts.total})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "nuevo" ? "default" : "outline"}
          onClick={() => setStatusFilter("nuevo")}
          className={statusFilter === "nuevo" ? "bg-red-500 hover:bg-red-600 h-8 text-xs" : "h-8 text-xs border-red-200 text-red-700"}
        >
          🔴 Nuevos ({counts.nuevo})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "contactado" ? "default" : "outline"}
          onClick={() => setStatusFilter("contactado")}
          className={statusFilter === "contactado" ? "bg-blue-500 hover:bg-blue-600 h-8 text-xs" : "h-8 text-xs"}
        >
          📞 Contactados ({counts.contactado})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "inscrito" ? "default" : "outline"}
          onClick={() => setStatusFilter("inscrito")}
          className={statusFilter === "inscrito" ? "bg-green-500 hover:bg-green-600 h-8 text-xs" : "h-8 text-xs"}
        >
          ✅ Inscritos ({counts.inscrito})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "descartado" ? "default" : "outline"}
          onClick={() => setStatusFilter("descartado")}
          className={statusFilter === "descartado" ? "bg-slate-500 hover:bg-slate-600 h-8 text-xs" : "h-8 text-xs"}
        >
          ❌ Descartados ({counts.descartado})
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, email, teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-r-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold text-lg">
            {contacts.length === 0 ? "Aún no hay contactos" : "No hay contactos con este filtro"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {contacts.length === 0 ? "Cuando alguien rellene tu formulario web, aparecerá aquí" : "Prueba con otro filtro o búsqueda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(contact => (
            <ContactRequestCard
              key={contact.id}
              contact={contact}
              onStatusChange={handleStatusChange}
              onAddNote={handleAddNote}
              onSendEmail={(c) => { setEmailDialog(c); setEmailBody(""); }}
            />
          ))}
        </div>
      )}

      {/* Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={() => setEmailDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder a {emailDialog?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Para: {emailDialog?.email}</p>
            </div>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Asunto"
            />
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialog(null)}>Cancelar</Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                disabled={!emailBody.trim()}
                onClick={handleSendEmail}
              >
                <Send className="w-4 h-4 mr-1.5" /> Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}