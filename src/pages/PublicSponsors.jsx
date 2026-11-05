import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";

import HeroSection from "../components/sponsors-public/HeroSection";
import ClubHistorySection from "../components/sponsors-public/ClubHistorySection";
import ImpactSection from "../components/sponsors-public/ImpactSection";
import SponsorPackages from "../components/sponsors-public/SponsorPackages";
import ContactCTA from "../components/sponsors-public/ContactCTA";
import SponsorFooter from "../components/sponsors-public/SponsorFooter";
import TournamentSponsorshipBanner from "../components/sponsors-public/TournamentSponsorshipBanner";
import ColaboraOnlineBanner from "../components/sponsors-public/ColaboraOnlineBanner";
import usePublicPageTracker from "../components/public/usePublicPageTracker";

export default function PublicSponsors() {
  usePublicPageTracker("PublicSponsors");
  const [torneosConfig, setTorneosConfig] = useState(null);
  const [patrocinadores, setPatrocinadores] = useState([]);

  useEffect(() => {
    base44.entities.Sponsor.list()
      .then((items) => setPatrocinadores((items || []).filter((item) => item.activo === true)))
      .catch((error) => console.warn("No se pudieron cargar los patrocinadores públicos:", error));
  }, []);

  useEffect(() => {
    base44.functions
      .invoke("getSponsorInterestCounts", {})
      .then((res) => {
        if (res?.data?.campana_torneos_activa) {
          setTorneosConfig({
            padelFecha: res.data.torneo_padel_fecha,
            futsalFecha: res.data.torneo_futsal_fecha,
            padelOcupado: res.data.torneo_padel_ocupado,
            futsalOcupado: res.data.torneo_futsal_ocupado,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <a
        href="https://www.cdbustarviejo.com"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all border border-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la web
      </a>
      <HeroSection />
      {torneosConfig && (
        <TournamentSponsorshipBanner
          padelFecha={torneosConfig.padelFecha}
          futsalFecha={torneosConfig.futsalFecha}
          padelOcupado={torneosConfig.padelOcupado}
          futsalOcupado={torneosConfig.futsalOcupado}
        />
      )}
      <ClubHistorySection />
      <ImpactSection />
      {patrocinadores.length > 0 && (
        <section className="bg-slate-50 py-14 px-5 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-orange-600 font-bold text-xs uppercase tracking-[0.2em]">Gracias por vuestro apoyo</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Empresas que apoyan al C.D. Bustarviejo</h2>
              <p className="text-slate-500 mt-2">Comercios y empresas que hacen posible que sigamos creciendo.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
              {patrocinadores.map((patrocinador) => {
                const contenido = (
                  <div className="h-full min-h-32 rounded-2xl border border-slate-200 bg-white p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                    {patrocinador.logo_url ? (
                      <img src={patrocinador.logo_url} alt={`Logo de ${patrocinador.nombre}`} className="w-full h-16 object-contain" loading="lazy" />
                    ) : (
                      <span className="text-lg font-bold text-slate-700 text-center">{patrocinador.nombre}</span>
                    )}
                    <span className="text-sm font-semibold text-slate-700 text-center">{patrocinador.nombre}</span>
                  </div>
                );
                return patrocinador.website_url ? (
                  <a key={patrocinador.id} href={patrocinador.website_url} target="_blank" rel="noopener noreferrer" className="block">
                    {contenido}
                  </a>
                ) : <div key={patrocinador.id}>{contenido}</div>;
              })}
            </div>
          </div>
        </section>
      )}
      <SponsorPackages />
      <ColaboraOnlineBanner />
      <ContactCTA />
      <SponsorFooter />
    </div>
  );
}