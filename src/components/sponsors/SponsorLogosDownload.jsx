import React, { useMemo, useState } from "react";
import JSZip from "jszip";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileArchive, Image as ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const safeName = (value) => (value || "logo")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");

const extensionFrom = (url) => {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop().toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) ? ext : "png";
  } catch { return "png"; }
};

export default function SponsorLogosDownload() {
  const [zipping, setZipping] = useState(false);
  const { data: sponsors = [], isLoading, isError } = useQuery({
    queryKey: ["sponsor-logos-download"],
    queryFn: () => base44.entities.Sponsor.list("-created_date"),
  });

  const logos = useMemo(() => sponsors
    .filter(s => s.logo_url && /^https?:\/\//i.test(s.logo_url))
    .sort((a,b) => (a.nombre || "").localeCompare(b.nombre || "", "es")),
  [sponsors]);

  const downloadOne = (sponsor) => {
    const link = document.createElement("a");
    link.href = sponsor.logo_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = safeName(sponsor.nombre) + "." + extensionFrom(sponsor.logo_url);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadZip = async () => {
    if (!logos.length || zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const results = await Promise.allSettled(logos.map(async (sponsor) => {
        const response = await fetch(sponsor.logo_url);
        if (!response.ok) throw new Error("HTTP " + response.status);
        const blob = await response.blob();
        const ext = blob.type.includes("png") ? "png"
          : blob.type.includes("gif") ? "gif"
          : blob.type.includes("webp") ? "webp"
          : blob.type.includes("svg") ? "svg"
          : extensionFrom(sponsor.logo_url);
        zip.file(safeName(sponsor.nombre) + "." + ext, blob);
        return sponsor.nombre;
      }));
      const failed = results.filter(r => r.status === "rejected").length;
      const successful = results.length - failed;
      if (!successful) throw new Error("No se pudo descargar ningún archivo. El servidor puede bloquear la descarga conjunta.");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Logotipos_Patrocinadores_CD_Bustarviejo.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(failed ? `ZIP creado: ${successful} logos. ${failed} no se pudieron incluir.` : `ZIP creado con los ${successful} logotipos.`);
    } catch (error) {
      console.error("Error creando ZIP de logotipos:", error);
      toast.error(error.message || "No se pudo crear el ZIP. Prueba a descargar los logos individualmente.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <Card className="border-orange-100 shadow-sm">
      <CardHeader className="bg-orange-50/70">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <ImageIcon className="h-5 w-5 text-orange-600" />
          Banco de logotipos de patrocinadores
        </CardTitle>
        <p className="text-sm text-slate-600">Descarga los archivos originales guardados en las fichas de patrocinadores. No modifica ni comprime los originales.</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            {isLoading ? "Cargando logotipos…" : isError ? "No se pudieron cargar los patrocinadores." : `${logos.length} logotipos disponibles de ${sponsors.length} patrocinadores registrados.`}
          </div>
          <Button onClick={downloadZip} disabled={isLoading || isError || !logos.length || zipping} className="bg-orange-600 hover:bg-orange-700">
            <FileArchive className="mr-2 h-4 w-4" />
            {zipping ? "Preparando ZIP…" : "Descargar todos en ZIP"}
          </Button>
        </div>
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-white p-3 text-center">
                <div className="flex h-20 w-full items-center justify-center rounded-lg bg-slate-50 p-2">
                  {sponsor.logo_url ? <img src={sponsor.logo_url} alt={sponsor.nombre} className="max-h-full max-w-full object-contain" loading="lazy" /> : <AlertCircle className="h-7 w-7 text-slate-300" />}
                </div>
                <p className="line-clamp-2 min-h-10 w-full break-words text-xs font-semibold text-slate-700">{sponsor.nombre}</p>
                {sponsor.logo_url ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => downloadOne(sponsor)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar logo
                  </Button>
                ) : <span className="text-xs text-amber-700">Sin logo cargado</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
