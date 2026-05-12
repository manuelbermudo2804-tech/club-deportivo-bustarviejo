import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ExternalLink, Sparkles, Building2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const getBaseUrl = () => window.location.origin;

export default function PropuestaGenerator() {
  const [empresa, setEmpresa] = useState("");
  const [logo, setLogo] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const base = `${getBaseUrl()}/PropuestaGVCGaesco`;
    if (!empresa.trim()) return base;
    const params = new URLSearchParams();
    params.set("empresa", empresa.trim());
    if (logo.trim()) params.set("logo", logo.trim());
    return `${base}?${params.toString()}`;
  }, [empresa, logo]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL personalizada copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(url, "_blank");
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-rose-50 rounded-2xl border-2 border-orange-200 p-5 lg:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">Generador de Propuestas Personalizadas</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Crea un enlace único de la propuesta de patrocinio adaptado a cada empresa. Cambia el nombre y el logo y envíalo.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="flex items-center gap-1.5 text-slate-700 mb-1.5 text-sm">
            <Building2 className="w-3.5 h-3.5" /> Nombre de la empresa
          </Label>
          <Input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ej: Mahou, Caixabank, GVC Gaesco..."
          />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 text-slate-700 mb-1.5 text-sm">
            <ImageIcon className="w-3.5 h-3.5" /> URL del logo (opcional)
          </Label>
          <Input
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 mb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">URL generada</p>
        <code className="text-xs text-slate-700 break-all">{url}</code>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={handleCopy}
          disabled={!empresa.trim()}
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiada" : "Copiar URL"}
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
          onClick={handleOpen}
        >
          <ExternalLink className="w-4 h-4" />
          Previsualizar
        </Button>
      </div>

      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        💡 Si dejas los campos vacíos se envía la propuesta original de GVC Gaesco. Cada envío se guarda automáticamente en el panel de propuestas con el origen indicado.
      </p>
    </div>
  );
}