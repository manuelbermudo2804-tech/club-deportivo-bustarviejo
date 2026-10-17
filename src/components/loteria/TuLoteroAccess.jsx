import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, KeyRound } from "lucide-react";

export default function TuLoteroAccess({ password }) {
  const [copiado, setCopiado] = useState(false);

  if (!password) return null;

  const copiar = async () => {
    await navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-3">
      {password && (
        <div className="bg-white/95 rounded-2xl p-4 space-y-2">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            <KeyRound className="w-4 h-4 text-amber-600" /> Código de acceso
          </p>
          <p className="text-sm text-slate-600">
            Introdúcelo en TuLotero para entrar a la lotería del club:
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

      <p className="text-center text-xs text-slate-500 px-2">
        Abre TuLotero desde el botón de compra destacado al principio de esta página.
      </p>
    </div>
  );
}