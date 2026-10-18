import React from "react";
import { Link } from "react-router-dom";
import { Trophy, ShieldCheck, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Eurocopa2028() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-sm font-semibold text-white/75 hover:text-white">← CD Bustarviejo</Link>
        <span className="rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-200">Nueva competición</span>
      </header>
      <section className="mx-auto flex min-h-[75vh] max-w-4xl flex-col items-center justify-center px-5 py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-400/15 ring-1 ring-orange-300/30">
          <Trophy className="h-10 w-10 text-orange-300" />
        </div>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-blue-200">CD Bustarviejo presenta</p>
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Porra Eurocopa 2028</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
          Una competición nueva e independiente. La información, los equipos, los pronósticos y la clasificación de la Eurocopa estarán separados de los datos del Mundial 2026.
        </p>
        <div className="mt-8 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Trophy className="mb-2 h-5 w-5 text-orange-300" /><p className="font-bold">Datos separados</p><p className="mt-1 text-sm text-white/65">Sin mezclar participantes ni resultados del Mundial.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><CalendarDays className="mb-2 h-5 w-5 text-orange-300" /><p className="font-bold">Euro 2028</p><p className="mt-1 text-sm text-white/65">Formato de 24 selecciones y seis grupos.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mb-2 h-5 w-5 text-orange-300" /><p className="font-bold">Pagos protegidos</p><p className="mt-1 text-sm text-white/65">Los registros históricos de pago no se eliminan.</p></div>
        </div>
        <div className="mt-8 rounded-2xl border border-orange-300/25 bg-orange-300/10 px-5 py-4 text-sm text-orange-100">
          Estamos preparando la competición. Las inscripciones aún no están abiertas.
        </div>
        <Button asChild className="mt-6 bg-white text-slate-900 hover:bg-slate-100">
          <Link to="/">Volver a la app del club</Link>
        </Button>
      </section>
      <footer className="pb-8 text-center text-xs text-white/40">© {new Date().getFullYear()} CD Bustarviejo · Porra Eurocopa 2028</footer>
    </main>
  );
}
