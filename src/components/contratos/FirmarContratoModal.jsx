import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "./SignaturePad";
import { sha256 } from "./contratoPdf";
import { toast } from "sonner";

// Aparece al entrenador cuando tiene un acuerdo pendiente de firmar
export default function FirmarContratoModal({ user }) {
  const qc = useQueryClient();
  const [canvas, setCanvas] = useState(null);
  const [dni, setDni] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [later, setLater] = useState(false);

  const { data: pendientes = [] } = useQuery({
    queryKey: ["contratosPendientes", user?.email],
    queryFn: () => base44.entities.ContratoVoluntariado.filter({ entrenador_email: user.email, estado: "pendiente" }),
    enabled: !!user?.email,
  });
  const c = pendientes[0];
  if (!c || later) return null;

  const firmar = async () => {
    setSaving(true);
    try {
      const hash = await sha256(c.texto);
      if (c.texto_hash && hash !== c.texto_hash) throw new Error("El texto no coincide con el original");
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "firma.png", { type: "image/png" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.ContratoVoluntariado.update(c.id, {
        estado: "firmado", firma_uri: file_uri, firma_fecha: new Date().toISOString(),
        firma_dni: dni.trim().toUpperCase(), firma_nombre: user.full_name, firma_user_agent: navigator.userAgent,
      });
      toast.success("Acuerdo firmado. ¡Gracias!");
      setCanvas(null); setDni(""); setAcepto(false);
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
        <div className="text-sm whitespace-pre-wrap bg-slate-50 border rounded-lg p-3 max-h-72 overflow-y-auto">{c.texto}</div>
        <Input placeholder="Tu DNI / NIE" value={dni} onChange={(e) => setDni(e.target.value)} />
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={acepto} onCheckedChange={(v) => setAcepto(!!v)} className="mt-0.5" />
          He leído el acuerdo y lo acepto.
        </label>
        <SignaturePad onChange={setCanvas} />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setLater(true)}>Más tarde</Button>
          <Button disabled={!canvas || !acepto || dni.trim().length < 8 || saving} onClick={firmar} className="bg-orange-600 hover:bg-orange-700">
            {saving ? "Firmando..." : "Firmar acuerdo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}