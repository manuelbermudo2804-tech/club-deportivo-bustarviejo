import React, { useState } from "react";
import { Link as LinkIcon, Copy, Check, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ColaboraLinkCard() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/Colabora`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleShare = async () => {
    const text = `Colabora con el CD Bustarviejo y consigue visibilidad para tu negocio: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Colabora con el CD Bustarviejo", text, url });
      } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-green-50 border-2 border-orange-200 rounded-xl p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-slate-900">Enlace de colaboración (pago online)</h3>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        Comparte este enlace con comercios: eligen importe, suben su logo y pagan con tarjeta. El registro queda pendiente de tu aprobación.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm text-slate-700 overflow-x-auto">
          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="truncate">{url}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700">
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
        </div>
      </div>
    </div>
  );
}