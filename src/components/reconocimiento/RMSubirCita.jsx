import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RM_DOCS } from "./rmDocs";

// El club sube un PDF (hoja de reconocimiento o cita con día y hora) y se avisa por email a la familia
export default function RMSubirCita({ rm, tipo = "hoja" }) {
  const d = RM_DOCS[tipo];
  const ref = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const qc = useQueryClient();
  const tiene = !!rm[d.uri];

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    const me = await base44.auth.me();
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await base44.entities.ReconocimientoMedico.update(rm.id, {
      [d.uri]: file_uri, [d.nombre]: file.name, [d.fecha]: new Date().toISOString(), [d.por]: me.email,
    });
    const destinos = [...new Set([rm.email_padre, rm.email_tutor_2].filter(Boolean))];
    for (const to of destinos) {
      await base44.integrations.Core.SendEmail({
        to, from_name: "CD Bustarviejo",
        subject: `${tipo === "cita" ? "Cita (día y hora)" : "Hoja"} del reconocimiento médico de ${rm.jugador_nombre}`,
        body: `<p>Hola,</p><p>Ya tienes disponible la <b>${d.titulo}</b> del reconocimiento médico de <b>${rm.jugador_nombre}</b>.</p><p>Descárgala desde la app en <b>Firmas y Reconocimientos</b>: <a href="https://app.cdbustarviejo.com/FederationSignatures">abrir la app</a>.</p><p>CD Bustarviejo</p>`,
      }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["reconocimientos"] });
    setSubiendo(false);
    toast.success(destinos.length ? `${d.corto} subida y familia avisada` : `${d.corto} subida (la ficha no tiene email de familia)`);
  };

  return (
    <>
      <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
      <Button size="sm" variant={tiene ? "outline" : "default"} disabled={subiendo} onClick={() => ref.current?.click()}
        className={tiene ? "" : "bg-orange-600 hover:bg-orange-700"}>
        {subiendo ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : tiene ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> : <Upload className="w-4 h-4 mr-1" />}
        {tiene ? `Cambiar ${d.corto}` : `Subir ${d.corto}`}
      </Button>
    </>
  );
}