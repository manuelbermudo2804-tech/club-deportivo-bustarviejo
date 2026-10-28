import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContenidoWebForm from "@/components/contenido/ContenidoWebForm";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/img/escudo.png";

export default function EnviarContenidoWeb() {
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="min-h-screen bg-[#fffaf4] text-[#222]">
      <header className="bg-white border-b-2 border-[#f57c00] shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="https://www.cdbustarviejo.com/" className="flex items-center gap-3 font-extrabold text-[#222] no-underline" aria-label="Volver a la web del C.D. Bustarviejo">
            <img src={CLUB_LOGO_URL} alt="" className="h-11 w-11 object-contain" />
            <span className="text-base sm:text-lg">C.D. Bustarviejo</span>
          </a>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold sm:gap-3">
            <a href="https://www.cdbustarviejo.com/" className="rounded-full px-3 py-2 text-[#222] hover:bg-orange-50">Inicio</a>
            <a href="https://base44.app/api/apps/6992c6be619d2da592897991/functions/publicData" className="rounded-full px-3 py-2 text-[#222] hover:bg-orange-50">⚽ Ver partidos</a>
            <a href="https://www.cdbustarviejo.com/equipos.html" className="rounded-full px-3 py-2 text-[#222] hover:bg-orange-50">Equipos</a>
          </nav>
        </div>
      </header>

      <div className="border-b-4 border-[#f57c00] bg-gradient-to-br from-[#171717] via-[#292929] to-[#3b260f] px-4 pb-14 pt-8 text-center text-white">
        <img src={CLUB_LOGO_URL} alt="Escudo del C.D. Bustarviejo" className="mx-auto h-20 w-20 object-contain drop-shadow-lg" />
        <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">Manda tus fotos y vídeos</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/90 sm:text-base">
          Club Deportivo Bustarviejo · Si has grabado algo bueno en un partido o entrenamiento, mándalo y podrá salir en nuestras redes.
        </p>
      </div>

      <main className="px-4 pb-10 pt-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-orange-200 bg-white p-5 shadow-xl sm:p-7">
          {enviado ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-[#f57c00]" />
              <h2 className="text-xl font-bold text-slate-900">¡Recibido, gracias!</h2>
              <p className="mt-2 text-sm text-slate-600">
                El club lo revisará. Si lo publicamos y nos has dejado tu email, te avisaremos.
              </p>
              <Button
                className="mt-6 h-12 w-full rounded-xl bg-[#f57c00] font-bold text-black hover:bg-[#ff982e]"
                onClick={() => setEnviado(false)}
              >
                Enviar otra foto o vídeo
              </Button>
            </div>
          ) : (
            <ContenidoWebForm variant="web" onDone={() => setEnviado(true)} />
          )}
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-slate-500">
          Al enviar material autorizas al club a usarlo en sus canales. No envíes fotos de menores sin permiso de su familia.
        </p>
      </main>

      <footer className="mt-8 bg-[#111] px-4 py-7 text-center text-sm text-slate-300">
        <p className="font-extrabold text-white">C.D. Bustarviejo</p>
        <p className="mt-1">Deporte y valores desde 1989 · Bustarviejo (Madrid)</p>
        <a href="https://www.cdbustarviejo.com/" className="mt-3 inline-block font-bold text-[#f57c00] hover:text-[#ff982e]">Volver a la web del club</a>
      </footer>
    </div>
  );
}