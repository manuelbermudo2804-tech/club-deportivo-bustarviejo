import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function RMDescargarCita({ uri, label = "Descargar cita" }) {
  const [cargando, setCargando] = useState(false);
  const abrir = async () => {
    setCargando(true);
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 600 });
    setCargando(false);
    window.open(signed_url, "_blank");
  };
  return (
    <Button size="sm" variant="outline" onClick={abrir} disabled={cargando}>
      {cargando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />} {label}
    </Button>
  );
}