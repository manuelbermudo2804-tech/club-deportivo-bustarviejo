import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, UserX, Mail, CheckCircle2 } from "lucide-react";

export default function DeleteAccount() {
  const [user, setUser] = useState(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (e) {
        // si no autenticado, redirigir a login
        base44.auth.redirectToLogin();
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!user || !confirm) return;
    setSubmitting(true);
    try {
      // 1) Crear la solicitud en la base de datos
      await base44.entities.AccountDeletionRequest.create({
        user_email: user.email,
        user_name: user.full_name || "",
        reason: reason || "",
        status: "solicitada",
        requested_at: new Date().toISOString(),
      });

      // 2) Marcar en el perfil del usuario que ha solicitado la eliminación
      await base44.auth.updateMe({
        account_deletion_requested: true,
        account_deletion_requested_at: new Date().toISOString(),
      });

      // 3) Email de acuse de recibo al usuario
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: "CD Bustarviejo - Solicitud de eliminación de cuenta recibida",
          body: `Hola ${user.full_name || ""},\n\nHemos recibido tu solicitud de eliminación de cuenta.\n\nImportante:\n- No se eliminan registros contables (pagos, deudas, recibos).\n- El club revisará tu solicitud y te informará del siguiente paso.\n\nSi no has realizado esta petición, responde a este correo inmediatamente.\n\nCD Bustarviejo`,
        });
      } catch (_) {
        // no bloquear por fallo de email
      }

      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-elegant" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen px-4 py-8">
        <Card className="max-w-2xl mx-auto app-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Solicitud enviada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Hemos recibido tu solicitud. Un administrador revisará el caso y te contactará por email.</p>
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertDescription>
                Si cambias de opinión antes de que se procese, escribe a la directiva para cancelar la solicitud.
              </AlertDescription>
            </Alert>
            <div className="pt-2">
              <Button onClick={() => window.history.back()} variant="outline">Volver</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <Card className="max-w-2xl mx-auto app-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" /> Eliminar cuenta (solicitud)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert className="bg-red-50 border-red-300">
            <AlertDescription className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="w-4 h-4" /> Importante
              </div>
              <ul className="list-disc pl-5 text-slate-700 space-y-1">
                <li>Esto crea una <strong>solicitud</strong> para que el club la revise.</li>
                <li>No se eliminan pagos, deudas ni registros contables.</li>
                <li>El acceso podrá desactivarse y tus datos personales podrán anonimizarse según ley.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (opcional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cuéntanos brevemente el motivo"
              className="min-h-28"
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox id="confirm" checked={confirm} onCheckedChange={(v) => setConfirm(!!v)} />
            <label htmlFor="confirm" className="text-sm text-slate-700 leading-relaxed">
              Confirmo que entiendo que <strong>no</strong> se eliminan deudas ni pagos existentes y que mi solicitud será revisada por el club.
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={!confirm || submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
            <Mail className="w-3 h-3" /> Se enviará un acuse de recibo a {user.email}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}