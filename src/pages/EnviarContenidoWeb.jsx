import React, { useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContenidoWebForm from "@/components/contenido/ContenidoWebForm";

export default function EnviarContenidoWeb() {
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-rose-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Manda tus fotos y vídeos al club</h1>
          <p className="text-slate-600 mt-2">
            CD Bustarviejo · Si has grabado algo bueno en un partido o entrenamiento, envíalo y podrá salir en nuestras redes y en la memoria de la temporada.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {enviado ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900">¡Recibido, gracias!</h2>
              <p className="text-slate-600 mt-2 text-sm">
                El club lo revisará. Si lo publicamos y nos has dejado tu email, te avisaremos.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setEnviado(false)}>
                Enviar otra foto o vídeo
              </Button>
            </div>
          ) : (
            <ContenidoWebForm onDone={() => setEnviado(true)} />
          )}
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          Al enviar material autorizas al club a usarlo en sus canales. No envíes fotos de menores sin permiso de su familia.
        </p>
      </div>
    </div>
  );
}