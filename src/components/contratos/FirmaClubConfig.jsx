import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SelloFirmaClub from "./SelloFirmaClub";

export const useFirmaClub = () => useQuery({
  queryKey: ["firmaClub"],
  queryFn: async () => (await base44.entities.FirmaClub.list("created_date", 1))[0] || null,
});

export default function FirmaClubConfig() {
  const { data: cfg, refetch, isLoading } = useFirmaClub();
  const [subiendo, setSubiendo] = useState("");

  const guardar = async (cambios) => {
    if (isLoading) return;
    if (cfg) await base44.entities.FirmaClub.update(cfg.id, cambios);
    else await base44.entities.FirmaClub.create(cambios);
    refetch();
  };
  const subir = async (campo, file) => {
    if (!file) return;
    setSubiendo(campo);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await guardar({ [campo]: file_uri });
    setSubiendo(""); toast.success("Imagen guardada");
  };
  const Archivo = ({ campo, label }) => (
    <label className="flex-1 border-2 border-dashed rounded-lg p-3 text-center text-sm cursor-pointer hover:bg-slate-50">
      {subiendo === campo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${cfg?.[campo] ? "Cambiar" : "Subir"} ${label}`}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => subir(campo, e.target.files[0])} />
    </label>
  );

  return (
    <details className="bg-white rounded-xl border p-4">
      <summary className="font-bold cursor-pointer">🏛️ Sello y firma del club {cfg?.sello_uri && cfg?.firma_uri && <span className="text-xs font-normal text-green-700">· ✅ guardados (solo ábrelo si quieres cambiarlos)</span>}</summary>
      <div className="space-y-3 mt-3">
        <p className="text-xs text-slate-500">Súbelos una vez (mejor PNG con fondo transparente). Luego, al crear un documento, marca "Incluir sello y firma del club".</p>
        <div className="flex gap-2"><Archivo campo="sello_uri" label="sello" /><Archivo campo="firma_uri" label="mi firma" /></div>
        <div className="flex gap-2">
          <Input key={`n${cfg?.id}`} defaultValue={cfg?.firmante_nombre || ""} placeholder="Tu nombre y apellidos" onBlur={(e) => guardar({ firmante_nombre: e.target.value })} />
          <Input key={`c${cfg?.id}`} defaultValue={cfg?.firmante_cargo || "Presidente"} placeholder="Cargo" onBlur={(e) => guardar({ firmante_cargo: e.target.value })} />
        </div>
        {isLoading ? null : cfg && <SelloFirmaClub sello={cfg.sello_uri} firma={cfg.firma_uri} firmante={[cfg.firmante_nombre, cfg.firmante_cargo].filter(Boolean).join(" · ")} />}
      </div>
    </details>
  );
}