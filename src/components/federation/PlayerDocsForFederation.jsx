import React, { useState } from "react";
import { Download, Image as ImageIcon, IdCard, BookOpen, FileWarning, DownloadCloud, Loader2 } from "lucide-react";

/**
 * Muestra los documentos del jugador que la Federación suele pedir al gestionar
 * las firmas: foto, DNI (anverso/reverso) y, si es menor, libro de familia.
 * Cada documento es un enlace de descarga directo para que quien pega los enlaces
 * pueda adjuntarlos a la Federación.
 */
export default function PlayerDocsForFederation({ player, esMayorDeEdad }) {
  const [downloading, setDownloading] = useState(false);

  const docs = [
    { url: player.foto_url, label: "Foto del jugador", icon: ImageIcon },
    { url: player.dni_jugador_url, label: "DNI jugador (anverso)", icon: IdCard },
    { url: player.dni_jugador_trasero_url, label: "DNI jugador (reverso)", icon: IdCard },
    { url: player.dni_tutor_legal_url, label: "DNI tutor (anverso)", icon: IdCard },
    { url: player.dni_tutor_legal_trasero_url, label: "DNI tutor (reverso)", icon: IdCard },
    ...(!esMayorDeEdad ? [{ url: player.libro_familia_url, label: "Libro de familia", icon: BookOpen }] : []),
  ].filter(d => !!d.url);

  const slug = (player.nombre || "jugador").trim().replace(/\s+/g, "_");

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const res = await fetch(doc.url);
        const blob = await res.blob();
        const ext = (doc.url.split("?")[0].split(".").pop() || "jpg").slice(0, 5);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${slug}_${doc.label.replace(/[^\w]+/g, "_")}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        await new Promise(r => setTimeout(r, 400));
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Download className="w-3.5 h-3.5" /> Documentación para la Federación
        </p>
        {docs.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
            {downloading ? "Descargando..." : "Descargar todo"}
          </button>
        )}
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <FileWarning className="w-3.5 h-3.5" /> Este jugador no tiene documentos subidos
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {docs.map((doc, i) => {
            const Icon = doc.icon;
            return (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-700 text-xs font-medium transition-colors border border-slate-200"
              >
                <Icon className="w-3.5 h-3.5" />
                {doc.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}