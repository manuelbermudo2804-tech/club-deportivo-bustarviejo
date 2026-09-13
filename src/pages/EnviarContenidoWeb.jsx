import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContenidoWebForm from "@/components/contenido/ContenidoWebForm";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function EnviarContenidoWeb() {
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabecera con los colores del club */}
      <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 px-4 pt-8 pb-14 text-center text-white">
        <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 rounded-full mx-auto shadow-lg border-4 border-white/80 object-cover" />
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold leading-tight">Manda tus fotos y vídeos</h1>
        <p className="mt-2 text-sm sm:text-base text-white/90 max-w-md mx-auto">
          Club Deportivo Bustarviejo · Si has grabado algo bueno en un partido o entrenamiento, mándalo y podrá salir en nuestras redes.
        </p>
      </div>

      <div className="px-4 -mt-8 pb-10">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xl">
          {enviado ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900">¡Recibido, gracias!</h2>
              <p className="text-slate-600 mt-2 text-sm">
                El club lo revisará. Si lo publicamos y nos has dejado tu email, te avisaremos.
              </p>
              <Button
                className="mt-6 h-12 w-full rounded-xl bg-green-700 hover:bg-green-800 font-bold"
                onClick={() => setEnviado(false)}
              >
                Enviar otra foto o vídeo
              </Button>
            </div>
          ) : (
            <ContenidoWebForm onDone={() => setEnviado(true)} />
          )}
        </div>

        <p className="max-w-xl mx-auto text-xs text-slate-500 text-center mt-6">
          Al enviar material autorizas al club a usarlo en sus canales. No envíes fotos de menores sin permiso de su familia.
        </p>
      </div>
    </div>
  );
}