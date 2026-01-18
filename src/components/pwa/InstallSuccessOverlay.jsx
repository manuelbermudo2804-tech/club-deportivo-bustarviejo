import React from "react";

export default function InstallSuccessOverlay({ variant = "overlay" }) {
  const Wrapper = ({ children }) =>
    variant === "overlay" ? (
      <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-green-50 via-sky-50 to-blue-50">{children}</div>
    ) : (
      <div className="w-full bg-gradient-to-br from-green-50 via-sky-50 to-blue-50">{children}</div>
    );

  return (
    <Wrapper>
      <div className={variant === "overlay" ? "h-full flex items-center justify-center p-6" : "min-h-[70vh] flex items-center justify-center p-6"}>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold text-slate-900">App instalada correctamente</h1>
          <p className="text-slate-700">Para continuar, no sigas en este navegador.</p>
          <p className="text-slate-700">Cierra esta ventana y abre la app desde el icono “CD Bustarviejo” que acabas de instalar.</p>
          <div className="grid gap-3 text-left">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <span className="text-green-700 font-bold">1</span>
              <span className="text-green-800 text-sm">Cierra esta ventana del navegador</span>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <span className="text-blue-700 font-bold">2</span>
              <span className="text-blue-800 text-sm">Toca el icono “CD Bustarviejo” en tu pantalla de inicio</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Si no se cierra automáticamente, ciérrala manualmente.</p>
        </div>
      </div>
    </Wrapper>
  );
}