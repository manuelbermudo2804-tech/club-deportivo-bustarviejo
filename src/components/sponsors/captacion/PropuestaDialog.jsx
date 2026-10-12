import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { generarPropuesta, marcarEnviada } from "./captacionApi";

const TONOS = ["cercano y de pueblo", "profesional", "breve y directo"];

export default function PropuestaDialog({ sponsor, onClose, onSent }) {
  const [tono, setTono] = useState(TONOS[0]);
  const [enfoque, setEnfoque] = useState("");
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(false);

  const generar = async () => {
    setLoading(true);
    setP(await generarPropuesta(sponsor, { tono, enfoque }).finally(() => setLoading(false)));
  };
  const copiar = (t) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };
  const enviada = async (canal) => {
    const me = await base44.auth.me();
    await marcarEnviada(sponsor, canal, me.email);
    toast.success("Guardado en el historial · seguimiento en 7 días");
    onSent();
  };
  const tel = (sponsor.contacto_telefono || "").replace(/\D/g, "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Propuesta para {sponsor.nombre}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TONOS.map(t => <Button key={t} size="sm" variant={tono === t ? "default" : "outline"} onClick={() => setTono(t)}>{t}</Button>)}
          </div>
          <Input placeholder="Enfoque opcional (ej: patrocinar la equipación del benjamín)" value={enfoque} onChange={e => setEnfoque(e.target.value)} />
          <Button onClick={generar} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {p ? "Generar otra versión" : "Generar propuesta"}
          </Button>
          {p && (
            <>
              <Input value={p.asunto} onChange={e => setP({ ...p, asunto: e.target.value })} />
              <Textarea rows={12} value={p.email} onChange={e => setP({ ...p, email: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => copiar(`${p.asunto}\n\n${p.email}`)}><Copy className="w-4 h-4 mr-1" />Copiar email</Button>
                <a href={`mailto:${sponsor.contacto_email || ""}?subject=${encodeURIComponent(p.asunto)}&body=${encodeURIComponent(p.email)}`} onClick={() => enviada("email")}>
                  <Button size="sm"><Mail className="w-4 h-4 mr-1" />Abrir en mi correo</Button>
                </a>
              </div>
              <Textarea rows={5} value={p.whatsapp} onChange={e => setP({ ...p, whatsapp: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/${tel.length === 9 ? "34" + tel : tel}?text=${encodeURIComponent(p.whatsapp)}`} target="_blank" rel="noreferrer" onClick={() => enviada("WhatsApp")}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"><MessageCircle className="w-4 h-4 mr-1" />Enviar por WhatsApp</Button>
                </a>
                <Button size="sm" variant="outline" onClick={() => enviada("otro medio")}><CheckCircle2 className="w-4 h-4 mr-1" />Marcar como enviada</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}