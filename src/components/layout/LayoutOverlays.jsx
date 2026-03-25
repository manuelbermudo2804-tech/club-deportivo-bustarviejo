import React from "react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

const BUILD_VERSION = "build_1708714800001";

export function InstallSuccessOverlayFull() {
  return (
    <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-green-50 via-sky-50 to-blue-50">
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h1 className="text-2xl font-extrabold text-slate-900">App instalada correctamente</h1>
          <p className="text-slate-700">Para continuar, no sigas en este navegador.</p>
          <p className="text-slate-700">Cierra esta ventana y abre la app desde el icono "CD Bustarviejo" que acabas de instalar.</p>
          <div className="grid gap-3 text-left">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <span className="text-green-700 font-bold">1</span>
              <span className="text-green-800 text-sm">Cierra esta ventana del navegador</span>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <span className="text-blue-700 font-bold">2</span>
              <span className="text-blue-800 text-sm">Toca el icono "CD Bustarviejo" en tu pantalla de inicio</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Si no se cierra automáticamente, ciérrala manualmente.</p>
        </div>
      </div>
    </div>
  );
}

export function FirstLaunchInviteOverlay({ user, onDismiss, onNavigate }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="space-y-5">
          <div className="text-7xl mb-2">👋</div>
          <h2 className="text-3xl font-black text-slate-900">¡Bienvenido!</h2>
          <p className="text-lg text-slate-700">
            Para comenzar a usar la app, necesitas {user?.tipo_panel === 'familia' ? 'dar de alta a tus jugadores' : 'completar tu perfil de jugador'}.
          </p>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <p className="text-sm text-orange-900 font-bold">
              {user?.tipo_panel === 'familia' ? '👨‍👩‍👧 Registra a tus hijos ahora' : '⚽ Completa tu ficha de jugador'}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 py-6 text-base" onClick={onDismiss}>
              Ahora no
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-6 text-base font-bold"
              onClick={onNavigate}
            >
              {user?.tipo_panel === 'familia' ? 'Registrar jugadores' : 'Completar perfil'} →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpdateNotificationBar({ onUpdate }) {
  return (
    <div className="fixed top-[52px] lg:top-0 left-0 right-0 z-[150] bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-bold">¡Actualización disponible!</p>
            <p className="text-xs opacity-90">Una nueva versión de la app está lista para instalar</p>
          </div>
        </div>
        <Button
          onClick={onUpdate}
          className="bg-white text-green-600 hover:bg-gray-100 font-bold whitespace-nowrap"
          size="sm"
        >
          Actualizar ahora
        </Button>
      </div>
    </div>
  );
}

export function PaymentSuccessOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
        <div className="text-6xl mb-2">✅</div>
        <h2 className="text-2xl font-bold">Pago realizado con éxito</h2>
        <p className="text-slate-600 mt-1">Hemos registrado tu pago correctamente.</p>
      </div>
    </div>
  );
}

export function RateLimitBanner() {
  return (
    <div className="fixed top-[84px] lg:top-10 left-0 right-0 z-[150] bg-yellow-500 text-white px-4 py-2 text-center shadow">
      Se ha alcanzado el límite de peticiones. Reintentamos en unos segundos…
    </div>
  );
}