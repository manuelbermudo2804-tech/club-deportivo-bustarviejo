import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Share2, MessageCircle, CheckCircle2, HelpCircle } from "lucide-react";

const APP_URL = "https://app.cdbustarviejo.com";

const IPHONE_STEPS = [
  "Abre esta página en Safari (no en Chrome).",
  "Pulsa el botón Compartir ↗ que hay abajo en el centro.",
  "Baja en la lista y pulsa \"Añadir a pantalla de inicio\".",
  "Pulsa \"Añadir\" arriba a la derecha.",
  "Ya tienes el icono del club en tu móvil. Ábrela siempre desde ahí.",
];

const ANDROID_STEPS = [
  "Abre esta página en Chrome.",
  "Pulsa el menú ⋮ (tres puntos) arriba a la derecha.",
  "Pulsa \"Instalar aplicación\" o \"Añadir a pantalla de inicio\".",
  "Confirma pulsando \"Instalar\".",
  "Ya tienes el icono del club en tu móvil. Ábrela siempre desde ahí.",
];

function StepList({ title, emoji, steps, badgeColor }) {
  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{emoji}</span>
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
        </div>
        <div className="space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
              <span className={`${badgeColor} text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstalarApp() {
  const shareText = `📲 Instala la app del CD Bustarviejo en tu móvil en menos de 1 minuto.\n\nSigue estos pasos: ${window.location.origin}/InstalarApp`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 pb-10 text-center">
        <div className="max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">Instala la app en tu móvil</h1>
          <p className="text-orange-100 text-sm mt-1">Club Deportivo Bustarviejo</p>
          <p className="text-sm mt-3 bg-white/10 rounded-xl p-3">
            Tarda menos de 1 minuto y tendrás el icono del club en tu pantalla de inicio, con avisos de convocatorias, pagos y mensajes.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-5 pb-10 space-y-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">Dirección de la app</p>
            <p className="font-mono font-bold text-orange-600 text-base mt-1">{APP_URL}</p>
          </CardContent>
        </Card>

        <StepList title="iPhone / iPad" emoji="🍎" steps={IPHONE_STEPS} badgeColor="bg-blue-500" />
        <StepList title="Android" emoji="🤖" steps={ANDROID_STEPS} badgeColor="bg-green-600" />

        <Card className="border-none shadow-lg bg-green-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-900 text-sm">¿Aún no tienes acceso a la app?</p>
                <p className="text-sm text-green-800 mt-1">
                  Rellena el formulario de solicitud y el club te enviará tu código de acceso.
                </p>
                <a href="/SolicitarAcceso" className="inline-block mt-3">
                  <Button className="bg-green-600 hover:bg-green-700">Solicitar acceso</Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-600 space-y-1.5">
                <p><strong>No me aparece la opción de instalar:</strong> en iPhone tiene que ser Safari y en Android, Chrome.</p>
                <p><strong>Ya la tengo instalada:</strong> ábrela siempre desde el icono, no desde el navegador.</p>
                <p className="pt-2 border-t border-slate-100">¿Dudas? Escríbenos a <strong className="text-orange-600">cdbustarviejo@gmail.com</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Instala la app del CD Bustarviejo", text: shareText });
              } else {
                navigator.clipboard.writeText(shareText);
              }
            }}
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </Button>
          <Button
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank")}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}