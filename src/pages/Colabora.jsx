import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ColaboraNiveles from "../components/colabora/ColaboraNiveles";
import ColaboraForm from "../components/colabora/ColaboraForm";
import ConocerClubBanner from "../components/colabora/ConocerClubBanner";
import SponsorFooter from "../components/sponsors-public/SponsorFooter";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function Colabora() {
  const [nivelId, setNivelId] = useState("colaborador");
  const [otraCantidad, setOtraCantidad] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [paid, setPaid] = useState(false);

  // Al volver de Stripe (?pago=ok&sid=...) confirmamos el pago en el backend
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      setConfirming(true);
      base44.functions
        .invoke("collaborationConfirm", { session_id: sid })
        .then((res) => {
          if (res?.data?.ok) setPaid(true);
        })
        .catch(() => {})
        .finally(() => setConfirming(false));
    }
  }, []);

  if (confirming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto" />
          <p className="text-slate-600 mt-4 font-semibold">Confirmando tu pago...</p>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-green-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">¡Gracias por colaborar! 🧡💚</h1>
          <p className="text-slate-600 leading-relaxed">
            Hemos recibido tu pago correctamente. Nuestro equipo revisará tu logo y activará tu banner
            en la app y la web del club muy pronto. Te hemos enviado un email de confirmación.
          </p>
          <a href="https://www.cdbustarviejo.com" className="inline-block mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl transition-all">
            Volver a la web del club
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/40">
      <a
        href="https://www.cdbustarviejo.com"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white transition-all border border-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la web
      </a>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-green-600 text-white pt-20 pb-16 px-4 text-center">
        <img
          src={CLUB_LOGO}
          alt="Escudo CD Bustarviejo"
          className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-2xl ring-4 ring-white/40 bg-white"
        />
        <p className="text-white/80 text-sm font-bold tracking-widest uppercase mb-2">Club Deportivo Bustarviejo · Sierra Norte de Madrid</p>
        <h1 className="text-3xl lg:text-5xl font-black mb-3">Colabora con el CD Bustarviejo</h1>
        <p className="text-white/90 max-w-2xl mx-auto text-lg">
          Apoya al club, gana visibilidad real entre las familias del pueblo y la sierra.
          Elige tu colaboración y paga online en 1 minuto.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-5 text-white/90 text-sm font-semibold">
          <a href="https://www.cdbustarviejo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-2">🌐 cdbustarviejo.com</a>
          <a href="https://www.instagram.com/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-2">📸 Instagram</a>
          <a href="https://www.facebook.com/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-2">👍 Facebook</a>
          <a href="https://t.me/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-white underline underline-offset-2">✈️ Telegram</a>
        </div>
        <p className="text-white/70 text-xs mt-4 max-w-xl mx-auto">
          🔒 Pago seguro con tarjeta a través de Stripe. Entidad sin ánimo de lucro registrada.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 pb-20 space-y-6">
        <ConocerClubBanner />
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-4">1. Elige tu colaboración</h2>
          <ColaboraNiveles selected={nivelId} onSelect={setNivelId} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-4">2. Completa tus datos y paga</h2>
          <ColaboraForm
            nivelId={nivelId}
            otraCantidad={otraCantidad}
            onOtraCantidadChange={setOtraCantidad}
          />
        </div>
      </div>

      <SponsorFooter />
    </div>
  );
}