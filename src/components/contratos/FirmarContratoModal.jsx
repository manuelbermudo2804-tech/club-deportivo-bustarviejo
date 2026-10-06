import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "./SignaturePad";
import TutorFirmaBloque from "./TutorFirmaBloque";
import { sha256 } from "./contratoPdf";
import { toast } from "sonner";

const subirFirma = async (canvas) => {
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([blob], "firma.png", { type: "image/png" }) });
  return file_uri;
};
const dniOk = (d) => d.trim().length >= 8;

// Aparece al entrenador (o menor en prácticas) cuando tiene un acuerdo pendiente
export default function FirmarContratoModal({ user }) {
  const qc = useQueryClient();
  const [canvas, setCanvas] = useState(null);
  const [tutorCanvas, setTutorCanvas] = useState(null);
  const [tutor, setTutor] = useState({ nombre: "", dni: "", relacion: "" });
  const [dni, setDni] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [later, setLater] = useState(false);

  const { data: pendientes = [] } = useQuery({
    queryKey: ["contratosPendientes", user?.email],
    queryFn: () => base44.entities.ContratoVoluntariado.filter({ entrenador_email: user.email, estado: "pendiente" }),
    enabled: !!user?.email,
  });
  const c = pendientes[0];
  if (!c || later) return null;
  const menor = !!c.es_menor;

  const valido = canvas && acepto && privacidad && dniOk(dni) &&
    (!menor || (tutorCanvas && tutor.nombre.trim() && dniOk(tutor.dni) && tutor.relacion.trim()));

  const firmar = async () => {
    setSaving(true);
    try {
      const hash = await sha256(c.texto);
      if (c.texto_hash && hash !== c.texto_hash) throw new Error("El texto no coincide con el original");
      const data = {
        estado: "firmado", firma_uri: await subirFirma(canvas), firma_fecha: new Date().toISOString(),
        firma_dni: dni.trim().toUpperCase(), firma_nombre: user.full_name || c.entrenador_nombre,
        firma_user_agent: navigator.userAgent, acepta_privacidad: true,
      };
      if (menor) Object.assign(data, {
        tutor_nombre: tutor.nombre.trim(), tutor_dni: tutor.dni.trim().toUpperCase(),
        tutor_relacion: tutor.relacion.trim(), tutor_firma_uri: await subirFirma(tutorCanvas),
      });
      await base44.entities.ContratoVoluntariado.update(c.id, data);
      toast.success("Acuerdo firmado. ¡Gracias!");
      qc.invalidateQueries({ queryKey: ["contratosPendientes"] });
    } catch (e) {
      toast.error("No se pudo firmar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setLater(true)}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✍️ {c.titulo}</DialogTitle></DialogHeader>
        <div className="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 max-h-60 overflow-y-auto">{c.texto}</div>
        <div className="border rounded-lg p-3 space-y-2">
          <p className="font-semibold text-sm">🧑 Firma {menor ? "del menor" : c.grupo === "familia" ? `del padre, madre o tutor de ${c.jugador_nombre}` : "del firmante"}</p>
          <Input placeholder={`DNI / NIE ${menor ? "del menor" : ""}`} value={dni} onChange={(e) => setDni(e.target.value)} />
          <SignaturePad onChange={setCanvas} />
        </div>
        {menor && <TutorFirmaBloque tutor={tutor} setTutor={setTutor} onFirma={setTutorCanvas} />}
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={acepto} onCheckedChange={(v) => setAcepto(!!v)} className="mt-0.5" />
          He leído el acuerdo y lo acepto{menor ? " (y, como tutor, autorizo al menor)" : ""}.
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={privacidad} onCheckedChange={(v) => setPrivacidad(!!v)} className="mt-0.5" />
          <span>Acepto que el CD Bustarviejo trate mis datos (y los del menor, si procede) solo para gestionar este documento, conforme al RGPD. Puedo ejercer mis derechos escribiendo al club. <a href="/Privacidad" target="_blank" className="underline text-orange-700">Política de privacidad</a></span>
        </label>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setLater(true)}>Más tarde</Button>
          <Button disabled={!valido || saving} onClick={firmar} className="bg-orange-600 hover:bg-orange-700">
            {saving ? "Firmando..." : "Firmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}