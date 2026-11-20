import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

const REGISTRATION_URL = "https://www.cdbustarviejo.com/campus-verano-2027.html";

export default function CampusPreferente() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-8 text-white">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-50 hover:text-white"><ArrowLeft className="h-4 w-4"/> Volver a la app</Link>
          <p className="text-xs font-black uppercase tracking-[.2em] text-orange-100">C.D. Bustarviejo</p>
          <h1 className="mt-2 text-3xl font-black">Campus Deportivo 2027</h1>
          <p className="mt-2 text-orange-50">Inscripción preferente para las familias del club</p>
        </div>
        <div className="space-y-6 p-6 md:p-8">
          <div>
            <h2 className="text-xl font-black">Las familias socias tienen prioridad</h2>
            <p className="mt-2 leading-relaxed text-slate-600">Antes de abrir las inscripciones al público general, las familias socias del C.D. Bustarviejo disponen de un periodo de acceso preferente para reservar plaza en el Campus.</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-orange-600"/> ¿Cómo identificarte como socio?</div>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white">1</span><span>En el formulario de inscripción, marca la opción <strong>«Soy socio»</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white">2</span><span>Introduce el <strong>DNI y el correo electrónico del primer progenitor</strong>, que es la persona que figura como socio en la ficha familiar del club.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white">3</span><span>Continúa con la inscripción siguiendo las indicaciones del formulario.</span></li>
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold">¿Tienes algún problema?</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">Si el sistema no reconoce tus datos o tienes cualquier dificultad para identificarte como socio, ponte en contacto con el club y te ayudaremos.</p>
            <a href="mailto:info@cdbustarviejo.com" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-700"><Mail className="h-4 w-4"/> Contactar con el club</a>
          </div>
          <a href={REGISTRATION_URL} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-4 text-center font-black text-white shadow-lg transition hover:bg-orange-700">Ir a la página de inscripción <ArrowRight className="h-5 w-5"/></a>
          <p className="text-center text-xs text-slate-400">C.D. Bustarviejo · Campus Deportivo 2027</p>
        </div>
      </div>
    </main>
  );
}
