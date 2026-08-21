import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, KeyRound } from "lucide-react";

export default function TuLoteroAccess({ url, password }) {
  const [copiado, setCopiado] = useState(false);

  if (!url && !password) return null;

  const copiar = async () => {
    await navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-3">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <Button size="lg" className="w-full h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-red-900 font-bold text-base shadow-lg">
            <ExternalLink className="w-5 h-5 mr-2" />
            Comprar online en TuLotero
          </Button>
        </a>
      )}

      {password && (
        <div className="bg-white/95 rounded-2xl p-4 space-y-2">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <KeyRound className="w-4 h-4 text-amber-600" /> Contraseña del enlace
          </p>
          <p className="text-sm text-slate-600">
            TuLotero te pedirá esta contraseña para entrar al grupo del club:
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-xl px-4 py-3 font-mono font-bold text-lg text-slate-900 tracking-wider break-all">
              {password}
            </div>
            <Button variant="outline" onClick={copiar} className="h-12">
              {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}