import { Button } from "@/components/ui/button";
import { Smartphone, Download } from "lucide-react";

export default function InstallInstructionsModal({ show, context, isIOS, isAndroid, onInstalled, onClose }) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
      onClick={() => { if (context !== 'onboarding') onClose(); }}
    >
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">📲 Instala la App del Club</h2>
          <p className="text-slate-600 mt-1 text-sm">¡Es muy sencillo! Solo 4 pasos y tardarás menos de 1 minuto</p>
        </div>

        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 mb-4">
          <p className="text-green-800 text-sm text-center font-medium">✨ <strong>Con la app instalada podrás:</strong></p>
          <ul className="text-green-700 text-xs mt-2 space-y-1 text-center">
            <li>✅ Recibir convocatorias de partidos al instante</li>
            <li>✅ Ver pagos, documentos y calendario</li>
            <li>✅ Comunicarte con los entrenadores</li>
            <li>✅ Acceso rápido desde tu pantalla de inicio</li>
          </ul>
        </div>

        {isIOS ? (
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-6 h-6" />
              <p className="font-bold text-slate-900">iPhone / iPad</p>
            </div>
            <div className="space-y-3">
              {[
                { n: 1, text: "Abre esta web en Safari", sub: "(No funciona en Chrome ni otros navegadores)", right: <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-10 h-10" /> },
                { n: 2, text: "Pulsa el botón Compartir", sub: "Está abajo en la barra de Safari", right: <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div> },
                { n: 3, text: 'Busca y pulsa "Añadir a pantalla de inicio"', sub: "Desliza hacia abajo para encontrarlo", right: <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center"><svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div> },
                { n: 4, text: 'Pulsa "Añadir" arriba a la derecha', right: <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-sm">Añadir</span></div> },
              ].map(s => (
                <div key={s.n} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">{s.n}</span>
                  <div className="flex-1"><p className="text-sm text-slate-700"><strong>{s.text}</strong></p>{s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}</div>
                  {s.right}
                </div>
              ))}
              <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">✓</span>
                <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club en tu móvil 🎉</p>
              </div>
            </div>
          </div>
        ) : isAndroid ? (
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-6 h-6" />
              <p className="font-bold text-slate-900">Android</p>
            </div>
            <div className="space-y-3">
              {[
                { n: 1, text: "Abre esta web en Chrome", sub: "(También funciona en otros navegadores)", right: <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" className="w-10 h-10" /> },
                { n: 2, text: "Pulsa el menú (3 puntos verticales)", sub: "Está arriba a la derecha", right: <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center"><svg className="w-7 h-7 text-slate-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></div> },
                { n: 3, text: 'Pulsa "Instalar aplicación"', sub: 'O "Añadir a pantalla de inicio"', right: <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><Download className="w-7 h-7 text-green-600" /></div> },
                { n: 4, text: 'Confirma pulsando "Instalar"', right: <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-sm">Instalar</span></div> },
              ].map(s => (
                <div key={s.n} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">{s.n}</span>
                  <div className="flex-1"><p className="text-sm text-slate-700"><strong>{s.text}</strong></p>{s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}</div>
                  {s.right}
                </div>
              ))}
              <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">✓</span>
                <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club en tu móvil 🎉</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="font-bold text-slate-900 mb-2">📱 iPhone / iPad</p>
              <p className="text-sm text-slate-700">Safari → Compartir (↑) → "Añadir a pantalla de inicio"</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4">
              <p className="font-bold text-slate-900 mb-2">📱 Android</p>
              <p className="text-sm text-slate-700">Chrome → Menú (⋮) → "Instalar app" o "Añadir a inicio"</p>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <p className="text-xs text-blue-800 text-center font-medium">
            💡 <strong>Puedes volver a ver estas instrucciones</strong> desde el menú lateral pulsando "📲 Ver cómo instalar"
          </p>
        </div>
        <div className="mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-xl">
          <p className="text-xs text-green-800 text-center font-medium">
            ✅ <strong>Una vez instalada:</strong> Tendrás acceso completo y recibirás notificaciones importantes
          </p>
        </div>

        <Button onClick={onInstalled} className="w-full mt-4 bg-green-600 hover:bg-green-700 py-4 text-lg font-bold">
          ✅ Ya la tengo instalada
        </Button>
        {context !== 'onboarding' && (
          <Button onClick={onClose} variant="outline" className="w-full mt-2 py-3">Cerrar</Button>
        )}
      </div>
    </div>
  );
}