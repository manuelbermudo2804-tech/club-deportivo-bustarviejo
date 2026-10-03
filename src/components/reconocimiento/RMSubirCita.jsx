import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// El club sube el PDF de la cita y se avisa por email a la familia
export default function RMSubirCita({ rm }) {
  const ref = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const qc = useQueryClient();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    const me = await base44.auth.me();
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await base44.entities.ReconocimientoMedico.update(rm.id, {
      cita_pdf_uri: file_uri, cita_pdf_nombre: file.name,
      cita_fecha_subida: new Date().toISOString(), cita_subida_por: me.email,
    });
    const destinos = [...new Set([rm.email_padre, rm.email_tutor_2].filter(Boolean))];
    for (const to of destinos) {
      await base44.integrations.Core.SendEmail({
        to, from_name: "CD Bustarviejo",
        subject: `Cita del reconocimiento médico de ${rm.jugador_nombre}`,
        body: `<p>Hola,</p><p>Ya tienes disponible la <b>cita del reconocimiento médico</b> de <b>${rm.jugador_nombre}</b>.</p><p>Descárgala desde la app en <b>Firmas y Reconocimientos</b>: <a href="https://app.cdbustarviejo.com/FederationSignatures">abrir la app</a>.</p><p>CD Bustarviejo</p>`,
      }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["reconocimientos"] });
    setSubiendo(false);
    toast.success(destinos.length ? "Cita subida y familia avisada" : "Cita subida (la ficha no tiene email de familia)");
  };

  return (
    <>
      <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
      <Button size="sm" variant={rm.cita_pdf_uri ? "outline" : "default"} disabled={subiendo} onClick={() => ref.current?.click()}
        className={rm.cita_pdf_uri ? "" : "bg-orange-600 hover:bg-orange-700"}>
        {subiendo ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : rm.cita_pdf_uri ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> : <Upload className="w-4 h-4 mr-1" />}
        {rm.cita_pdf_uri ? "Cambiar cita" : "Subir cita PDF"}
      </Button>
    </>
  );
}