import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Copy, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Una sola línea de acciones para compartir la invitación:
 * WhatsApp + asistente de mensajes + copiar enlace.
 */
export default function ReferralShareRow({ userEmail = "", userName = "" }) {
  const [showAi, setShowAi] = useState(false);
  const [targetType, setTargetType] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [code, setCode] = useState("");
  useEffect(() => {
    let active = true;
    if (!userEmail) return () => { active = false; };
    base44.functions.invoke("getMyReferralCode", {}).then(({ data }) => {
      if (active && data?.success && data.code) setCode(data.code);
    }).catch(() => {
      if (active) toast.error("No se pudo cargar tu enlace personal. Comprueba que tu cuota está pagada.");
    });
    return () => { active = false; };
  }, [userEmail]);
  const link = code ? `${window.location.origin}/AltaSocio?ref=${code}` : `${window.location.origin}/AltaSocio`;

  const defaultMessage = `¡Hola! Quería invitarte personalmente a hacerte socio/a del CD Bustarviejo. ⚽🏀

Somos un club deportivo familiar, con actividades para distintas edades, y tu cuota ayuda a que el deporte siga creciendo en Bustarviejo.

👉 Puedes hacerte socio/a aquí: ${link}

Además, esta invitación forma parte de nuestra campaña “Trae un socio amigo”: si completas tu alta y el pago, yo consigo una papeleta para participar en el sorteo del club. 🎟️

¡Me encantaría que formaras parte de la familia del CD Bustarviejo! 🟠⚫`;

  const share = async (text) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invitación CD Bustarviejo", text });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const generate = async () => {
    if (!targetType) return;
    setIsGenerating(true);
    try {
      const { data } = await base44.functions.invoke("generateReferralMessage", {
        userName: userName || "un socio",
        targetType,
      });
      setMessage(`${data.message}\n\n👉 Puedes hacerte socio/a aquí: ${link}\n\nSi completas el alta y el pago, yo consigo una papeleta para participar en el sorteo de la campaña “Trae un socio amigo”. 🎟️`);
    } catch {
      toast.error("No se pudo crear el mensaje. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => code ? share(defaultMessage) : toast.error("Tu enlace personal todavía no está disponible.")}
          className="flex-1 min-w-[150px] bg-green-500 hover:bg-green-600 text-white font-bold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Invitar por WhatsApp
        </Button>
        <Button
          onClick={() => setShowAi(true)}
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-white/40"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Escribirlo por mí
        </Button>
        <Button
          onClick={() => { if (!code) return toast.error("Tu enlace personal todavía no está disponible."); navigator.clipboard.writeText(link); toast.success("Enlace copiado"); }}
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-white/40 px-3"
          title="Copiar enlace"
        >
          <Copy className="w-5 h-5" />
        </Button>
      </div>

      <Dialog open={showAi} onOpenChange={setShowAi}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Te escribo la invitación</DialogTitle>
          </DialogHeader>
          {!message ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>¿A quién quieres invitar?</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amigo del colegio">Amigo/a del colegio</SelectItem>
                    <SelectItem value="familiar (primo, tío...)">Familiar</SelectItem>
                    <SelectItem value="vecino">Vecino/a</SelectItem>
                    <SelectItem value="compañero de otro equipo">Compañero/a de otro equipo</SelectItem>
                    <SelectItem value="padre/madre del cole">Padre/madre del cole</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={!targetType || isGenerating} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                {isGenerating ? "Redactando..." : "Crear mensaje"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{message}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(message); toast.success("Mensaje copiado"); setShowAi(false); }}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { share(message); setShowAi(false); }}>
                  <Share2 className="w-4 h-4 mr-2" /> Enviar
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => setMessage("")}>
                Probar con otro tipo de persona
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}