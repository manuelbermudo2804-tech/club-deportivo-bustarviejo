import React from "react";
import { Mail, Smartphone, Sparkles } from "lucide-react";

// Banner informativo en la landing pública: explica el sistema de enlace mágico por email
export default function PorraEmailMagicoInfo() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 text-base md:text-lg flex items-center gap-1">
              📩 Importante: tu enlace mágico
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </h3>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              Cuando te apuntes recibirás un <strong>email con un enlace único</strong>. Es <strong>tu llave personal</strong> para:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li className="flex items-start gap-2"><span>✏️</span><span>Rellenar y <strong>editar tus predicciones</strong> hasta el cierre del plazo</span></li>
              <li className="flex items-start gap-2"><span>🏆</span><span>Ver tu <strong>ranking personal</strong> y el global en cualquier momento</span></li>
              <li className="flex items-start gap-2"><span>👥</span><span>Crear o unirte a <strong>mini-ligas privadas</strong> con tus amigos</span></li>
            </ul>
            <div className="mt-3 bg-white/80 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700">
                💡 <strong>Consejo:</strong> guarda el enlace en favoritos o añádelo a la pantalla de inicio de tu móvil para acceder rápido durante todo el Mundial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}