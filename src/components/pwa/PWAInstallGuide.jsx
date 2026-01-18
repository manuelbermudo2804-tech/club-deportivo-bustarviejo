import React from "react";
import { Smartphone, Download } from "lucide-react";

export default function PWAInstallGuide({ variant = "overlay", onComplete, onClose }) {
  const Wrapper = ({ children }) =>
    variant === "overlay" ? (
      <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => { if (onClose) onClose(); }}>
        <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    ) : (
      <div className="w-full flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {children}
        </div>
      </div>
    );

  return (
    <Wrapper>
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">Instala la App del Club</h2>
          <p className="text-slate-600 mt-1 text-sm">4 pasos rápidos (menos de 1 minuto)</p>
        </div>

        {/* Beneficios */}
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 mb-5">
          <p className="text-green-800 text-sm text-center font-medium">
            Con la app instalada podrás: recibir convocatorias al instante, ver pagos y calendario, y hablar con entrenadores
          </p>
        </div>

        {/* iOS */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-6 h-6" />
            <p className="font-bold text-slate-900">iPhone / iPad</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
              <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">1</span>
              <div className="flex-1">
                <p className="text-sm text-slate-700">Abre esta web en <strong>Safari</strong></p>
                <p className="text-xs text-slate-500">No funciona en Chrome u otros</p>
              </div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-10 h-10" />
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100">
              <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&auto=format&fit=crop" alt="iOS" className="w-full h-28 object-cover" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">2</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Pulsa <strong>Compartir</strong> (flecha hacia arriba)</p>
              <p className="text-xs text-slate-500">Está abajo en la barra de Safari</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">3</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Elige <strong>“Añadir a pantalla de inicio”</strong></p>
              <p className="text-xs text-slate-500">Desliza si no lo ves</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">4</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Pulsa <strong>“Añadir”</strong> arriba a la derecha</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">Añadir</span>
            </div>
          </div>
        </div>

        {/* Android */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" className="w-6 h-6" />
            <p className="font-bold text-slate-900">Android</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
              <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">1</span>
              <div className="flex-1">
                <p className="text-sm text-slate-700">Abre esta web en <strong>Chrome</strong></p>
                <p className="text-xs text-slate-500">Funciona también en otros</p>
              </div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" className="w-10 h-10" />
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100">
              <img src="https://images.unsplash.com/photo-1510557880182-3b9f2f58a6f3?w=800&q=80&auto=format&fit=crop" alt="Android" className="w-full h-28 object-cover" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">2</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Pulsa el <strong>menú</strong> (⋮)</p>
              <p className="text-xs text-slate-500">Arriba a la derecha</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">3</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Toca <strong>“Instalar app”</strong> o <strong>“Añadir a inicio”</strong></p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Download className="w-7 h-7 text-green-600" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">4</span>
            <div className="flex-1">
              <p className="text-sm text-slate-700">Confirma pulsando <strong>“Instalar”</strong></p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">Instalar</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            onClick={() => onComplete && onComplete()}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl"
          >
            ✅ Ya la tengo instalada
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-3 rounded-xl"
            >
              Cerrar
            </button>
          )}
        </div>

        <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <p className="text-xs text-blue-800 text-center font-medium">
            Puedes volver a ver estas instrucciones desde el menú lateral en “Ver cómo instalar”
          </p>
        </div>
      </div>
    </Wrapper>
  );
}